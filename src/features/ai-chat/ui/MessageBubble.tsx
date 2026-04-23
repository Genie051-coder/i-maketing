interface MessageItemProps {
  message: string
  isUser?: boolean
}

export function MessageBubble({ message, isUser = false }: MessageItemProps) {
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[70%] rounded-lg px-4 py-3 ${
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-none'
            : 'bg-muted text-foreground rounded-bl-none'
        } animate-in fade-in shadow-sm`}
      >
        <p className="text-sm wrap-break-word whitespace-pre-wrap">{message}</p>
      </div>
    </div>
  )
}
