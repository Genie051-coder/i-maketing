import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'

let cached: Transporter | null = null

/**
 * nodemailer Transporter 반환.
 * - 로컬: USE_MAILPIT 사용 시 Mailpit SMTP (localhost:1025) → Docker Mailpit에서 수신 확인 (http://localhost:8025)
 * - 추후: USE_MAILPIT=false + Gmail SMTP 설정 시 createTransport만 Gmail 설정으로 교체하면 됨
 */
export function getMailTransport(): Transporter {
  if (cached) return cached

  const useMailpit = process.env.USE_MAILPIT !== 'false'

  if (useMailpit) {
    const host = process.env.MAILPIT_HOST ?? 'localhost'
    const port = Number(process.env.MAILPIT_PORT) || 1025
    cached = nodemailer.createTransport({
      host,
      port,
      secure: false,
      ignoreTLS: true,
    })
    return cached
  }

  // 추후 Gmail SMTP 연동 시 예시:
  // cached = nodemailer.createTransport({
  //   service: 'gmail',
  //   auth: {
  //     user: process.env.GMAIL_USER,
  //     pass: process.env.GMAIL_APP_PASSWORD,
  //   },
  // })
  // 또는 host: 'smtp.gmail.com', port: 587, auth: { user, pass }
  throw new Error(
    'Gmail SMTP가 설정되지 않았습니다. .env에 GMAIL_USER, GMAIL_APP_PASSWORD를 넣거나, 로컬 테스트 시 USE_MAILPIT=true로 Mailpit을 사용하세요.'
  )
}

export function isMailpitEnabled(): boolean {
  return process.env.USE_MAILPIT !== 'false'
}
