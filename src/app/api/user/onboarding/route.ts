import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/shared/libs/prisma'

/**
 * @openapi
 * /user/onboarding:
 *   get:
 *     summary: 온보딩 완료 여부 조회
 *     tags: [My Page]
 *     security:
 *       - sessionCookie: []
 *     responses:
 *       200:
 *         description: 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isOnboarded:
 *                   type: boolean
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

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isOnboarded: true },
  })
  return NextResponse.json({ isOnboarded: user?.isOnboarded ?? false })
}

/**
 * @openapi
 * /user/onboarding:
 *   put:
 *     summary: 온보딩 완료 처리
 *     tags: [My Page]
 *     security:
 *       - sessionCookie: []
 *     responses:
 *       200:
 *         description: 성공
 *       401:
 *         description: 인증 필요
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function PUT() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { isOnboarded: true },
  })
  return NextResponse.json({ ok: true })
}
