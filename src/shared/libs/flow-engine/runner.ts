/**
 * 플로우 실행 엔진 (Flow Runner)
 *
 * 노드 배열을 받아 nextNodeId 체인 순서대로 순차 실행합니다.
 * 각 단계마다 FlowEvent를 send 콜백으로 내보냅니다.
 *
 * 실행 흐름:
 *   nodes[] → toOrderedChain() → executeNode() 루프 → FlowEvent emit
 */
import type { ExecutionNode, NodeRunResult } from './types'
import { runEmailCreateNode } from './nodes/email-create'
import { runPassthroughNode } from './nodes/passthrough'
import { runConfirmSendNode } from './nodes/confirm-send'

const RUNNABLE_TYPES = [
  'email',
  'campaign-purpose',
  'address-book',
  'send-settings',
  'confirm-send',
  'news-source',
  'fb-url-input',
  'fb-summary',
  'fb-preview',
  'fb-publish',
] as const
type RunnableType = (typeof RUNNABLE_TYPES)[number]

function isRunnable(type: string): type is RunnableType {
  return RUNNABLE_TYPES.includes(type as RunnableType)
}

export type FlowContext = { userId?: string }

async function executeNode(
  type: RunnableType,
  data: Record<string, unknown>,
  lastOutput: unknown,
  context?: FlowContext
): Promise<NodeRunResult> {
  switch (type) {
    case 'campaign-purpose':
    case 'address-book':
    case 'send-settings':
    case 'news-source':
    case 'fb-url-input':
    case 'fb-summary':
    case 'fb-preview':
    case 'fb-publish': {
      const output = await runPassthroughNode(data, lastOutput)
      return { ok: true, output }
    }
    case 'email': {
      const output = await runEmailCreateNode(data, lastOutput)
      return { ok: true, output }
    }
    case 'confirm-send': {
      const output = await runConfirmSendNode(data, lastOutput, context)
      if (!output.ok) return { ok: false, error: output.message }
      return { ok: true, output }
    }
  }
}

/** nextNodeId로 참조되지 않는 노드 = 체인 시작 노드 */
function findStartNode(nodes: ExecutionNode[]): ExecutionNode | null {
  if (nodes.length === 0) return null
  const referred = new Set(nodes.map((n) => n.nextNodeId).filter(Boolean))
  return nodes.find((n) => !referred.has(n.id)) ?? nodes[0] ?? null
}

/** 시작 노드부터 nextNodeId 체인을 따라 정렬된 배열 반환 */
function toOrderedChain(nodes: ExecutionNode[]): ExecutionNode[] {
  const start = findStartNode(nodes)
  if (!start) return []

  const map = new Map(nodes.map((n) => [n.id, n]))
  const ordered: ExecutionNode[] = []
  let current: ExecutionNode | undefined = start

  while (current) {
    ordered.push(current)
    current = current.nextNodeId ? map.get(current.nextNodeId) : undefined
  }
  return ordered
}

export type FlowEvent =
  | { type: 'node_start'; nodeId: string; nodeType: string }
  | { type: 'node_done'; nodeId: string; nodeType: string; output: unknown }
  | { type: 'node_skip'; nodeId: string; nodeType: string; reason: string }
  | { type: 'error'; nodeId: string; nodeType: string; error: string }
  | { type: 'done' }

/** 단일 노드 체인(startId부터 nextNodeId 따라)을 실행하는 내부 헬퍼 */
async function runChain(
  startId: string,
  nodeMap: Map<string, ExecutionNode>,
  initialOutput: unknown,
  send: (event: FlowEvent) => void,
  context?: FlowContext
): Promise<void> {
  let lastOutput = initialOutput
  let current: ExecutionNode | undefined = nodeMap.get(startId)

  while (current) {
    const nodeType = current.type
    const nodeData = (current.data ?? {}) as Record<string, unknown>

    if (!isRunnable(nodeType)) {
      send({
        type: 'node_skip',
        nodeId: current.id,
        nodeType,
        reason: `실행 불가 노드 타입: ${nodeType}`,
      })
      current = current.nextNodeId ? nodeMap.get(current.nextNodeId) : undefined
      continue
    }

    send({ type: 'node_start', nodeId: current.id, nodeType })

    try {
      const result = await executeNode(nodeType, nodeData, lastOutput, context)
      if (!result.ok) {
        send({
          type: 'error',
          nodeId: current.id,
          nodeType,
          error: result.error ?? '노드 실행 실패',
        })
        return
      }
      lastOutput = result.output
      send({ type: 'node_done', nodeId: current.id, nodeType, output: result.output })
    } catch (err) {
      send({
        type: 'error',
        nodeId: current.id,
        nodeType,
        error: err instanceof Error ? err.message : String(err),
      })
      return
    }

    current = current.nextNodeId ? nodeMap.get(current.nextNodeId) : undefined
  }
}

/**
 * 플로우 노드를 순차 실행하고 각 단계마다 send 콜백으로 이벤트를 전달합니다.
 * branchIds가 있는 노드는 각 브랜치를 독립적으로 병렬 실행합니다.
 * @param context - userId 등 실행 컨텍스트 (confirm-send에서 Gmail 토큰 조회 시 사용)
 */
export async function runFlow(
  nodes: ExecutionNode[],
  send: (event: FlowEvent) => void,
  context?: FlowContext
): Promise<void> {
  const chain = toOrderedChain(nodes)
  if (chain.length === 0) {
    send({ type: 'done' })
    return
  }

  const nodeMap = new Map(nodes.map((n) => [n.id, n]))
  let lastOutput: unknown = null

  for (const node of chain) {
    const nodeType = node.type
    const nodeData = (node.data ?? {}) as Record<string, unknown>

    if (!isRunnable(nodeType)) {
      send({
        type: 'node_skip',
        nodeId: node.id,
        nodeType,
        reason: `실행 불가 노드 타입: ${nodeType}`,
      })
      continue
    }

    send({ type: 'node_start', nodeId: node.id, nodeType })

    try {
      const result = await executeNode(nodeType, nodeData, lastOutput, context)

      if (!result.ok) {
        send({
          type: 'error',
          nodeId: node.id,
          nodeType,
          error: result.error ?? '노드 실행 실패',
        })
        return
      }

      lastOutput = result.output
      send({
        type: 'node_done',
        nodeId: node.id,
        nodeType,
        output: result.output,
      })
    } catch (err) {
      send({
        type: 'error',
        nodeId: node.id,
        nodeType,
        error: err instanceof Error ? err.message : String(err),
      })
      return
    }

    // 브랜치 분기: nextNodeId(메인) + branchIds 각각 병렬 실행
    if (node.branchIds && node.branchIds.length > 0) {
      const chainIds = [...(node.nextNodeId ? [node.nextNodeId] : []), ...node.branchIds]
      await Promise.all(
        chainIds.map((startId) => runChain(startId, nodeMap, lastOutput, send, context))
      )
      send({ type: 'done' })
      return
    }
  }

  send({ type: 'done' })
}
