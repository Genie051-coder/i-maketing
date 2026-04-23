import { create } from 'zustand'
import { nanoid } from 'nanoid'
import { type FlowNode, type FlowDefinition, nodesFromDefinition, type StepState } from '../types'
import { NODE_BODY_WIDTH, NODE_GAP } from '../constants'

/**
 * FlowStore (zustand)
 *
 * 이 store는 “플로우 편집기 UI 상태”를 관리합니다.
 * - **영구 저장되는 상태**: `FlowDefinition`(nodes + ui.stepStates/currentStepNodeId)
 * - **휘발성 상태**: 모달 오픈 상태, 드래그 중 pan/zoom, (레거시) nodeStatuses 등
 *
 * 핵심 목표는 “스텝 바이 스텝(stepStates)” 진행을 **DB definition(JSON)** 에 함께 저장해
 * 새로고침/재접속에서도 동일한 진행/편집 상태를 복원하는 것입니다.
 */

export type NodeExecutionStatus = 'idle' | 'running' | 'success' | 'failed'

export interface NodeExecution {
  status: NodeExecutionStatus
  message?: string
}

interface FlowStore {
  /** DB에 존재하는 플로우 id. null이면 아직 저장되지 않은 신규 플로우(= autosave skip). */
  flowId: string | null
  /** 플로우 이름 */
  flowName: string | null
  /** 노드 그래프(위치/연결/데이터). definition의 핵심. */
  nodes: FlowNode[]
  /** 설정 모달로 편집 중인 노드 id */
  editingNodeId: string | undefined
  /**
   * 레거시 실행 상태.
   * 지금 단계 기반(stepStates)으로 전환 중이지만, 일부 노드에서 성공/실패 토스트 등에 아직 사용.
   */
  nodeStatuses: Record<string, NodeExecution>
  /** 사용자가 현재 보고 있는(패닝 타깃) 스텝. 이전/다음 네비게이션의 기준. */
  currentStepNodeId: string | null
  /** 스텝 진행 상태(편집/완료/차단). autosave/확정 액션에서 업데이트되고 DB에 저장됨. */
  stepStates: Record<string, StepState>
  isRunning: boolean
  /** 스무스 패닝 대상 (설정 후 FlowCanvas가 애니메이션 후 클리어) */
  panTargetNodeId: string | null

  /**
   * DB에서 로드한 definition으로 store를 초기화.
   * - nodes는 그대로 복원
   * - ui(stepStates/currentStepNodeId)도 같이 복원
   * - nodeStatuses는 “세션 단위”라 초기화
   */
  initFromDefinition: (flowId: string | null, definition: FlowDefinition | null) => void
  /**
   * 노드 드래그 이동.
   * - 드래그 중 매 프레임 persist하면 과도하므로 저장하지 않음.
   * - 드래그 종료 후 다른 액션에서 자연스럽게 저장되도록 설계.
   */
  moveNode: (id: string, delta: { x: number; y: number }) => void
  /** 노드 삭제 + next/branch 연결 정리 */
  removeNode: (id: string) => void
  /** news-source 등 분기 소스 노드에서 fb-summary+fb-publish 브랜치 쌍을 추가 */
  addBranch: (sourceNodeId: string) => void
  /** 설정 모달 열기 */
  openConfig: (nodeId: string) => void
  /** 설정 모달 닫기 */
  closeConfig: () => void
  /**
   * 노드의 data만 병합 저장하는 “autosave” 진입점.
   * 저장 시 해당 노드는 기본적으로 `editing`으로 표시(사용자가 값 변경 중임을 반영).
   */
  saveNodeConfig: (nodeId: string, data: Record<string, unknown>) => Promise<boolean>
  /** 노드의 스텝 상태를 명시적으로 설정(예: 승인/확정 버튼에서 done) */
  setStepState: (nodeId: string, status: StepState['status']) => void
  /** 현재 스텝(네비게이션 기준)을 설정 */
  setCurrentStep: (nodeId: string | null) => void
  /** (레거시) 노드 실행 상태 업데이트 */
  setNodeStatus: (nodeId: string, status: NodeExecution) => void
  /** (레거시) 실행 상태 초기화 */
  resetStatuses: () => void
  setIsRunning: (value: boolean) => void
  /** store의 현재 상태를 DB 저장 형태(definition)로 직렬화 */
  buildDefinition: () => FlowDefinition
  getNode: (nodeId: string) => FlowNode | undefined
  /** 스무스 패닝 요청 (FlowCanvas가 구독) */
  requestPanToNode: (nodeId: string) => void
  clearPanTarget: () => void
}

/**
 * 현재 definition(JSON)을 DB에 저장합니다.
 *
 * - 저장 API: `PATCH /api/flow/:id` (body: { definition })
 * - flowId가 없으면(신규 플로우) 저장을 건너뜁니다.
 *   신규 플로우는 아직 DB row가 없으므로 autosave를 해도 실패/낭비가 되고,
 *   생성 플로우 UX에서 별도 “생성/저장” 시점에 DB에 생깁니다.
 */
