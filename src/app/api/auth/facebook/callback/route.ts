import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/shared/libs/prisma'

type FbPage = { id: string; name: string; access_token: string }

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const state = searchParams.get('state')

  const baseUrl =
    process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

  if (error) {
    return NextResponse.redirect(
      `${baseUrl}/ko/my-page?facebook=error&reason=${encodeURIComponent(error)}`
    )
  }

  const session = await auth()
  const userId = state || session?.user?.id

  if (!userId) {
    return NextResponse.redirect(`${baseUrl}/ko/my-page?facebook=error&reason=unauthorized`)
  }

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/ko/my-page?facebook=error&reason=missing_params`)
  }

  const appId = process.env.FB_APP_ID
  const appSecret = process.env.FB_APP_SECRET
  if (!appId || !appSecret) {
    return NextResponse.redirect(`${baseUrl}/ko/my-page?facebook=error&reason=server_config`)
  }

  const redirectUri = `${baseUrl}/api/auth/facebook/callback`

  // 1. 단기 토큰 교환
  const tokenRes = await fetch(
    `https://graph.facebook.com/v19.0/oauth/access_token?` +
      new URLSearchParams({
        client_id: appId,
        client_secret: appSecret,
        redirect_uri: redirectUri,
        code,
      }),
    { method: 'GET' }
  )

  if (!tokenRes.ok) {
    console.error('[Facebook OAuth] Token exchange failed:', await tokenRes.text().catch(() => ''))
    return NextResponse.redirect(`${baseUrl}/ko/my-page?facebook=error&reason=token_exchange`)
  }

  const tokenData = (await tokenRes.json()) as { access_token?: string }
  if (!tokenData.access_token) {
    return NextResponse.redirect(`${baseUrl}/ko/my-page?facebook=error&reason=no_access_token`)
  }

  // 2. 장기 유저 토큰으로 교환 (60일)
  const longRes = await fetch(
    `https://graph.facebook.com/v19.0/oauth/access_token?` +
      new URLSearchParams({
        grant_type: 'fb_exchange_token',
        client_id: appId,
        client_secret: appSecret,
        fb_exchange_token: tokenData.access_token,
      })
  )

  const longData = (await longRes.json()) as { access_token?: string; expires_in?: number }
  const longToken = longData.access_token ?? tokenData.access_token
  const expiresAt = longData.expires_in ? new Date(Date.now() + longData.expires_in * 1000) : null

  // 3. 유저가 관리하는 페이지 목록 조회
  const pagesRes = await fetch(
    `https://graph.facebook.com/v19.0/me/accounts?access_token=${longToken}`
  )

  if (!pagesRes.ok) {
    console.error('[Facebook OAuth] /me/accounts failed:', await pagesRes.text().catch(() => ''))
    return NextResponse.redirect(`${baseUrl}/ko/my-page?facebook=error&reason=fetch_pages`)
  }

  const pagesData = (await pagesRes.json()) as { data?: FbPage[] }
  const pages = pagesData.data ?? []

  if (pages.length === 0) {
    return NextResponse.redirect(`${baseUrl}/ko/my-page?facebook=error&reason=no_pages`)
  }

  // 4. 기존 FACEBOOK 토큰 삭제 후 페이지별 토큰 저장
  await prisma.externalToken.deleteMany({ where: { userId, provider: 'FACEBOOK' } })
  await prisma.externalToken.createMany({
    data: pages.map((page) => ({
      userId,
      provider: 'FACEBOOK',
      accessToken: page.access_token,
      expiresAt,
      metadata: { pageId: page.id, pageName: page.name },
    })),
  })

  return NextResponse.redirect(`${baseUrl}/ko/my-page?facebook=success`)
}
