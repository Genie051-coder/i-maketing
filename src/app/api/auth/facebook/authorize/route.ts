import { NextResponse } from 'next/server'
import { auth } from '@/auth'

const SCOPES = ['pages_manage_posts', 'pages_read_engagement']

/**
 * @openapi
 * /auth/facebook/authorize:
 *   get:
 *     summary: Facebook OAuth 인증 시작 (Meta OAuth 페이지로 리다이렉트)
 *     tags: [Auth]
 *     responses:
 *       302:
 *         description: Facebook OAuth 페이지로 리다이렉트
 *       401:
 *         description: 로그인 필요
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: 환경변수 누락
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const appId = process.env.FB_APP_ID
  if (!appId) {
    return NextResponse.json(
      { error: 'FB_APP_ID 환경변수가 설정되지 않았습니다.' },
      { status: 500 }
    )
  }

  const baseUrl =
    process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  const redirectUri = `${baseUrl}/api/auth/facebook/callback`

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES.join(','),
    state: session.user.id,
  })

  return NextResponse.redirect(`https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`)
}
