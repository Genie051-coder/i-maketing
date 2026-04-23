import { prisma } from '@/shared/libs/prisma'

/**
 * 발송확인 노드: 이전 노드들에서 누적된 데이터(수신자, 제목, HTML 등)를 모아
 * Gmail API로 실제 발송합니다.
 *
 * 필요한 lastOutput 필드:
 * - recipientEmail: 수신자 이메일 (address-book에서)
 * - subject: 이메일 제목 (send-settings에서)
 * - html: 이메일 본문 (email 노드에서)
 * - fromName / fromEmail: 발신자 정보 (email 노드에서)
 */

function parseLastOutput(lastOutput: unknown): Record<string, unknown> {
  if (lastOutput == null || typeof lastOutput !== 'object') return {}
  return lastOutput as Record<string, unknown>
}

async function refreshAccessToken(refreshToken: string): Promise<string> {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET 환경변수가 필요합니다.')
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!res.ok) throw new Error('토큰 갱신 실패. 재인증이 필요합니다.')
  const data = await res.json()
  return data.access_token as string
}

function createMimeMessage(opts: {
  to: string[]
  subject: string
  html?: string
  from?: string
}): string {
  const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).slice(2)}`
  const encodedSubject = `=?UTF-8?B?${Buffer.from(opts.subject).toString('base64')}?=`

  const headers = [
    ...(opts.from ? [`From: ${opts.from}`] : []),
    `To: ${opts.to.join(', ')}`,
    `Subject: ${encodedSubject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ]

  const lines = [
    ...headers,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(opts.html?.replace(/<[^>]+>/g, '') || '').toString('base64'),
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(opts.html || '').toString('base64'),
    '',
    `--${boundary}--`,
  ]

  return lines.join('\r\n')
}

function toBase64Url(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

export type ConfirmSendContext = { userId?: string }

export async function runConfirmSendNode(
  nodeData: Record<string, unknown>,
  lastOutput: unknown,
  context?: ConfirmSendContext
): Promise<{ ok: boolean; message: string }> {
  const data = parseLastOutput(lastOutput)

  const recipientEmail = String(data.recipientEmail ?? nodeData.recipientEmail ?? '').trim()
  if (!recipientEmail || !recipientEmail.includes('@')) {
    return {
      ok: false,
      message: '수신자 이메일이 없거나 유효하지 않습니다. 주소록 노드를 확인해주세요.',
    }
  }

  const subject = String(data.subject ?? nodeData.subject ?? '(제목 없음)').trim()
  const html = typeof data.html === 'string' ? data.html : undefined
  const fromName = String(data.fromName ?? 'Marketing')
  const fromEmail = String(data.fromEmail ?? 'noreply@local')
  const from = fromName ? `${fromName} <${fromEmail}>` : fromEmail

  const tokenWhere = context?.userId
    ? { provider: 'GMAIL' as const, userId: context.userId }
    : { provider: 'GMAIL' as const }
  const token = await prisma.externalToken.findFirst({
    where: tokenWhere,
    orderBy: { id: 'desc' },
  })

  if (!token) {
    return {
      ok: false,
      message: 'Gmail 토큰이 없습니다. 마이페이지에서 Gmail을 연동해주세요.',
    }
  }

  if (!token.refreshToken) {
    return {
      ok: false,
      message: 'Refresh Token이 없습니다. Gmail 재인증이 필요합니다.',
    }
  }

  let accessToken: string
  try {
    accessToken = await refreshAccessToken(token.refreshToken)
    await prisma.externalToken.update({
      where: { id: token.id },
      data: { accessToken, expiresAt: new Date(Date.now() + 3600 * 1000) },
    })
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : '토큰 갱신 실패',
    }
  }

  const mimeMessage = createMimeMessage({
    to: [recipientEmail],
    subject,
    html,
    from,
  })
  const encodedMessage = toBase64Url(mimeMessage)

  const res = await fetch('https://www.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: encodedMessage }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    return {
      ok: false,
      message:
        (err as { error?: { message?: string } }).error?.message ||
        `Gmail API 오류 (${res.status})`,
    }
  }

  return { ok: true, message: `${recipientEmail}에게 메일이 발송되었습니다.` }
}
