import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/shared/libs/prisma'
import { auth } from '@/auth'
import { nanoid } from 'nanoid'
import { NODE_BODY_WIDTH, NODE_GAP } from '@/features/flow/constants'

/**
 * @openapi
 * /flow:
 *   get:
 *     summary: 플로우 목록 조회
 *     tags: [Flow]
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: 특정 유저의 플로우만 조회 (선택)
 *     responses:
 *       200:
 *         description: 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Flow'
 *       500:
 *         $ref: '#/components/schemas/Error'
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')

    const flows = await prisma.flow.findMany({
      where: userId ? { userId } : undefined,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        isActive: true,
        userId: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(flows)
  } catch (err) {
    console.error('[api/flow GET]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '목록 조회 실패' },
      { status: 500 }
    )
  }
}

/**
 * @openapi
 * /flow:
 *   post:
 *     summary: 플로우 생성
 *     tags: [Flow]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, type]
 *             properties:
 *               title:
 *                 type: string
 *                 example: 신제품 런칭 이메일 캠페인
 *               type:
 *                 type: string
 *                 enum: [email]
 *                 example: email
 *               userId:
 *                 type: string
 *                 description: 생략 시 첫 번째 유저 사용
 *     responses:
 *       200:
 *         description: 생성된 플로우
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FlowDetail'
 *       400:
 *         description: 잘못된 요청
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '로그인 필요' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const { title, type } = body as { title?: string; type?: string }

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'title(문자열)이 필요합니다.' }, { status: 400 })
    }

    if (!type || typeof type !== 'string') {
      return NextResponse.json({ error: 'type(문자열)이 필요합니다.' }, { status: 400 })
    }

    if (type !== 'email' && type !== 'facebook') {
      return NextResponse.json({ error: '지원하지 않는 캠페인 타입입니다.' }, { status: 400 })
    }

    const userId = session.user.id

    const nodeWidth = NODE_BODY_WIDTH
    const nodeGap = NODE_GAP
    const startX = 80
    const startY = 200

    let definition: { name: string; type: string; nodes: Record<string, unknown>[] }

    if (type === 'email') {
      const purposeId = nanoid()
      const emailId = nanoid()
      const addressId = nanoid()
      const sendSettingsId = nanoid()
      const confirmId = nanoid()

      definition = {
        name: title.trim(),
        type: 'email',
        nodes: [
          {
            id: purposeId,
            type: 'campaign-purpose',
            position: { x: startX, y: startY },
            nextNodeId: emailId,
            data: {},
          },
          {
            id: emailId,
            type: 'email',
            position: { x: startX + (nodeWidth + nodeGap), y: startY },
            nextNodeId: addressId,
            data: {
              fromName: '',
              fromEmail: '',
              subject: '',
              blocks: [],
            },
          },
          {
            id: addressId,
            type: 'address-book',
            position: { x: startX + (nodeWidth + nodeGap) * 2, y: startY },
            nextNodeId: sendSettingsId,
            data: {},
          },
          {
            id: sendSettingsId,
            type: 'send-settings',
            position: { x: startX + (nodeWidth + nodeGap) * 3, y: startY },
            nextNodeId: confirmId,
            data: {},
          },
          {
            id: confirmId,
            type: 'confirm-send',
            position: { x: startX + (nodeWidth + nodeGap) * 4, y: startY },
            data: {},
          },
        ],
      }
    } else if (type === 'facebook') {
      const newsId = nanoid()
      const urlInputId = nanoid()
      const summaryId = nanoid()
      const previewId = nanoid()
      const publishId = nanoid()

      definition = {
        name: title.trim(),
        type: 'facebook',
        nodes: [
          {
            id: newsId,
            type: 'news-source',
            position: { x: startX, y: startY },
            nextNodeId: urlInputId,
            data: {},
          },
          {
            id: urlInputId,
            type: 'fb-url-input',
            position: { x: startX + (nodeWidth + nodeGap), y: startY },
            nextNodeId: summaryId,
            data: {},
          },
          {
            id: summaryId,
            type: 'fb-summary',
            position: { x: startX + (nodeWidth + nodeGap) * 2, y: startY },
            nextNodeId: previewId,
            data: {},
          },
          {
            id: previewId,
            type: 'fb-preview',
            position: { x: startX + (nodeWidth + nodeGap) * 3, y: startY },
            nextNodeId: publishId,
            data: {},
          },
          {
            id: publishId,
            type: 'fb-publish',
            position: { x: startX + (nodeWidth + nodeGap) * 4, y: startY },
            data: {},
          },
        ],
      }
    } else {
      definition = { name: title.trim(), type, nodes: [] }
    }

    const flow = await prisma.flow.create({
      data: {
        title: title.trim(),
        userId,
        definition: definition as Prisma.InputJsonValue,
      } as Prisma.FlowUncheckedCreateInput,
    })

    return NextResponse.json(flow)
  } catch (err) {
    console.error('[api/flow POST]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '생성 실패' },
      { status: 500 }
    )
  }
}
