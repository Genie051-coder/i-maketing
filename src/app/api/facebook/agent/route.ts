import { streamText, convertToModelMessages, tool, stepCountIs } from 'ai'
import { z } from 'zod'
import { auth } from '@/auth'
import { getModelForUser } from '@/shared/libs/ai/model'

// ─── Request Body Schema ───────────────────────────────────
const requestBodySchema = z.object({
  messages: z.array(z.any()).default([]),
  selectedModel: z.string().min(1, '모델을 선택해주세요.'),
  articleTitle: z.string().default(''),
  articleContent: z.string().default(''),
  articleUrl: z.string().default(''),
  articleImage: z.string().default(''),
  companyName: z.string().default(''),
  hashtags: z.array(z.string()).default([]),
  tone: z.enum(['formal', 'casual', 'friendly']).default('formal'),
})

// ─── Tool Schema ───────────────────────────────────────────
const generateFacebookPostSchema = z.object({
  content: z
    .string()
    .max(300, '본문은 300자를 초과할 수 없습니다.')
    .describe(
      '페이스북 본문 텍스트. 훅(1~3줄) → 본문(짧은 호흡 + 이모지) → CTA(1문장) 구조. 각 블록은 빈 줄로 구분. 최대 300자.'
    ),
  hashtags: z
    .array(z.string())
    .min(3, '해시태그는 최소 3개 이상')
    .max(7, '해시태그는 최대 7개 이하')
    .describe('해시태그 배열. # 포함 (예: ["#이데아텍", "#AI", "#iPaaS"]). 반드시 3~7개.'),
  articleUrl: z.string().describe('기사 원문 링크 URL'),
  mediaIdea: z
    .string()
    .describe(
      '이 포스팅과 시너지를 낼 수 있는 이미지·영상 소재 아이디어. 1~2문장으로 구체적으로 제안.'
    ),
})

// ─── Helpers ───────────────────────────────────────────────
/** 문장 경계(. ! ?)에서 자르고 생략 마커 추가 */
function truncateAtSentence(text: string, limit: number): string {
  if (text.length <= limit) return text
  const truncated = text.slice(0, limit)
  const lastBoundary = Math.max(
    truncated.lastIndexOf('. '),
    truncated.lastIndexOf('! '),
    truncated.lastIndexOf('? '),
    truncated.lastIndexOf('.\n')
  )
  const cutAt = lastBoundary > limit * 0.5 ? lastBoundary + 1 : limit
  return truncated.slice(0, cutAt).trimEnd() + ' ... (이하 생략)'
}

export type GenerateFacebookPostInput = z.infer<typeof generateFacebookPostSchema>

