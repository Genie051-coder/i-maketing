import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/libs/prisma'

type Params = { params: Promise<{ id: string }> }

/**
 * @openapi
 * /flow/{id}:
 *   get:
 *     summary: 플로우 단건 조회 (definition 포함)
 *     tags: [Flow]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FlowDetail'
 *       404:
 *         description: 없음
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const flow = await prisma.flow.findUnique({
      where: { id },
    })

    if (!flow) {
      return NextResponse.json({ error: '캠페인을 찾을 수 없습니다.' }, { status: 404 })
    }

    return NextResponse.json(flow)
  } catch (err) {
    console.error('[api/flow/[id] GET]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '조회 실패' },
      { status: 500 }
    )
  }
}

/**
 * @openapi
 * /flow/{id}:
 *   patch:
 *     summary: 플로우 수정
 *     tags: [Flow]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *               definition:
 *                 type: object
 *     responses:
 *       200:
 *         description: 수정된 플로우
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FlowDetail'
 *       400:
 *         description: 수정할 필드 없음
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: 없음
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const { title, isActive, definition } = body as {
      title?: string
      isActive?: boolean
      definition?: object
    }

    const updateData: {
      title?: string
      isActive?: boolean
      definition?: object
    } = {}
    if (typeof title === 'string' && title.trim()) updateData.title = title.trim()
    if (typeof isActive === 'boolean') updateData.isActive = isActive
    if (definition !== undefined && definition !== null && typeof definition === 'object')
      updateData.definition = definition

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        {
          error: '수정할 필드(title, isActive, definition 중 하나)가 없습니다.',
        },
        { status: 400 }
      )
    }

    const flow = await prisma.flow.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(flow)
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && err.code === 'P2025') {
      return NextResponse.json({ error: '캠페인을 찾을 수 없습니다.' }, { status: 404 })
    }
    console.error('[api/flow/[id] PATCH]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '수정 실패' },
      { status: 500 }
    )
  }
}

/**
 * @openapi
 * /flow/{id}:
 *   delete:
 *     summary: 플로우 삭제
 *     tags: [Flow]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 삭제 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *       404:
 *         description: 없음
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    await prisma.flow.delete({
      where: { id },
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && err.code === 'P2025') {
      return NextResponse.json({ error: '캠페인을 찾을 수 없습니다.' }, { status: 404 })
    }
    console.error('[api/flow/[id] DELETE]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '삭제 실패' },
      { status: 500 }
    )
  }
}
