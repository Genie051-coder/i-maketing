import { streamText, convertToModelMessages, tool, stepCountIs } from 'ai'
import type { UIMessage } from 'ai'
import { z } from 'zod'
import { auth } from '@/auth'
import { getModelForUser } from '@/shared/libs/ai/model'

const updateGmailConfigSchema = z.object({
  externalTokenId: z
    .string()
    .optional()
    .describe('Gmail 연결용 토큰 ID (유저 설정에서 연결한 값, 추후 확장)'),
  senderAddress: z.string().optional().describe('발신 주소 (me 또는 이메일)'),
  senderName: z.string().optional().describe('발신자 표시 이름'),
  recipientType: z
    .enum(['single', 'list', 'database'])
    .optional()
    .describe('수신자 타입: single=직접입력, list=명단, database=DB조회'),
  recipientList: z
    .string()
    .optional()
    .describe('수신자 목록 (줄바꿈 구분, single일 때 이메일 주소들)'),
  sourceNodeId: z.string().optional().describe('데이터 소스 노드 ID (database 등)'),
  subject: z.string().optional().describe('이메일 제목'),
  htmlBody: z.string().optional().describe('메일 본문 HTML'),
  attachments: z.string().optional().describe('첨부 파일 설명 또는 경로'),
  sendMode: z
    .enum(['immediate', 'scheduled'])
    .optional()
    .describe('발송 시점: immediate=즉시, scheduled=예약'),
  scheduledTime: z
    .string()
    .optional()
    .describe('예약 발송 시각 (ISO 형식, sendMode=scheduled일 때)'),
  testSendEmail: z.string().optional().describe('테스트 발송용 수신 이메일 주소'),
})

export type UpdateGmailConfigInput = z.infer<typeof updateGmailConfigSchema>

/**
 * @openapi
 * /email/gmail-agent:
 *   post:
 *     summary: Gmail 발송 설정 AI 에이전트 (스트리밍)
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
 *               gmailForm:
 *                 type: object
 *                 description: 현재 Gmail 발송 설정 (senderAddress, recipientType, subject 등)
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
    gmailForm?: Record<string, unknown>
    selectedModel?: string
  }
  const { messages = [], gmailForm = {}, selectedModel } = body

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
  const current = gmailForm

  const systemPrompt = `당신은 Gmail 발송 설정을 돕는 AI 어시스턴트입니다.
사용자가 원하는 발송 방식을 말로 설명하면, 해당하는 설정 필드를 채워서 updateGmailConfig 도구를 호출하세요.

예시:
- "오늘 오후 3시에 보내줘" → sendMode: "scheduled", scheduledTime: 오늘 15:00
- "테스트로 내 메일 xxx@mail.com으로 한 통 보내줘" → testSendEmail: "xxx@mail.com", sendMode: "immediate"
- "지금 바로 보내줘" → sendMode: "immediate"
- "위에서 만든 이메일 제목 그대로" → subject는 이전 노드/현재 설정 참고

externalTokenId는 유저가 나중에 설정 페이지에서 연결할 수 있으므로, 사용자가 "내 Gmail 계정으로" 등으로만 말하면 기존 값 유지. 변경 요청이 있을 때만 넣어 주세요.

현재 발송 설정:
- 발신: ${String(current.senderName ?? '')} <${String(current.senderAddress ?? 'me')}>
- 수신 타입: ${String(current.recipientType ?? 'single')}, 수신 목록: ${String(current.recipientList ?? '').slice(0, 80) || '비어있음'}
- 제목: ${String(current.subject ?? '비어있음')}
- 발송: ${String(current.sendMode ?? 'immediate')}${current.sendMode === 'scheduled' ? `, 예약 시각 ${current.scheduledTime}` : ''}
- 테스트 수신: ${String(current.testSendEmail ?? '비어있음')}`

  const modelMessages = await convertToModelMessages(messages)
  const result = streamText({
    model,
    system: systemPrompt,
    messages: modelMessages,
    tools: {
      updateGmailConfig: tool({
        description:
          'Gmail 발송 설정을 갱신합니다. 사용자가 발송 시점/수신자/제목/테스트 발송 등을 요청했을 때 해당 필드만 넣어 호출하세요.',
        inputSchema: updateGmailConfigSchema,
        execute: async (params: UpdateGmailConfigInput) => {
          return { applied: true, ...params }
        },
      }),
    },
    stopWhen: stepCountIs(3),
  })

  return result.toUIMessageStreamResponse()
}
