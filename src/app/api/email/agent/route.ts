import { streamText, convertToModelMessages, tool, stepCountIs } from 'ai'
import type { UIMessage } from 'ai'
import { z } from 'zod'
import { auth } from '@/auth'
import { getModelForUser } from '@/shared/libs/ai/model'

const emailBlockSchema = z.union([
  z.object({
    id: z.string(),
    type: z.literal('Logo'),
    url: z.string().describe('로고 이미지 URL'),
    width: z.number().optional().describe('로고 너비 (px), 기본 120'),
    link: z.string().optional().describe('로고 클릭 시 이동할 URL'),
  }),
  z.object({
    id: z.string(),
    type: z.literal('Text'),
    content: z.string(),
    level: z.enum(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'body']),
  }),
  z.object({
    id: z.string(),
    type: z.literal('Button'),
    content: z.string(),
    url: z.string(),
  }),
  z.object({
    id: z.string(),
    type: z.literal('Image'),
    url: z.string(),
    alt: z.string(),
  }),
  z.object({
    id: z.string(),
    type: z.literal('List'),
    items: z.array(z.string()),
    style: z.enum(['bullet', 'numbered']),
  }),
  z.object({
    id: z.string(),
    type: z.literal('Hr'),
  }),
  z.object({
    id: z.string(),
    type: z.literal('TwoColumn'),
    leftContent: z.string().describe('왼쪽 컬럼 텍스트'),
    rightContent: z.string().describe('오른쪽 컬럼 텍스트'),
  }),
  z.object({
    id: z.string(),
    type: z.literal('SnsShare'),
    platforms: z
      .array(z.string())
      .describe('공유 플랫폼 목록 (twitter, facebook, instagram, linkedin, kakao)'),
  }),
  z.object({
    id: z.string(),
    type: z.literal('SnsLinks'),
    links: z
      .array(z.object({ platform: z.string(), url: z.string() }))
      .describe('소셜 계정 링크 목록'),
  }),
  z.object({
    id: z.string(),
    type: z.literal('VideoPreview'),
    videoUrl: z.string().describe('YouTube / Vimeo 등 동영상 URL'),
    thumbnailUrl: z.string().optional().describe('썸네일 이미지 URL'),
    title: z.string().optional().describe('동영상 제목'),
  }),
  z.object({
    id: z.string(),
    type: z.literal('Html'),
    code: z.string().describe('직접 삽입할 HTML 코드'),
  }),
  z.object({
    id: z.string(),
    type: z.literal('Footer'),
    companyName: z.string().optional().describe('회사명'),
    address: z.string().optional().describe('회사 주소'),
    unsubscribeUrl: z.string().optional().describe('수신거부 링크'),
  }),
  z.object({
    id: z.string(),
    type: z.literal('Spacer'),
    height: z.number().describe('여백 높이 (px)'),
  }),
])

const updateEmailConfigSchema = z.object({
  subject: z.string().describe('이메일 제목'),
  previewText: z.string().describe('미리보기 텍스트 (인박스에서 보이는 한 줄)'),
  fromName: z.string().optional().describe('발신자 이름'),
  fromEmail: z.string().optional().describe('발신 이메일 주소'),
  brandColor: z.string().optional().describe('브랜드 테마 컬러 (예: #0f172a)'),
  logoUrl: z.string().optional().describe('로고 이미지 URL'),
  content: z
    .array(emailBlockSchema)
    .describe('이메일 본문 블록 배열 (Text, Button, Image, List, Hr)'),
})

export type UpdateEmailConfigInput = z.infer<typeof updateEmailConfigSchema>

