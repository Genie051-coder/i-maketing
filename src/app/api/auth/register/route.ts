import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/libs/prisma'
import { hash } from 'bcryptjs'
import { z } from 'zod'

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다'),
  name: z.string().max(100).optional(),
})

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: 이메일/비밀번호 회원가입
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: 가입 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *       400:
 *         description: 유효성 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: 이미 가입된 이메일
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const parsed = registerSchema.safeParse(body)
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다'
      return NextResponse.json({ error: message }, { status: 400 })
    }
    const { email, password, name } = parsed.data

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      if (existing.passwordHash) {
        return NextResponse.json(
          { error: '이미 가입된 이메일입니다. 로그인해 주세요.' },
          { status: 409 }
        )
      }
      return NextResponse.json(
        {
          error: '이 이메일은 소셜 로그인으로 가입되어 있습니다. 해당 방법으로 로그인해 주세요.',
        },
        { status: 409 }
      )
    }

    const passwordHash = await hash(password, 12)
    await prisma.user.create({
      data: {
        email,
        name: name ?? null,
        passwordHash,
      },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[api/auth/register]', err)
    return NextResponse.json({ error: '회원가입 처리 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
