import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/shared/libs/prisma'

const ALLOWED_PROVIDERS = ['ANTHROPIC', 'OPENAI', 'GEMINI'] as const
type Provider = (typeof ALLOWED_PROVIDERS)[number]

function isProvider(s: string): s is Provider {
  return ALLOWED_PROVIDERS.includes(s as Provider)
}

/**
 * @openapi
 * /user/ai-keys:
 *   get:
 *     summary: AI API 키 목록 조회
 *     tags: [My Page]
 *     security:
 *       - sessionCookie: []
 *     responses:
 *       200:
 *         description: 성공 (키 값은 반환하지 않음)
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ApiKey'
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

  const keys = await prisma.userApiKey.findMany({
    where: { userId: session.user.id },
    select: { id: true, provider: true, label: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(keys)
}

/**
 * @openapi
 * /user/ai-keys:
 *   post:
 *     summary: AI API 키 등록/갱신 (provider당 1개)
 *     tags: [My Page]
 *     security:
 *       - sessionCookie: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [provider, value]
 *             properties:
 *               provider:
 *                 type: string
 *                 enum: [ANTHROPIC, OPENAI, GEMINI]
 *               value:
 *                 type: string
 *                 example: sk-ant-...
 *               label:
 *                 type: string
 *                 example: 회사 키
 *     responses:
 *       200:
 *         description: 등록 성공
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
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { provider?: string; value?: string; label?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { provider, value, label } = body
  if (!provider || !isProvider(provider)) {
    return NextResponse.json(
      {
        error: `provider는 ${ALLOWED_PROVIDERS.join(', ')} 중 하나여야 합니다.`,
      },
      { status: 400 }
    )
  }
  if (!value || typeof value !== 'string' || !value.trim()) {
    return NextResponse.json({ error: 'value(API 키)가 필요합니다.' }, { status: 400 })
  }

  await prisma.userApiKey.upsert({
    where: {
      userId_provider: { userId: session.user.id, provider },
    },
    create: {
      userId: session.user.id,
      provider,
      encryptedValue: value.trim(),
      label: typeof label === 'string' ? label.trim() || null : null,
    },
    update: {
      encryptedValue: value.trim(),
      label: typeof label === 'string' ? label.trim() || null : null,
    },
  })

  return NextResponse.json({ ok: true })
}

/**
 * @openapi
 * /user/ai-keys:
 *   delete:
 *     summary: AI API 키 삭제
 *     tags: [My Page]
 *     security:
 *       - sessionCookie: []
 *     parameters:
 *       - in: query
 *         name: provider
 *         required: true
 *         schema:
 *           type: string
 *           enum: [ANTHROPIC, OPENAI, GEMINI]
 *     responses:
 *       200:
 *         description: 삭제 성공
 *       401:
 *         description: 인증 필요
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const provider = searchParams.get('provider')
  if (!provider || !isProvider(provider)) {
    return NextResponse.json(
      {
        error: `provider는 ${ALLOWED_PROVIDERS.join(', ')} 중 하나여야 합니다.`,
      },
      { status: 400 }
    )
  }

  await prisma.userApiKey.deleteMany({
    where: { userId: session.user.id, provider },
  })
  return NextResponse.json({ ok: true })
}
