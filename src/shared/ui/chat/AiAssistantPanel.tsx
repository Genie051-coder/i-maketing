'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import type { PlatformOption } from './constants'
import { ChatInput } from './ChatInput'
import { MessageBubble } from './MessageBubble'
import { Sparkles, ChevronDown } from 'lucide-react'

export interface AiAssistantMessage {
  id: string
  content: string
  role: 'user' | 'assistant'
}

export interface AiAssistantPanelProps {
  messages: AiAssistantMessage[]
  isLoading?: boolean
  onSend: (message: string) => void
  title: string
  subtitle?: string
  exampleLines?: string[]
  exampleTitle?: string
  placeholder?: string
  loadingText?: string
  className?: string
  showModelDropdown?: boolean
  availablePlatforms?: PlatformOption[]
  selectedModel?: string
  onSelectedModelChange?: (value: string) => void
  panelMinHeightPx?: number
  panelMaxHeightPx?: number
  /** @deprecated 메시지는 항상 상단부터 쌓입니다 */
  centerMessageScroll?: boolean
}

const SCROLL_THRESHOLD = 80 // 하단에서 이 px 이내면 "바닥"으로 간주

export function AiAssistantPanel({
  messages,
  isLoading = false,
  onSend,
  title,
  subtitle,
  placeholder = '메시지를 입력하세요...',
  loadingText = '생각 중...',
  showModelDropdown = false,
  availablePlatforms,
  selectedModel,
  onSelectedModelChange,
  className,
  panelMinHeightPx,
  panelMaxHeightPx,
}: AiAssistantPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const isAtBottomRef = useRef(true)
  const [showScrollBtn, setShowScrollBtn] = useState(false)

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior })
  }, [])

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < SCROLL_THRESHOLD
    isAtBottomRef.current = atBottom
    setShowScrollBtn(!atBottom)
  }, [])

  // 새 메시지·로딩 변화 → 바닥에 있을 때만 자동 스크롤
  // rAF로 묶어 스트리밍 중 연속 호출을 마지막 프레임 하나로 압축
  useEffect(() => {
    if (!isAtBottomRef.current) {
      setShowScrollBtn(true)
      return
    }
    const frame = requestAnimationFrame(() => scrollToBottom('smooth'))
    return () => cancelAnimationFrame(frame)
  }, [messages, isLoading, scrollToBottom])

  // 최초 마운트 시 즉시 바닥으로
  useEffect(() => {
    scrollToBottom('instant')
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const heightStyle =
    panelMinHeightPx != null && panelMinHeightPx > 0
      ? {
          minHeight: panelMinHeightPx,
          ...(panelMaxHeightPx != null && panelMaxHeightPx > 0
            ? { maxHeight: panelMaxHeightPx }
            : {}),
        }
      : undefined

  return (
    <div
      className={`flex h-full max-h-full min-h-0 min-w-0 flex-col overflow-hidden border-r ${className ?? 'w-[40%]'}`}
      style={heightStyle}
    >
      {/* 헤더 */}
      <div className="shrink-0 border-b bg-linear-to-r from-purple-50 to-blue-50 px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="h-4 w-4 text-purple-600" />
          {title}
        </h2>
        {subtitle && <p className="text-xs text-gray-600">{subtitle}</p>}
      </div>

      {/* 메시지 영역 */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="relative min-h-0 flex-1 overflow-x-hidden overflow-y-auto [scrollbar-gutter:stable]"
      >
        <div className="flex flex-col gap-4 px-4 py-4">
          {messages.length === 0 && !isLoading && (
            <MessageBubble
              message="안녕하세요! ✍️ 포스팅 수정이 필요하시면 말씀해주세요."
              isUser={false}
            />
          )}
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg.content} isUser={msg.role === 'user'} />
          ))}
          {isLoading && (
            <div className="flex animate-pulse items-center gap-2 rounded-lg border border-purple-200 bg-purple-50 p-3 text-xs font-medium text-purple-700">
              <Sparkles className="h-3 w-3 animate-spin" /> {loadingText}
            </div>
          )}
        </div>

        {/* 스크롤 다운 버튼 */}
        {showScrollBtn && (
          <button
            type="button"
            onClick={() => {
              scrollToBottom('smooth')
              setShowScrollBtn(false)
            }}
            className="absolute right-3 bottom-3 flex items-center gap-1 rounded-full border border-purple-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-purple-600 shadow-md transition hover:bg-purple-50"
          >
            <ChevronDown className="h-3 w-3" />
            최신 메시지
          </button>
        )}
      </div>

      {/* 입력창 */}
      <div className="relative shrink-0 border-t bg-white p-3">
        <ChatInput
          onSendMessage={(msg) => onSend(msg)}
          disabled={isLoading}
          upload={false}
          placeholder={placeholder}
          showModelDropdown={showModelDropdown}
          availablePlatforms={availablePlatforms}
          selectedModel={selectedModel}
          onSelectedModelChange={onSelectedModelChange}
        />
      </div>
    </div>
  )
}
