'use client'

import { Message } from '@/shared/types/message'
import { MessageBubble } from './MessageBubble'

interface ChatContainerProps {
  messages: Message[]
  isLoading: boolean
}

export function ChatContainer({ messages, isLoading }: ChatContainerProps) {
  return (
    <div className="h-full space-y-6 overflow-y-auto scroll-smooth p-4">
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg.content} isUser={msg.role === 'user'} />
      ))}

      {/* 로딩 중이고 아직 답변 텍스트가 오기 전일 때 표시할 인디케이터 (선택) */}
      {isLoading && messages[messages.length - 1]?.content === '' && (
        <div className="flex justify-start">
          <div className="bg-muted text-muted-foreground animate-pulse rounded-lg px-4 py-2 text-xs">
            AI가 생각 중입니다...
          </div>
        </div>
      )}
    </div>
  )
}