async function persistToDb(flowId: string | null, definition: FlowDefinition) {
  if (!flowId) return
  try {
    await fetch(`/api/flow/${flowId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ definition }),
    })
  } catch (e) {
    console.error('[useFlowStore] DB 저장 실패', e)
  }
}

export const useFlowStore = create<FlowStore>((set, get) => ({
  flowId: null,
  flowName: null,
  nodes: [],
  editingNodeId: undefined,
  nodeStatuses: {},
  currentStepNodeId: null,
  stepStates: {},
  isRunning: false,
  panTargetNodeId: null,

  initFromDefinition(flowId, definition) {
    set({
      flowId,
      flowName: definition?.name ?? null,
      nodes: nodesFromDefinition(definition),
      nodeStatuses: {},
      editingNodeId: undefined,
      currentStepNodeId: definition?.ui?.currentStepNodeId ?? null,
      stepStates: (definition?.ui?.stepStates ?? {}) as Record<string, StepState>,
    })
  },

  moveNode(id, delta) {
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === id
          ? {
              ...n,
              position: {
                x: n.position.x + delta.x,
                y: n.position.y + delta.y,
              },
            }
          : n
      ),
    }))
  },

  removeNode(id) {
    const { flowId } = get()
    set((s) => {
      const filtered = s.nodes.filter((n) => n.id !== id)
      const removed = s.nodes.find((n) => n.id === id)
      const relinked = filtered.map((n) => {
        // 일반 연결: ... → (삭제되는 노드) → removed.next 를 유지하도록 당겨 붙임
        const withNext = n.nextNodeId === id ? { ...n, nextNodeId: removed?.nextNodeId } : n
        // 분기 연결: branchIds 에서 제거
        const withBranch = withNext.branchIds?.includes(id)
          ? { ...withNext, branchIds: withNext.branchIds.filter((b) => b !== id) }
          : withNext
        return withBranch
      })
      return { nodes: relinked }
    })
    persistToDb(flowId, get().buildDefinition())
  },

  addBranch(sourceNodeId) {
    const { nodes, flowId } = get()
    const sourceNode = nodes.find((n) => n.id === sourceNodeId)
    if (!sourceNode) return

    const existingBranchIds = sourceNode.branchIds ?? []
    if (existingBranchIds.length >= 3) return
    const branchIndex = existingBranchIds.length
    const BRANCH_Y_GAP = 800

    // 브랜치는 “url-input → summary → preview → publish” 4개 노드 세트로 추가
    const urlInputId = nanoid()
    const summaryId = nanoid()
    const previewId = nanoid()
    const publishId = nanoid()

    const branchX = sourceNode.position.x + NODE_BODY_WIDTH + NODE_GAP
    const branchY = sourceNode.position.y + (branchIndex + 1) * BRANCH_Y_GAP

    const urlInputNode: FlowNode = {
      id: urlInputId,
      type: 'fb-url-input',
      position: { x: branchX, y: branchY },
      nextNodeId: summaryId,
      data: { branchIndex },
    }

    const summaryNode: FlowNode = {
      id: summaryId,
      type: 'fb-summary',
      position: { x: branchX + NODE_BODY_WIDTH + NODE_GAP, y: branchY },
      nextNodeId: previewId,
      data: { branchIndex },
    }

    const previewNode: FlowNode = {
      id: previewId,
      type: 'fb-preview',
      position: { x: branchX + (NODE_BODY_WIDTH + NODE_GAP) * 2, y: branchY },
      nextNodeId: publishId,
      data: { branchIndex },
    }

    const publishNode: FlowNode = {
      id: publishId,
      type: 'fb-publish',
      position: { x: branchX + (NODE_BODY_WIDTH + NODE_GAP) * 3, y: branchY },
      data: {},
    }

    const updatedNodes = nodes.map((n) =>
      n.id === sourceNodeId ? { ...n, branchIds: [...existingBranchIds, urlInputId] } : n
    )

    const next = [...updatedNodes, urlInputNode, summaryNode, previewNode, publishNode]
    set({ nodes: next })
    persistToDb(flowId, get().buildDefinition())
  },

  openConfig(nodeId) {
    set({ editingNodeId: nodeId })
  },

  closeConfig() {
    set({ editingNodeId: undefined })
  },

  async saveNodeConfig(nodeId, data) {
    const { nodes, flowId } = get()
    const node = nodes.find((n) => n.id === nodeId)
    if (!node) return false

    // data는 “부분 업데이트”로 누적 저장(노드별로 여러 설정 UI가 있음을 고려)
    const next = nodes.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n))
    set({ nodes: next })
    // autosave 규칙:
    // - 값이 바뀌면 ‘editing’으로 간주(최종 확정은 각 노드의 “확정/승인/배포” 액션에서 done으로 전환)
    set((s) => ({
      stepStates: {
        ...s.stepStates,
        [nodeId]: { status: 'editing', updatedAt: new Date().toISOString() },
      },
    }))
    await persistToDb(flowId, get().buildDefinition())
    return true
  },

  setStepState(nodeId, status) {
    const { flowId } = get()
    set((s) => ({
      stepStates: {
        ...s.stepStates,
        [nodeId]: { status, updatedAt: new Date().toISOString() },
      },
    }))
    persistToDb(flowId, get().buildDefinition())
  },

  setCurrentStep(nodeId) {
    const { flowId } = get()
    set({ currentStepNodeId: nodeId })
    persistToDb(flowId, get().buildDefinition())
  },

  setNodeStatus(nodeId, status) {
    set((s) => ({ nodeStatuses: { ...s.nodeStatuses, [nodeId]: status } }))
  },

  resetStatuses() {
    set({ nodeStatuses: {} })
  },

  setIsRunning(value) {
    set({ isRunning: value })
  },

  buildDefinition() {
    const { nodes, currentStepNodeId, stepStates } = get()
    return { nodes, ui: { currentStepNodeId: currentStepNodeId ?? undefined, stepStates } }
  },

  getNode(nodeId) {
    return get().nodes.find((n) => n.id === nodeId)
  },

  requestPanToNode(nodeId) {
    const { flowId } = get()
    // 패닝은 “현재 사용자가 보고 있는 스텝”을 의미하므로 currentStepNodeId도 함께 갱신
    set({ panTargetNodeId: nodeId, currentStepNodeId: nodeId })
    persistToDb(flowId, get().buildDefinition())
  },

  clearPanTarget() {
    set({ panTargetNodeId: null })
  },
}))
