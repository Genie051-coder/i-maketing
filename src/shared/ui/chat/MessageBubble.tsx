'use client'

import { Streamdown } from 'streamdown'

interface MessageItemProps {
  message: string
  isUser?: boolean
}

export function MessageBubble({ message, isUser = false }: MessageItemProps) {
  const markdown = message

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[70%] rounded-lg px-4 py-3 ${
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-none'
            : 'bg-muted text-foreground rounded-bl-none'
        } animate-in fade-in shadow-sm`}
      >
        {isUser ? (
          <p className="text-sm wrap-break-word whitespace-pre-wrap">{message}</p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none **:text-sm **:text-inherit [&_pre]:wrap-break-word [&_pre]:whitespace-pre-wrap">
            <Streamdown>{markdown}</Streamdown>
          </div>
        )}
      </div>
    </div>
  )
}
