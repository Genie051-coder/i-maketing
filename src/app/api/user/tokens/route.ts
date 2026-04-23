import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { prisma } from '@/shared/libs/prisma'

const createTokenSchema = z.object({
  provider: z.enum(['GMAIL', 'FACEBOOK']),
  accessToken: z.string().min(1, 'Access token is required'),
  refreshToken: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
})

/**
 * @openapi
 * /user/tokens:
 *   get:
 *     summary: 외부 서비스 토큰 목록 조회
 *     tags: [My Page]
 *     security:
 *       - sessionCookie: []
 *     responses:
 *       200:
 *         description: 성공 (accessToken 제외)
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ExternalToken'
 *       401:
 *         description: 인증 필요
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

  const tokens = await prisma.externalToken.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      provider: true,
      expiresAt: true,
      metadata: true,
    } as { id: true; provider: true; expiresAt: true; metadata: true },
    orderBy: { id: 'desc' },
  })
  return NextResponse.json(tokens)
}

/**
 * @openapi
 * /user/tokens:
 *   post:
 *     summary: 외부 서비스 토큰 추가
 *     tags: [My Page]
 *     security:
 *       - sessionCookie: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [provider, accessToken]
 *             properties:
 *               provider:
 *                 type: string
 *                 enum: [GMAIL, FACEBOOK]
 *               accessToken:
 *                 type: string
 *               refreshToken:
 *                 type: string
 *                 description: Gmail은 필수
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: 추가된 토큰
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ExternalToken'
 *       400:
 *         description: 잘못된 요청
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: 인증 필요
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const parsed = createTokenSchema.safeParse(body)
  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors.accessToken?.[0] ?? parsed.error.message
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const { provider, accessToken, refreshToken, expiresAt } = parsed.data

  if (provider === 'GMAIL' && (!refreshToken || !refreshToken.trim())) {
    return NextResponse.json(
      {
        error:
          'Gmail은 Refresh Token이 필수입니다. OAuth 연동을 이용하거나 Refresh Token을 함께 입력해 주세요.',
      },
      { status: 400 }
    )
  }

  const token = await prisma.externalToken.create({
    data: {
      userId: session.user.id,
      provider,
      accessToken,
      refreshToken: refreshToken ?? null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
    select: { id: true, provider: true, expiresAt: true },
  })
  return NextResponse.json(token)
}

/**
 * @openapi
 * /user/tokens:
 *   delete:
 *     summary: 외부 서비스 토큰 삭제
 *     tags: [My Page]
 *     security:
 *       - sessionCookie: []
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 삭제 성공
 *       404:
 *         description: 없음
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: 인증 필요
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function DELETE(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'Token id required' }, { status: 400 })
  }

  const deleted = await prisma.externalToken.deleteMany({
    where: { id, userId: session.user.id },
  })
  if (deleted.count === 0) {
    return NextResponse.json({ error: 'Token not found' }, { status: 404 })
  }
  return NextResponse.json({ ok: true })
}
