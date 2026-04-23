import { NextResponse } from 'next/server'
import { getMailTransport, isMailpitEnabled } from '@/shared/libs/mail/transport'

/**
 * @openapi
 * /email/send-dev:
 *   post:
 *     summary: 이메일 발송 - 로컬 개발용 (Mailpit)
 *     tags: [Gmail]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [to, subject]
 *             properties:
 *               externalTokenId:
 *                 type: string
 *                 description: 마이페이지에서 등록한 Gmail 토큰 ID
 *               to:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: email
 *               subject:
 *                 type: string
 *               htmlBody:
 *                 type: string
 *               textBody:
 *                 type: string
 *               senderName:
 *                 type: string
 *               senderAddress:
 *                 type: string
 *               scheduledTime:
 *                 type: string
 *                 format: date-time
 *                 description: 입력 시 예약 발송 등록
 *     responses:
 *       200:
 *         description: 발송 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: 잘못된 요청
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      externalTokenId?: string
      to: string[]
      subject: string
      htmlBody?: string
      textBody?: string
      senderName?: string
      senderAddress?: string
      scheduledTime?: string
    }

    const {
      externalTokenId,
      to,
      subject,
      htmlBody,
      textBody,
      senderName,
      senderAddress,
      scheduledTime,
    } = body

    if (!to?.length || to.every((e) => !String(e).trim())) {
      return NextResponse.json({ ok: false, error: '수신자(to)가 비어 있습니다.' }, { status: 400 })
    }

    const recipients = to.map((e) => String(e).trim()).filter(Boolean)
    if (recipients.length === 0) {
      return NextResponse.json(
        { ok: false, error: '유효한 수신자 이메일이 없습니다.' },
        { status: 400 }
      )
    }

    const isScheduled = Boolean(scheduledTime?.trim())

    // Mailpit 로컬 테스트 시에는 토큰 없이 발송 가능
    const useMailpit = isMailpitEnabled()
    if (!useMailpit && !externalTokenId?.trim()) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Gmail 토큰이 없습니다. 마이페이지에서 Gmail을 연동해 주세요. (로컬 테스트: USE_MAILPIT=true + Docker Mailpit)',
        },
        { status: 400 }
      )
    }

    // 예약 발송: 추후 큐/Worker 연동
    if (isScheduled) {
      return NextResponse.json({
        ok: true,
        scheduled: true,
        message: `예약 발송이 등록되었습니다. (${scheduledTime} 예정)`,
      })
    }

    // 즉시 발송: nodemailer (Mailpit 또는 추후 Gmail SMTP)
    const transport = getMailTransport()
    const from =
      senderName && senderAddress
        ? `${senderName} <${senderAddress}>`
        : senderAddress
          ? senderAddress
          : useMailpit
            ? 'Marketing Flow <noreply@mailpit.local>'
            : 'noreply@local'

    await transport.sendMail({
      from,
      to: recipients,
      subject: subject?.trim() || '(제목 없음)',
      text: textBody?.trim() || undefined,
      html: htmlBody?.trim() || undefined,
    })

    return NextResponse.json({
      ok: true,
      message: useMailpit
        ? '메일이 발송되었습니다. Mailpit에서 확인하세요. (http://localhost:8025)'
        : '메일이 발송되었습니다.',
    })
  } catch (e) {
    console.error('[gmail/send]', e)
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : '발송 처리 중 오류가 났습니다.',
      },
      { status: 500 }
    )
  }
}
