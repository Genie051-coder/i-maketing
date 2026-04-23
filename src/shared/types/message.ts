export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt: Date

  // 멀티 에이전트 필수 필드
  agentId?: string
  agentName?: string

  // 확장성을 위한 메타데이터
  metadata?: Record<string, unknown>
}
