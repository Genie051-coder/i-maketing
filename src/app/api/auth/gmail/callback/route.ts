import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/shared/libs/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  const baseUrl = (
    process.env.AUTH_URL ||
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    'http://localhost:3000'
  ).replace(/\/$/, '')

  if (error) {
    return NextResponse.redirect(
      `${baseUrl}/ko/my-page?gmail=error&reason=${encodeURIComponent(error)}`
    )
  }

  const session = await auth()
  const userId = session?.user?.id

  if (!userId) {
    return NextResponse.redirect(`${baseUrl}/ko/my-page?gmail=error&reason=unauthorized`)
  }

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/ko/my-page?gmail=error&reason=missing_params`)
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${baseUrl}/ko/my-page?gmail=error&reason=server_config`)
  }

  const redirectUri = `${baseUrl}/api/auth/gmail/callback`

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  if (!tokenRes.ok) {
    const err = await tokenRes.text().catch(() => 'unknown')
    console.error('[Gmail OAuth] Token exchange failed:', err)
    return NextResponse.redirect(`${baseUrl}/ko/my-page?gmail=error&reason=token_exchange`)
  }

  const tokenData = (await tokenRes.json()) as {
    access_token: string
    refresh_token?: string
    expires_in?: number
  }

  if (!tokenData.access_token) {
    return NextResponse.redirect(`${baseUrl}/ko/my-page?gmail=error&reason=no_access_token`)
  }

  if (!tokenData.refresh_token) {
    return NextResponse.redirect(`${baseUrl}/ko/my-page?gmail=error&reason=no_refresh_token`)
  }

  const expiresAt = tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : null

  await prisma.externalToken.create({
    data: {
      userId,
      provider: 'GMAIL',
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt,
    },
  })

  return NextResponse.redirect(`${baseUrl}/ko/my-page?gmail=success`)
}