/**
 * @openapi
 * /email/agent:
 *   post:
 *     summary: 이메일 콘텐츠 생성 AI 에이전트 (스트리밍)
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
 *                 description: 대화 히스토리
 *               selectedModel:
 *                 type: string
 *                 example: "claude-sonnet-4-6"
 *               emailForm:
 *                 type: object
 *                 description: 현재 이메일 폼 상태 (subject, previewText, blocks 등)
 *               brandVoice:
 *                 type: object
 *                 properties:
 *                   tone:
 *                     type: string
 *                     example: "casual"
 *                   feeling:
 *                     type: string
 *                     example: "exciting"
 *               campaignType:
 *                 type: string
 *                 example: "promotion"
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
    return new Response(JSON.stringify({ type: 'error', errorText: '로그인이 필요합니다.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const body = (await req.json()) as {
    messages?: UIMessage[]
    emailForm?: {
      subject: string
      previewText: string
      fromName: string
      fromEmail: string
      brandColor?: string
      logoUrl?: string
      blocks: unknown[]
    }
    selectedModel?: string
    brandVoice?: { tone?: string | null; feeling?: string | null } | null
    brandKitLogoUrl?: string | null
    campaignType?: string | null
  }
  const {
    messages = [],
    emailForm,
    selectedModel,
    brandVoice,
    brandKitLogoUrl,
    campaignType,
  } = body

  if (!selectedModel?.trim()) {
    return new Response(
      JSON.stringify({
        type: 'error',
        errorText:
          '모델을 선택해주세요. 마이페이지에서 AI API 키를 등록한 뒤 채팅에서 플랫폼/모델을 선택하세요.',
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const model = await getModelForUser(session.user.id, selectedModel.trim())
  if (!model) {
    return new Response(
      JSON.stringify({
        type: 'error',
        errorText:
          '선택한 플랫폼의 API 키가 없거나 만료되었습니다. 마이페이지에서 해당 플랫폼 키를 등록·확인해주세요.',
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const current = emailForm ?? {
    subject: '',
    previewText: '',
    fromName: '',
    fromEmail: '',
    blocks: [],
  }

  const campaignHints: Record<string, string> = {
    promotion:
      '프로모션 이메일입니다. CTA(행동 유도) 중심으로 혜택을 강조하고, 제목은 임팩트 있게, 버튼 문구는 명확하게 작성하세요. 이미지·버튼 블록을 적극 활용하세요.',
    newsletter:
      '뉴스레터입니다. 정보 중심으로 읽기 편한 구조를 만들고, 구분선과 소제목으로 섹션을 나누세요. 푸터에 구독 취소 링크를 포함하세요.',
    onboarding:
      '온보딩 환영 이메일입니다. 따뜻하고 친근한 톤으로 서비스 핵심 가치를 간결하게 소개하고, 다음 단계를 명확하게 안내하세요. 환영 인사로 시작하세요.',
  }

  const toneGuide: Record<string, string> = {
    casual: '친근하고 편안한 말투로, 마치 친구에게 얘기하듯 자연스럽게 작성하세요.',
    professional: '정중하고 격식 있는 비즈니스 어조로 작성하세요.',
    witty: '재치 있고 유머러스한 문체로 독자의 흥미를 끌도록 작성하세요.',
    warm: '따뜻하고 공감하는 어조로 독자와 감성적으로 연결되도록 작성하세요.',
  }
  const feelingGuide: Record<string, string> = {
    exciting: '설레고 역동적인 느낌을 전달하세요.',
    reassuring: '안심시키고 신뢰를 주는 메시지를 전달하세요.',
    trustworthy: '신뢰감과 전문성을 강조하세요.',
    inspiring: '영감을 주고 동기를 부여하는 내용을 담으세요.',
  }
  const voiceInstructions = [
    brandVoice?.tone && toneGuide[brandVoice.tone]
      ? `[브랜드 톤] ${toneGuide[brandVoice.tone]}`
      : null,
    brandVoice?.feeling && feelingGuide[brandVoice.feeling]
      ? `[브랜드 감성] ${feelingGuide[brandVoice.feeling]}`
      : null,
  ]
    .filter(Boolean)
    .join('\n')

  const campaignInstruction =
    campaignType && campaignHints[campaignType]
      ? `\n[캠페인 목적] ${campaignHints[campaignType]}`
      : ''

  const systemPrompt = `당신은 이메일 생성을 돕는 AI 어시스턴트입니다.
사용자가 요청한 대로 이메일 제목(subject), 미리보기(previewText), 발신자(fromName, fromEmail), 브랜딩(brandColor, logoUrl), 본문 블록(content)을 수정하거나 제안하세요.
답변은 친절하게 하고, 변경이 필요할 때는 반드시 updateEmailConfig 도구를 호출해서 수정된 값을 전달하세요.
${campaignInstruction}${voiceInstructions ? `\n브랜드 보이스 지침 (반드시 준수):\n${voiceInstructions}` : ''}

사용 가능한 블록 타입:
- Text: 제목(h1~h6) 또는 본문(body) 텍스트
- Image: 이미지 (url, alt)
- Button: CTA 버튼 (content, url)
- Hr: 가로 구분선
- List: 글머리/번호 목록 (items, style: bullet|numbered)
- TwoColumn: 2단 레이아웃 (leftContent, rightContent)
- SnsShare: 소셜 공유 버튼 (platforms: twitter|facebook|instagram|linkedin|kakao)
- SnsLinks: 소셜 계정 링크 (links: [{platform, url}])
- VideoPreview: 동영상 미리보기 (videoUrl, thumbnailUrl?, title?)
- Html: 직접 HTML 삽입 (code)
- Footer: 푸터 (companyName?, address?, unsubscribeUrl?)
- Spacer: 여백 (height: px)

블록을 추가할 때는 반드시 고유한 id(nanoid 형식)를 포함하세요.
전체 초안 생성 요청 시에는 subject, previewText, content 블록 배열을 모두 채워서 응답하세요.
특정 블록만 추가/수정할 때는 기존 블록을 유지하고 새 블록을 추가하세요.

현재 이메일 설정:
- 제목: ${current.subject}
- 미리보기: ${current.previewText}
- 발신자: ${current.fromName} <${current.fromEmail}>
- 브랜드 컬러: ${(current as { brandColor?: string }).brandColor ?? '(미설정)'}
- 로고 URL: ${(current as { logoUrl?: string }).logoUrl ?? '(미설정)'}
- 본문 블록 수: ${Array.isArray(current.blocks) ? current.blocks.length : 0}
${Array.isArray(current.blocks) && current.blocks.length > 0 ? `- 현재 블록(요약): ${JSON.stringify(current.blocks).slice(0, 400)}` : ''}`

  const modelMessages = await convertToModelMessages(messages)
  const result = streamText({
    model,
    system: systemPrompt,
    messages: modelMessages,
    tools: {
      updateEmailConfig: tool({
        description:
          '이메일 생성 설정을 갱신합니다. 전체 초안 생성, 특정 블록 추가/수정, 제목·미리보기 변경 등 이메일 내용에 변경이 필요할 때 호출하세요. content에는 기존 블록을 포함한 전체 블록 배열을 전달하세요.',
        inputSchema: updateEmailConfigSchema,
        execute: async (params: UpdateEmailConfigInput) => {
          return {
            applied: true,
            subject: params.subject,
            previewText: params.previewText,
            content: params.content,
          }
        },
      }),
    },
    stopWhen: stepCountIs(3),
  })

  return result.toUIMessageStreamResponse()
}