/**
 * @openapi
 * /facebook/agent:
 *   post:
 *     summary: 페이스북 포스팅 생성 AI 에이전트 (스트리밍)
 *     tags: [Agent]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [selectedModel]
 *             properties:
 *               messages:
 *                 type: array
 *                 items:
 *                   type: object
 *               selectedModel:
 *                 type: string
 *                 example: "claude-sonnet-4-6"
 *               articleTitle:
 *                 type: string
 *               articleContent:
 *                 type: string
 *               articleUrl:
 *                 type: string
 *                 format: uri
 *               articleImage:
 *                 type: string
 *               companyName:
 *                 type: string
 *               hashtags:
 *                 type: array
 *                 items:
 *                   type: string
 *               tone:
 *                 type: string
 *                 enum: ["formal", "casual", "friendly"]
 *     responses:
 *       200:
 *         description: AI 응답 스트림 (text/event-stream)
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 *       401:
 *         description: 로그인 필요
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: '로그인이 필요합니다.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const parsed = requestBodySchema.safeParse(await req.json())
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: '잘못된 요청입니다.', details: parsed.error.issues }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const {
    messages,
    selectedModel,
    articleTitle,
    articleContent,
    articleUrl,
    articleImage,
    companyName,
    hashtags,
    tone,
  } = parsed.data

  const model = await getModelForUser(session.user.id, selectedModel)
  if (!model) {
    return new Response(JSON.stringify({ error: 'API 키가 없거나 만료되었습니다.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const toneGuide: Record<string, string> = {
    formal: '전문적이고 신뢰감 있는 경어체. 권위 있되 딱딱하지 않게.',
    casual: '친근하고 대화하듯 자연스러운 말투. 독자와 같은 눈높이로.',
    friendly: '따뜻하고 공감하는 말투. 이모지를 적극 활용해 감정을 표현.',
  }

  const fixedHashtags =
    hashtags.length > 0
      ? `⚠️ 필수 해시태그 (누락 시 오류): ${hashtags.join(' ')} — 이 해시태그들은 반드시 hashtags 배열에 포함되어야 합니다.`
      : ''

  const systemPrompt = `당신은 페이스북 바이럴 콘텐츠 전문 카피라이터입니다.
    뉴스 기사를 읽는 사람이 멈추고, 읽고, 행동하게 만드는 포스팅을 작성합니다.

    [말투]
    ${toneGuide[tone] ?? toneGuide.formal}

    ━━━━━━━━━━━━━━━━━━━━━━━━━━
    포스팅 구조 (반드시 이 순서로)
    ━━━━━━━━━━━━━━━━━━━━━━━━━━

    ① 훅 (1~3줄) — 스크롤을 멈추게 하라
      - 타겟의 페인포인트를 직접 찌르거나 강한 호기심을 유발
      - 질문형("지금 당신 회사는 준비됐나요?"), 충격형("90%의 기업이 이걸 모릅니다"),
        반전형("AI 도입이 오히려 독이 되는 이유") 중 기사 맥락에 맞는 방식 선택
      - 훅만 읽어도 클릭하고 싶어야 함

    ② 본문 (모바일 최적화)
      - 한 문장 = 한 줄 원칙. 줄바꿈으로 호흡 조절
      - 핵심 포인트 2~3개를 이모지 bullet(✅ 🔑 💡 등)로 구조화
      - 전문 용어는 괄호로 쉽게 풀어쓰기 (예: iPaaS(시스템 통합 플랫폼))
      - 독자가 얻는 인사이트나 이익이 명확해야 함

    ③ CTA (딱 한 문장)
      - "링크에서 확인하세요" 같은 약한 표현 금지
      - 클릭·댓글·공유 중 하나만 선택해 강하게 유도
      - 예: "지금 바로 전략 확인 👇", "당신의 생각은? 댓글로 알려주세요 💬"

    ④ 해시태그 (본문과 빈 줄로 구분, 3~7개)
    ${fixedHashtags ? `\n${fixedHashtags}` : ''}

    ━━━━━━━━━━━━━━━━━━━━━━━━━━
    금지 사항
    ━━━━━━━━━━━━━━━━━━━━━━━━━━
    - 전체 300자 초과 금지
    - "안녕하세요", "오늘은 ~에 대해" 같은 진부한 오프닝 금지
    - CTA를 2개 이상 넣지 말 것
    - 과도한 이모지 남발 금지 (본문당 최대 1~2개)

    [기사 정보]
    - 회사명: ${companyName || '(미설정)'}
    - 제목: ${articleTitle}
    - 본문: ${truncateAtSentence(articleContent, 1000)}
    - URL: ${articleUrl}
    ${articleImage ? `- 이미지: ${articleImage}` : ''}

    포스팅을 생성하거나 수정할 때:
    1. 먼저 한 문장으로 무엇을 할지 간단히 말하세요. (예: "기사 핵심을 바탕으로 포스팅을 작성합니다.")
    2. 그 다음 즉시 generateFacebookPost 도구를 호출하세요.
    사용자 수정 요청 시 기존 내용 기반으로 수정 후 도구를 다시 호출하세요.`

  const modelMessages = await convertToModelMessages(messages)

  const result = streamText({
    model,
    system: systemPrompt,
    messages: modelMessages,
    tools: {
      generateFacebookPost: tool({
        description:
          '페이스북 포스팅을 생성하거나 수정합니다. 본문(content), 해시태그(hashtags), 기사링크(articleUrl)를 반환합니다.',
        inputSchema: generateFacebookPostSchema,
        execute: async (params: GenerateFacebookPostInput) => ({
          applied: true,
          content: params.content,
          hashtags: params.hashtags,
          articleUrl: params.articleUrl,
          mediaIdea: params.mediaIdea,
        }),
      }),
    },
    stopWhen: stepCountIs(3),
  })

  return result.toUIMessageStreamResponse()
}
