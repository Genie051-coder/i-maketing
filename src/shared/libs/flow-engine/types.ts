/**
 * 플로우 실행 엔진에서 사용하는 공유 타입 정의.
 * API 요청 → runner → 각 노드 핸들러까지 동일한 타입을 사용합니다.
 */

/** 플로우 실행 시 서버로 전달되는 노드 단위 데이터 */
export interface ExecutionNode {
  id: string
  type: string
  position: { x: number; y: number }
  nextNodeId?: string
  /** 브랜치 분기 연결 (news-source → 여러 fb-summary) */
  branchIds?: string[]
  data?: Record<string, unknown>
}

/** 각 노드 핸들러(email-create, confirm-send 등)가 반환하는 실행 결과 */
export interface NodeRunResult {
  ok: boolean
  output?: unknown
  error?: string
}
