/**
 * API로부터 받아오는 에이전트 정보 타입
 */
export interface AgentInfo {
  id: string
  displayName: string
  provider: string
  model: string
}
