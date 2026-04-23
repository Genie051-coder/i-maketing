import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/shared/libs/prisma'

/**
 * @openapi
 * /user/brand-kit:
 *   get:
 *     summary: 브랜드 키트 조회
 *     tags: [My Page]
 *     security:
 *       - sessionCookie: []
 *     responses:
 *       200:
 *         description: 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BrandKit'
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

  const kit = await prisma.brandKit.findUnique({
    where: { userId: session.user.id },
  })
  return NextResponse.json(kit)
}

const STRING_FIELDS = [
  'logoUrl',
  'primaryColor',
  'secondaryColor',
  'fontFamily',
  'tone',
  'feeling',
] as const

/**
 * @openapi
 * /user/brand-kit:
 *   put:
 *     summary: 브랜드 키트 저장/갱신 (upsert)
 *     tags: [My Page]
 *     security:
 *       - sessionCookie: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               logoUrl:
 *                 type: string
 *               primaryColor:
 *                 type: string
 *                 example: '#6366f1'
 *               secondaryColor:
 *                 type: string
 *               fontFamily:
 *                 type: string
 *               tone:
 *                 type: string
 *                 enum: [casual, professional, witty, warm]
 *               feeling:
 *                 type: string
 *                 enum: [exciting, reassuring, trustworthy, inspiring]
 *     responses:
 *       200:
 *         description: 저장된 브랜드 키트
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BrandKit'
 *       401:
 *         description: 인증 필요
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const data: Record<string, string | null> = {}
  for (const field of STRING_FIELDS) {
    if (field in body) {
      const v = body[field]
      data[field] = typeof v === 'string' && v.trim() ? v.trim() : null
    }
  }

  const kit = await prisma.brandKit.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, ...data },
    update: data,
  })

  return NextResponse.json(kit)
}
