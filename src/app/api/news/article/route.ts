import { NextRequest, NextResponse } from 'next/server'
import { parse as parseHtml, HTMLElement as NHPElement } from 'node-html-parser'

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')

  if (!url) {
    return NextResponse.json({ error: 'url parameter is required' }, { status: 400 })
  }

  try {
    const html = await fetchHtml(url)
    const article = parseArticle(html, url)
    return NextResponse.json({ url, ...article })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch article', details: String(error) },
      { status: 500 }
    )
  }
}

// ─── Fetch ───────────────────────────────────────────────────────────────────

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'ko-KR,ko;q=0.9',
      Referer: 'https://www.google.com/',
    },
    next: { revalidate: 0 },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  return res.text()
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface ArticleData {
  title: string
  description: string
  image: string | null
  images: string[]
  body: string
  publishedAt: string | null
}

// ─── Parse ───────────────────────────────────────────────────────────────────

function parseArticle(html: string, baseUrl: string): ArticleData {
  const root = parseHtml(html)

  const title = getMeta(root, 'og:title') || root.querySelector('title')?.text || ''
  const description = getMeta(root, 'og:description') || getMeta(root, 'description') || ''
  const ogImage = getMeta(root, 'og:image') || getMeta(root, 'twitter:image')
  const publishedAt =
    getMeta(root, 'article:published_time') || getJsonLd(root, 'datePublished') || null

  const resolvedOgImage = ogImage ? resolveUrl(ogImage, baseUrl) : null

  // 본문 영역 후보 선택
  const bodyEl = pickBodyElement(root)
  const images = extractImages(bodyEl, baseUrl, resolvedOgImage)

  // thumbnail/v150 등 작은 이미지 제외, 용량 큰 것 우선
  const image = pickBestImage(images, resolvedOgImage)

  return {
    title: cleanText(title),
    description: cleanText(description),
    image,
    images,
    body: extractBodyText(bodyEl),
    publishedAt,
  }
}

// ─── 본문 영역 선택 ──────────────────────────────────────────────────────────

/**
 * 우선순위대로 본문 컨테이너를 찾아 반환.
 * 아무것도 없으면 <body> 전체 사용.
 */
function pickBodyElement(root: NHPElement): NHPElement {
  const candidates = [
    // 클래스/id 기반 (국내 언론사 다수)
    '[class*="article-body"]',
    '[class*="article_body"]',
    '[class*="articleBody"]',
    '[class*="article-content"]',
    '[class*="article_content"]',
    '[class*="article-text"]',
    '[class*="edit-txt"]',
    '[id*="article-body"]',
    '[id*="articleBody"]',
    '[id*="article_body"]',
    '[id*="article-view-content"]', // itdaily 등
    '[id*="articleBodyContents"]', // 조선·중앙 계열
    '[id*="news_body_area"]', // 연합뉴스
    '[id*="newsEndContents"]', // SBS
    '[id*="content-body"]',
    '[class*="news-content"]',
    '[class*="news_content"]',
    '[class*="story-body"]',
    '[class*="post-content"]',
    '[class*="entry-content"]',
    // 시맨틱 태그
    'article',
    'main',
  ]

  for (const sel of candidates) {
    const el = root.querySelector(sel)
    if (el && el.text.trim().length > 100) return el
  }

  return root.querySelector('body') ?? root
}

// ─── 본문 텍스트 추출 ────────────────────────────────────────────────────────

function extractBodyText(el: NHPElement): string {
  // 광고·네비·스크립트 노이즈 제거
  const clone = parseHtml(el.outerHTML)
  for (const noise of clone.querySelectorAll(
    'script, style, iframe, nav, header, footer, aside, figure, figcaption, [class*="ad"], [class*="banner"], [class*="related"], [class*="recommend"]'
  )) {
    noise.remove()
  }

  const lines: string[] = []

  // p 태그 우선
  const paragraphs = clone.querySelectorAll('p')
  if (paragraphs.length > 0) {
    for (const p of paragraphs) {
      const t = cleanText(p.innerHTML)
      if (t.length > 15) lines.push(t)
    }
  }

  // p 태그가 거의 없으면 (국내 언론사 br 방식) innerText 방식으로 fallback
  if (lines.length < 3) {
    const raw = clone.innerHTML
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")

    return raw
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 15)
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  }

  return lines.join('\n\n').trim()
}

// ─── 최적 이미지 선택 (thumbnail/v150 제외, 고화질 우선) ───────────────────────

function pickBestImage(images: string[], ogImage: string | null): string | null {
  const all = [...images]
  if (!all.length && ogImage) return ogImage
  if (!all.length) return null

  const smallPattern = /thumbnail|v150|v300|v\d{2,3}|_thumb|_small|_sm\./i
  const fullSize = all.filter((url) => !smallPattern.test(url))
  if (fullSize.length > 0) return fullSize[0]
  return all[all.length - 1] ?? all[0]
}

// ─── 이미지 추출 (최대 5개) ──────────────────────────────────────────────────

function extractImages(el: NHPElement, baseUrl: string, ogImage: string | null): string[] {
  const seen = new Set<string>()
  const results: string[] = []

  const add = (src: string) => {
    const resolved = resolveUrl(src.trim(), baseUrl)
    if (!resolved || resolved.startsWith('data:') || seen.has(resolved)) return
    if (/\/(1x1|pixel|tracking|blank)\./i.test(resolved)) return
    if (/\.(gif)$/i.test(resolved)) return // 보통 gif는 아이콘·배너
    seen.add(resolved)
    results.push(resolved)
  }

  // og:image 먼저
  if (ogImage) add(ogImage)

  // 본문 img 태그
  for (const img of el.querySelectorAll('img')) {
    if (results.length >= 5) break
    const src =
      img.getAttribute('src') ||
      img.getAttribute('data-src') ||
      img.getAttribute('data-original') ||
      img.getAttribute('data-lazy-src') ||
      img.getAttribute('data-lazy') ||
      ''
    if (src) add(src)
  }

  return results.slice(0, 5)
}

// ─── node-html-parser 헬퍼 ───────────────────────────────────────────────────

function getMeta(root: NHPElement, name: string): string {
  const el =
    root.querySelector(`meta[property="${name}"]`) || root.querySelector(`meta[name="${name}"]`)
  return el?.getAttribute('content')?.trim() ?? ''
}

function getJsonLd(root: NHPElement, field: string): string {
  for (const s of root.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const json = JSON.parse(s.text) as Record<string, unknown>
      if (typeof json[field] === 'string') return json[field] as string
      const graph = json['@graph']
      if (Array.isArray(graph)) {
        for (const node of graph as Record<string, unknown>[]) {
          if (typeof node[field] === 'string') return node[field] as string
        }
      }
    } catch {
      /* skip */
    }
  }
  return ''
}

// ─── 문자열 유틸 ─────────────────────────────────────────────────────────────

function cleanText(str: string): string {
  return str
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function resolveUrl(url: string, base: string): string {
  try {
    return new URL(url, base).href
  } catch {
    return url
  }
}
