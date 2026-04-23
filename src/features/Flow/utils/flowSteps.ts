import type { FlowNode, StepState } from '../types'
import type { NodeType } from '@/features/nodes/_registry'
import { nodeRegistry } from '@/features/nodes/_registry'

/** nextNodeId 체인을 따라 순서대로 노드 배열 반환 */
export function getOrderedSteps(nodes: FlowNode[]): FlowNode[] {
  if (nodes.length === 0) return []

  const byId = new Map(nodes.map((n) => [n.id, n]))
  const pointedTo = new Set<string>()
  for (const n of nodes) {
    if (n.nextNodeId) pointedTo.add(n.nextNodeId)
    for (const bid of n.branchIds ?? []) pointedTo.add(bid)
  }

  const head = nodes.find((n) => !pointedTo.has(n.id))
  if (!head) return nodes

  const chain: FlowNode[] = []
  let current: FlowNode | undefined = head
  const seen = new Set<string>()

  while (current && !seen.has(current.id)) {
    seen.add(current.id)
    chain.push(current)
    const nextId: string | undefined = current.nextNodeId ?? current.branchIds?.[0]
    current = nextId ? byId.get(nextId) : undefined
  }

  return chain
}

export function getStepLabel(node: FlowNode): string {
  return nodeRegistry[node.type as NodeType]?.meta?.label ?? node.type
}

function isNodeComplete(
  node: FlowNode,
  stepStates: Record<string, StepState> | undefined
): boolean {
  const explicit = stepStates?.[node.id]?.status
  if (explicit === 'done') return true
  if (explicit === 'blocked') return false

  // fallback: 기존 저장된 node.data 기반(이전 플로우/마이그레이션 전용)
  switch (node.type) {
    case 'news-source': {
      const d = node.data as { selectedTitle?: string; selections?: Record<string, unknown> }
      return !!d?.selectedTitle || (!!d?.selections && Object.keys(d.selections).length > 0)
    }
    case 'fb-url-input':
      return !!node.data?.articleUrl
    case 'fb-summary':
      return !!node.data?.summary
    case 'fb-preview':
      return node.data?.approved === true
    case 'fb-publish':
      return !!node.data?.postUrl
    default:
      return false
  }
}

export function isStepComplete(
  nodes: FlowNode[],
  stepStates: Record<string, StepState> | undefined,
  stepIndex: number
): boolean {
  const steps = getOrderedSteps(nodes)
  const node = steps[stepIndex]
  return node ? isNodeComplete(node, stepStates) : false
}

export function getStageNode(nodes: FlowNode[], stepIndex: number): FlowNode | undefined {
  const steps = getOrderedSteps(nodes)
  return steps[stepIndex]
}

export function canReachStep(
  nodes: FlowNode[],
  stepIndex: number,
  stepStates: Record<string, StepState> | undefined
): boolean {
  if (stepIndex <= 0) return true
  const steps = getOrderedSteps(nodes)
  for (let i = 0; i < stepIndex; i++) {
    if (!isNodeComplete(steps[i], stepStates)) return false
  }
  return true
}

/** 다음 스텝의 노드 ID. 비활성화 시 null */
export function getNextStepNodeId(
  nodes: FlowNode[],
  stepStates: Record<string, StepState> | undefined
): { nodeId: string | null; disabled: boolean } {
  const steps = getOrderedSteps(nodes)
  if (steps.length === 0) return { nodeId: null, disabled: true }

  const firstIncomplete = steps.findIndex((n) => !isNodeComplete(n, stepStates))
  if (firstIncomplete === -1) {
    const n = steps[0]
    return { nodeId: n?.id ?? null, disabled: !n }
  }
  if (firstIncomplete === 0) return { nodeId: null, disabled: true }
  const n = steps[firstIncomplete]
  return { nodeId: n?.id ?? null, disabled: !n }
}

/** 이전 스텝의 노드 ID. 1단계에서는 비활성화 (순환 없음) */
export function getPrevStepNodeId(
  nodes: FlowNode[],
  stepStates: Record<string, StepState> | undefined
): { nodeId: string | null; disabled: boolean } {
  const steps = getOrderedSteps(nodes)
  if (steps.length === 0) return { nodeId: null, disabled: true }

  const firstIncomplete = steps.findIndex((n) => !isNodeComplete(n, stepStates))
  const currentIdx = firstIncomplete === -1 ? steps.length - 1 : firstIncomplete
  if (currentIdx <= 0) return { nodeId: null, disabled: true }

  const n = steps[currentIdx - 1]
  return { nodeId: n?.id ?? null, disabled: !n }
}
