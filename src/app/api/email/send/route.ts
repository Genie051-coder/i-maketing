import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { runFlow, type ExecutionNode, type FlowEvent } from '@/shared/libs/flow-engine'

function parseNodes(body: unknown): ExecutionNode[] {
  if (body == null || typeof body !== 'object') return []
  const b = body as Record<string, unknown>
  return Array.isArray(b.nodes) ? (b.nodes as ExecutionNode[]) : []
}

/**
 * @openapi
 * /email/send:
 *   post:
 *     summary: 플로우 노드를 실행하여 이메일 발송
 *     description: ConfirmSendConfig "지금 발송하기"에서 호출. nodes 배열을 받아 flow-engine을 실행하고 confirm-send 단계에서 Gmail로 실제 발송합니다.
 *     tags: [Email]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nodes]
 *             properties:
 *               nodes:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: 발송 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: 노드 없음 또는 발송 실패
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
  const userId = session?.user?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: 'body가 올바른 JSON이 아닙니다.' },
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  const nodes = parseNodes(body)
  if (!nodes.length) {
    return NextResponse.json(
      { error: '실행할 노드가 없습니다.' },
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  const result = await new Promise<{ ok: boolean; error?: string }>((resolve) => {
    runFlow(
      nodes,
      (event: FlowEvent) => {
        if (event.type === 'error') {
          resolve({ ok: false, error: event.error })
        }
        if (event.type === 'done') {
          resolve({ ok: true })
        }
      },
      { userId }
    ).catch((err) => {
      resolve({ ok: false, error: err instanceof Error ? err.message : String(err) })
    })
  })

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error ?? '발송 실패' },
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  return NextResponse.json({
    ok: true,
    message: '메일이 발송되었습니다.',
  })
}
