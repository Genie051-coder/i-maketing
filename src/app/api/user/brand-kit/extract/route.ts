import { NextRequest, NextResponse } from 'next/server'
import { generateObject } from 'ai'
import { z } from 'zod'
import { anthropic } from '@ai-sdk/anthropic'

// ─── 1. 응답 스키마 ────────────────────────────────────────────
const BrandExtractSchema = z.object({
  brandName: z.string().nullable(),
  primaryColor: z.string().nullable(), // hex
  secondaryColor: z.string().nullable(), // hex
  logoUrl: z.string().nullable(),
  fontFamily: z.string().nullable(),
  tone: z.enum(['casual', 'professional', 'witty', 'warm']).nullable(),
  feeling: z.enum(['exciting', 'reassuring', 'trustworthy', 'inspiring']).nullable(),
  senderName: z.string().nullable(),
  confidence: z.number().min(0).max(1), // 추출 신뢰도
})

export type BrandExtractResult = z.infer<typeof BrandExtractSchema>

// ─── 2. HTML 크롤링 ────────────────────────────────────────────
async function crawlWebsite(url: string) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; BrandKitBot/1.0)',
    },
    signal: AbortSignal.timeout(8000), // 8초 타임아웃
  })

  if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`)

  const html = await res.text()

  // meta 태그 파싱 (빠른 추출)
  const metaMap = parseMetaTags(html, url)

  // LLM에 넘길 HTML은 head + body 앞 2000자만 (토큰 절약)
  const trimmedHtml = extractRelevantHtml(html)

  return { metaMap, trimmedHtml }
}

function parseMetaTags(html: string, baseUrl: string) {
  const get = (pattern: RegExp) => html.match(pattern)?.[1] ?? null

  const faviconPath =
    get(/rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/i) ??
    get(/href=["']([^"']+)["'][^>]*rel=["'](?:shortcut )?icon["']/i) ??
    '/favicon.ico'

  const logoUrl =
    get(/rel=["']apple-touch-icon["'][^>]*href=["']([^"']+)["']/i) ??
    toAbsolute(faviconPath, baseUrl)

  return {
    title: get(/<title[^>]*>([^<]+)<\/title>/i),
    ogTitle: get(/property=["']og:title["'][^>]*content=["']([^"']+)["']/i),
    ogImage: get(/property=["']og:image["'][^>]*content=["']([^"']+)["']/i),
    description: get(/name=["']description["'][^>]*content=["']([^"']+)["']/i),
    themeColor: get(/name=["']theme-color["'][^>]*content=["']([^"']+)["']/i),
    logoUrl,
  }
}

function extractRelevantHtml(html: string): string {
  // <head> 전체 + <body> 앞부분만 추출
  const head = html.match(/<head[\s\S]*?<\/head>/i)?.[0] ?? ''
  const bodyStart = html.match(/<body[^>]*>([\s\S]{0,2000})/i)?.[1] ?? ''
  return (head + bodyStart)
    .replace(/<script[\s\S]*?<\/script>/gi, '') // script 제거
    .replace(/<style[\s\S]*?<\/style>/gi, '') // style 제거
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 3000) // 최대 3000자
}

function toAbsolute(path: string, base: string): string {
  if (path.startsWith('http')) return path
  const origin = new URL(base).origin
  return path.startsWith('/') ? `${origin}${path}` : `${origin}/${path}`
}

// ─── 3. LLM 분석 ───────────────────────────────────────────────
async function analyzeBrandWithAI(
  meta: ReturnType<typeof parseMetaTags>,
  html: string,
  url: string
): Promise<BrandExtractResult> {
  const { object } = await generateObject({
    model: anthropic('claude-3-haiku-20240307'), // 빠르고 저렴한 앤트로픽 모델 사용
    system: process.env.ANTHROPIC_API_KEY,
    schema: BrandExtractSchema,
    prompt: `
    아래는 웹사이트(${url})의 HTML 정보입니다.
    이 정보를 바탕으로 브랜드 키트를 추출해주세요.

    [메타 정보]
    - 제목: ${meta.title ?? meta.ogTitle}
    - 설명: ${meta.description}
    - 테마 컬러: ${meta.themeColor}
    - OG 이미지: ${meta.ogImage}

    [HTML 일부]
    ${html}

    규칙:
    - primaryColor: 가장 대표적인 브랜드 컬러 (hex, 없으면 null)
    - secondaryColor: 배경이나 보조 컬러 (hex, 없으면 null)
    - logoUrl: 로고 이미지 URL (${meta.logoUrl} 또는 HTML에서 추출)
    - tone: 웹사이트 텍스트 분위기 기반으로 casual/professional/witty/warm 중 하나
    - feeling: 브랜드가 주는 느낌 exciting/reassuring/trustworthy/inspiring 중 하나
    - confidence: 추출 데이터의 신뢰도 (0~1)
        `.trim(),
  })

  return object
}

/**
 * @openapi
 * /user/brand-kit/extract:
 *   post:
 *     summary: 웹사이트 URL에서 브랜드 정보 자동 추출 (AI)
 *     tags: [My Page]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [url]
 *             properties:
 *               url:
 *                 type: string
 *                 format: uri
 *                 example: https://example.com
 *     responses:
 *       200:
 *         description: 추출 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     brandName:
 *                       type: string
 *                       nullable: true
 *                     primaryColor:
 *                       type: string
 *                       nullable: true
 *                     secondaryColor:
 *                       type: string
 *                       nullable: true
 *                     logoUrl:
 *                       type: string
 *                       nullable: true
 *                     tone:
 *                       type: string
 *                       nullable: true
 *                     feeling:
 *                       type: string
 *                       nullable: true
 *                     confidence:
 *                       type: number
 *       400:
 *         description: 잘못된 URL
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       422:
 *         description: 웹사이트 접근 불가
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// ─── 4. Route Handler ──────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()

    if (!url || !URL.canParse(url)) {
      return NextResponse.json({ error: '유효한 URL을 입력해주세요.' }, { status: 400 })
    }

    // Step 1: 크롤링
    const { metaMap, trimmedHtml } = await crawlWebsite(url)

    // Step 2: LLM 분석
    const result = await analyzeBrandWithAI(metaMap, trimmedHtml, url)

    // theme-color가 있으면 AI 결과보다 신뢰도 높으므로 덮어쓰기
    if (metaMap.themeColor && !result.primaryColor) {
      result.primaryColor = metaMap.themeColor
    }
    if (metaMap.logoUrl && !result.logoUrl) {
      result.logoUrl = metaMap.logoUrl
    }

    return NextResponse.json({ success: true, data: result })
  } catch (err) {
    console.error('[brand-kit/extract]', err)

    if (err instanceof TypeError && err.message.includes('fetch')) {
      return NextResponse.json(
        { error: '웹사이트에 접근할 수 없어요. URL을 확인해주세요.' },
        { status: 422 }
      )
    }

    return NextResponse.json({ error: '추출 중 오류가 발생했어요.' }, { status: 500 })
  }
}
