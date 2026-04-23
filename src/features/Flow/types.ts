/** 플로우 노드 타입 (프론트엔드 UI용) */
export type FlowNodeType =
  | 'email'
  | 'validate'
  | 'gmail'
  | 'mailpit'
  | 'campaign-purpose'
  | 'address-book'
  | 'send-settings'
  | 'confirm-send'
  | 'openai'
  | 'news-source'
  | 'fb-url-input'
  | 'fb-summary'
  | 'fb-preview'
  | 'fb-publish'

/** 이메일 노드 데이터 */
export interface EmailNodeData {
  fromName?: string
  subject?: string
  previewText?: string
  brandColor?: string
  logoUrl?: string
  blocks?: unknown[]
  versions?: Record<string, unknown>
  activeVersion?: string
}

/** 플로우 노드 */
export interface FlowNode {
  id: string
  type: FlowNodeType
  position: { x: number; y: number }
  nextNodeId?: string
  /** 브랜치 분기 연결 (news-source → 여러 fb-summary) */
  branchIds?: string[]
  data?: Record<string, unknown>
}

export type StepStateStatus = 'editing' | 'done' | 'blocked'

export type StepState = {
  status: StepStateStatus
  updatedAt?: string
}

export interface FlowUiState {
  /** 현재 사용자가 보고/편집 중인 스텝 노드 (선택) */
  currentStepNodeId?: string
  /** 노드별 진행 상태 (명시적으로 저장/복원) */
  stepStates?: Record<string, StepState>
}

/** 플로우 정의 (DB에 저장되는 JSON 구조) */
export interface FlowDefinition {
  name?: string
  nodes: FlowNode[]
  ui?: FlowUiState
}

/** 플로우 정의로부터 노드 배열 반환 */
export function nodesFromDefinition(definition: FlowDefinition | null | undefined): FlowNode[] {
  if (!definition || !Array.isArray(definition.nodes)) return []
  return definition.nodes
}

/** 플로우 상태를 localStorage에 임시 저장 (신규 플로우 생성 전 임시 보관용) */
export function saveFlowState(flowId: string, definition: Partial<FlowDefinition>): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(`flow:${flowId}`, JSON.stringify(definition))
  } catch {
    // ignore
  }
}

/** localStorage에서 플로우 상태 읽기 */
export function loadFlowState(flowId: string): Partial<FlowDefinition> | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(`flow:${flowId}`)
    if (!raw) return null
    return JSON.parse(raw) as Partial<FlowDefinition>
  } catch {
    return null
  }
}
