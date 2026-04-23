'use client'

import type { PlatformOption } from '@/shared/ui/chat/constants'
import { AiAssistantPanel } from '@/shared/ui/chat'
import { useTranslations } from 'next-intl'
import type { UIMessage } from 'ai'

interface EmailAiAssistantProps {
  /** 메시지 목록 */
  messages: UIMessage[]
  /** 상태 */
  status: 'streaming' | 'submitted' | 'ready' | 'error'
  /** 에러 */
  error: Error | undefined
  /** 사용자 메시지 전송 시 호출 */
  onSend: (text: string) => void
  /** 마이페이지에 등록된 키 기준 플랫폼만 표시 */
  availablePlatforms?: PlatformOption[]
  /** 선택된 모델 "platformId:modelId" (controlled) */
  selectedModel?: string
  /** 모델 변경 시 */
  onSelectedModelChange?: (value: string) => void
  /** 루트 컨테이너 className (너비 등 레이아웃 조정) */
  className?: string
}

/** UIMessage.parts에서 텍스트만 모아 한 줄로 표시 (스트리밍 시 실시간 갱신) */
function getMessageContent(msg: UIMessage): string {
  if (!msg.parts?.length) return ''
  return msg.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join('')
}

export function EmailAiAssistant({
  messages,
  status,
  onSend,
  availablePlatforms,
  selectedModel,
  onSelectedModelChange,
  className,
}: EmailAiAssistantProps) {
  const t = useTranslations()

  const displayMessages = messages.map((msg) => ({
    id: msg.id,
    role: msg.role as 'user' | 'assistant',
    content: getMessageContent(msg),
  }))

  const isLoading = status === 'streaming' || status === 'submitted'

  return (
    <AiAssistantPanel
      className={className}
      messages={displayMessages}
      isLoading={isLoading}
      onSend={onSend}
      title={t('aiAssistant.title')}
      subtitle={t('aiAssistant.subtitle')}
      exampleLines={[
        t('aiAssistant.example1'),
        t('aiAssistant.example2'),
        t('aiAssistant.example3'),
      ]}
      exampleTitle={t('aiAssistant.examplesTitle')}
      placeholder={t('aiAssistant.placeholder')}
      loadingText={t('aiAssistant.working')}
      showModelDropdown={true}
      availablePlatforms={availablePlatforms}
      selectedModel={selectedModel}
      onSelectedModelChange={onSelectedModelChange}
    />
  )
}
