'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import {
  Sparkles,
  Loader2,
  ChevronDown,
  ChevronUp,
  ThumbsUp,
  MessageCircle,
  Share2,
  Globe,
  Pencil,
  ImageOff,
} from 'lucide-react'
import Image from 'next/image'
import { useFlowStore } from '@/features/flow/store/useFlowStore'
import { AI_PANEL_MAX_HEIGHT_VIEWPORT_RATIO, AI_PANEL_WIDTH } from '@/features/flow/constants'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useQuery } from '@tanstack/react-query'
import { getAvailablePlatforms, getDefaultSelectedModel } from '@/shared/ui/chat/constants'
import { AiAssistantPanel } from '@/shared/ui/chat/AiAssistantPanel'
import { Button } from '@/shared/ui/basic/button'
import { NodeShell } from '../_shared/NodeShell'
import type { FbNodeBaseProps } from '../_shared/fb-types'

type ArticleData = {
  url: string
  title: string
  description?: string
  image?: string
  images: string[]
  body: string
  publishedAt?: string
}

function cleanBody(str: string) {
  return str
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&lsquo;/g, '\u2018')
    .replace(/&rsquo;/g, '\u2019')
    .replace(/&ldquo;/g, '\u201C')
    .replace(/&rdquo;/g, '\u201D')
    .replace(/&middot;/g, '\u00B7')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s{3,}/g, '\n\n')
    .trim()
}

export function FbSummaryNode({
  nodeId,
  data,
  validationErrors,
  validationWarnings,
  executionResult,
}: FbNodeBaseProps) {
  const nodes = useFlowStore((s) => s.nodes)
  const getNode = useFlowStore((s) => s.getNode)
  const saveNodeConfig = useFlowStore((s) => s.saveNodeConfig)
  const setNodeStatus = useFlowStore((s) => s.setNodeStatus)
  const setStepState = useFlowStore((s) => s.setStepState)

  const existingData = data as { summary?: string; branchIndex?: number } | undefined
  const branchIndex =
    typeof existingData?.branchIndex === 'number' ? existingData.branchIndex : undefined

  const [summary, setSummary] = useState(existingData?.summary ?? '')
  const [loading, setLoading] = useState(false)
  const [articleExpanded, setArticleExpanded] = useState(false)
  const [isEditingPost, setIsEditingPost] = useState(false)
  const editableRef = useRef<HTMLDivElement>(null)
  // 항상 최신 summary/isEditingPost를 ref로 유지 — callback ref 클로저에서 사용
  const summaryRef = useRef(existingData?.summary ?? '')
  const isEditingPostRef = useRef(false)
  const leftColumnRef = useRef<HTMLDivElement>(null)
  const [leftColumnHeightPx, setLeftColumnHeightPx] = useState(0)
  const [aiPanelMaxCapPx, setAiPanelMaxCapPx] = useState(720)
  // 사용자가 리사이즈한 AI 패널 크기 (null = 자동 계산값 사용)
  const [aiPanelUserSize, setAiPanelUserSize] = useState<{ w: number; h: number } | null>(null)
  const aiPanelResizeDragOrigin = useRef<{
    startX: number
    startY: number
    startW: number
    startH: number
  } | null>(null)

  const newsSourceNode = nodes.find((n) => n.type === 'news-source')
  const fbUrlInputNode =
    nodes.find((n) => n.type === 'fb-url-input' && n.nextNodeId === nodeId) ??
    nodes.find((n) => n.type === 'fb-url-input')
  const newsData = newsSourceNode?.data as
    | {
        selectedTitle?: string
        selectedContent?: string
        selectedPress?: string
        selectedUrl?: string
        selections?: Record<
          string,
          { selectedTitle?: string; selectedContent?: string; selectedUrl?: string }
        >
      }
    | undefined
  const fbUrlData = fbUrlInputNode?.data as { articleUrl?: string } | undefined

  const mySelection = fbUrlInputNode?.id
    ? (
        newsData?.selections as
          | Record<
              string,
              { selectedTitle?: string; selectedContent?: string; selectedUrl?: string }
            >
          | undefined
      )?.[fbUrlInputNode.id]
    : undefined
  const articleUrl =
    fbUrlData?.articleUrl ?? mySelection?.selectedUrl ?? newsData?.selectedUrl ?? ''
  const fallbackTitle = mySelection?.selectedTitle ?? newsData?.selectedTitle ?? ''
  const fallbackBody = mySelection?.selectedContent ?? newsData?.selectedContent ?? ''

  const { data: article, isLoading: articleLoading } = useQuery<ArticleData | null>({
    queryKey: ['news-article', articleUrl],
    queryFn: async () => {
      if (!articleUrl) return null
      const res = await fetch(`/api/news/article?url=${encodeURIComponent(articleUrl)}`)
      if (!res.ok) return null
      return res.json()
    },
    enabled: !!articleUrl,
    staleTime: 1000 * 60 * 5,
  })

  const articleTitle = article?.title ?? fallbackTitle
  const articleBody = useMemo(
    () => cleanBody(article?.body ?? fallbackBody),
    [article?.body, fallbackBody]
  )
  const rawImage = article?.image ?? article?.images?.[0] ?? null
  const articleImage =
    rawImage && !rawImage.includes('googleusercontent.com') && !rawImage.includes('news.google.com')
      ? rawImage
      : null

  const { data: aiKeys = [] } = useQuery<{ id: string; provider: string }[]>({
    queryKey: ['my-page', 'ai-keys'],
    queryFn: async () => {
      const res = await fetch('/api/user/ai-keys')
      if (!res.ok) return []
      return res.json()
    },
  })
  const availablePlatforms = useMemo(() => getAvailablePlatforms(aiKeys), [aiKeys])
  const [selectedModel, setSelectedModel] = useState('')
  useEffect(() => {
    if (availablePlatforms.length > 0 && !selectedModel) {
      setSelectedModel(getDefaultSelectedModel(availablePlatforms))
    }
  }, [availablePlatforms, selectedModel])

  const generatedRef = useRef(false)
  useEffect(() => {
    if (!summary && articleBody && !generatedRef.current && !articleLoading) {
      generatedRef.current = true
      generateSummary(articleBody)
    }
  }, [articleBody, articleLoading]) // eslint-disable-line react-hooks/exhaustive-deps

  // ref를 항상 최신 상태로 동기화
  useEffect(() => {
    summaryRef.current = summary
  }, [summary])
  useEffect(() => {
    isEditingPostRef.current = isEditingPost
  }, [isEditingPost])

  // div가 마운트/언마운트될 때 호출되는 callback ref
  // articleLoading이 false가 되는 순간 div가 처음 마운트되며 즉시 textContent 설정
  const handleEditableRef = useCallback((el: HTMLDivElement | null) => {
    editableRef.current = el
    if (el && !isEditingPostRef.current) {
      el.textContent = summaryRef.current
    }
  }, [])

  // 이후 summary 변경(생성·수정)시 실시간 반영
  useEffect(() => {
    if (editableRef.current && !isEditingPost) {
      editableRef.current.textContent = summary
    }
  }, [summary, isEditingPost])

  const generateSummary = async (body = articleBody) => {
    if (!body) return
    setLoading(true)
    try {
      const text = body.slice(0, 1500)
      const lines = text.split(/[.!?]\s+/).filter((s) => s.length > 10)
      const keyPoints = lines.slice(0, 3).join('. ') + '.'
      const generated = keyPoints.length > 20 ? keyPoints : text.slice(0, 200)
      setSummary(generated)
      if (nodeId) {
        await saveNodeConfig(nodeId, {
          summary: generated,
          articleTitle,
          articleContent: text,
          articleUrl,
          articleImage: articleImage ?? undefined,
        })
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  const handlePostInput = useCallback(() => {
    setSummary(editableRef.current?.textContent ?? '')
  }, [])

  const chatBody = {
    selectedModel,
    articleTitle,
    articleContent: articleBody.slice(0, 1500),
    articleUrl,
    articleImage: articleImage ?? undefined,
    companyName: newsData?.selectedPress ?? '',
    tone: 'formal',
  }

  const {
    messages,
    sendMessage,
    status: chatStatus,
  } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/facebook/agent',
      body: chatBody,
    }),
    onFinish: ({ messages: finishedMessages }) => {
      // 최종 완료 시 nodeConfig 저장만 담당 (setSummary는 아래 useEffect가 실시간 처리)
      const last = finishedMessages[finishedMessages.length - 1]
      if (last?.role !== 'assistant' || !last.parts) return
      for (const part of last.parts) {
        if (
          part.type === 'tool-generateFacebookPost' &&
          'input' in part &&
          part.input &&
          typeof part.input === 'object'
        ) {
          const input = part.input as { content?: string; hashtags?: string[] }
          if (input.content && nodeId) {
            const hashtagLine =
              input.hashtags && input.hashtags.length > 0 ? '\n\n' + input.hashtags.join(' ') : ''
            const fullContent = input.content + hashtagLine
            saveNodeConfig(nodeId, {
              summary: fullContent,
              articleTitle,
              articleContent: articleBody.slice(0, 1500),
              articleUrl,
              articleImage: articleImage ?? undefined,
            })
          }
          break
        }
      }
    },
  })

  // [B] 스트리밍 중 tool input이 변할 때마다 에디터 실시간 반영
  useEffect(() => {
    const last = messages.at(-1)
    if (last?.role !== 'assistant' || !last.parts) return
    for (const part of last.parts) {
      if (
        part.type === 'tool-generateFacebookPost' &&
        'input' in part &&
        part.input &&
        typeof part.input === 'object'
      ) {
        const input = part.input as { content?: string; hashtags?: string[] }
        if (input.content) {
          const hashtagLine =
            input.hashtags && input.hashtags.length > 0 ? '\n\n' + input.hashtags.join(' ') : ''
          setSummary(input.content + hashtagLine)
        }
        return
      }
    }
  }, [messages])

  // [A] 채팅 패널: text 파트 없을 때 tool 파트로 상태 표시
  const chatMessages = messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => {
      const textContent = m.parts?.find((p) => p.type === 'text')?.text ?? ''
      const hasToolPart = m.parts?.some((p) => (p.type as string).startsWith('tool-'))
      const content = textContent || (hasToolPart ? '✍️ 포스팅을 작성하고 있습니다...' : '')
      return { id: m.id, role: m.role as 'user' | 'assistant', content }
    })
    .filter((m) => m.content)

  const handleAiSend = (text: string) => {
    sendMessage({ text }, { body: chatBody })
  }

  const handleConfirm = async () => {
    if (!nodeId || !summary) return
    const pageName = newsData?.selectedPress ?? '페이지'
    const hashtags = (summary.match(/#[\w가-힣]+/g) ?? []) as string[]
    await saveNodeConfig(nodeId, {
      summary,
      hashtags,
      articleTitle,
      articleContent: articleBody.slice(0, 1500),
      articleUrl,
      articleImage: articleImage ?? undefined,
    })
    const current = getNode(nodeId)
    const nextNode = current?.nextNodeId
      ? nodes.find((n) => n.id === current.nextNodeId)
      : undefined
    if (nextNode?.type === 'fb-preview' || nextNode?.type === 'fb-publish') {
      await saveNodeConfig(nextNode.id, {
        content: summary,
        hashtags,
        articleUrl,
        articleTitle,
        articleImage: articleImage ?? undefined,
        pageName,
      })
    }
    setNodeStatus(nodeId, { status: 'success' })
    setStepState(nodeId, 'done')
  }

  const isAiLoading = chatStatus === 'streaming' || chatStatus === 'submitted'
  const pageName = newsData?.selectedPress ?? '페이지'
  const pageInitial = pageName.charAt(0)
  const execStatus = executionResult?.status
  const isDone = !!summary && execStatus === 'success'

  // ResizeObserver는 마운트 시 한 번만 등록 — observer가 모든 높이 변화를 자동 감지
  useEffect(() => {
    const el = leftColumnRef.current
    if (!el) return
    const measure = () => setLeftColumnHeightPx(Math.round(el.getBoundingClientRect().height))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const updateCap = () =>
      setAiPanelMaxCapPx(
        Math.max(400, Math.round(window.innerHeight * AI_PANEL_MAX_HEIGHT_VIEWPORT_RATIO))
      )
    updateCap()
    window.addEventListener('resize', updateCap)
    return () => window.removeEventListener('resize', updateCap)
  }, [])

  // 항상 명시적 height 사용 — maxHeight만 있으면 h-full이 CSS 스펙상 동작 안 함
  const aiPanelHeightPx =
    leftColumnHeightPx > 0 ? Math.min(leftColumnHeightPx, aiPanelMaxCapPx) : aiPanelMaxCapPx

  // 실제 패널 크기: 사용자가 리사이즈했으면 그 값, 아니면 계산값
  const aiPanelW = aiPanelUserSize?.w ?? AI_PANEL_WIDTH
  const aiPanelH = aiPanelUserSize?.h ?? aiPanelHeightPx

  const handleAiPanelResizeStart = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation()
      e.preventDefault()
      aiPanelResizeDragOrigin.current = {
        startX: e.clientX,
        startY: e.clientY,
        startW: aiPanelW,
        startH: aiPanelH,
      }
      const minW = AI_PANEL_WIDTH
      const maxW = AI_PANEL_WIDTH * 2
      const minH = aiPanelHeightPx
      const maxH = aiPanelHeightPx * 2

      const onMove = (ev: PointerEvent) => {
        const o = aiPanelResizeDragOrigin.current
        if (!o) return
        const newW = Math.min(maxW, Math.max(minW, o.startW + ev.clientX - o.startX))
        const newH = Math.min(maxH, Math.max(minH, o.startH + ev.clientY - o.startY))
        setAiPanelUserSize({ w: newW, h: newH })
      }
      const onUp = () => {
        aiPanelResizeDragOrigin.current = null
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
      }
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    },
    [aiPanelW, aiPanelH, aiPanelHeightPx]
  )

  return (
    <div className="flex items-start gap-4">
      <div ref={leftColumnRef} className="shrink-0 self-start">
        <NodeShell
          icon={<Sparkles className="h-[13px] w-[13px]" />}
          title={
            branchIndex !== undefined ? `AI 콘텐츠 생성 v${branchIndex + 1}` : 'AI 콘텐츠 생성'
          }
          badgeLabel={isDone ? '완료' : '편집 중'}
          isConfigured={!!summary}
          validationErrors={validationErrors}
          validationWarnings={validationWarnings}
          executionResult={executionResult}
        >
          <div className="space-y-2">
            {!articleUrl ? (
              <div className="rounded-[9px] border border-amber-200 bg-amber-50 px-3 py-4 text-center">
                <p className="text-[11px] text-amber-700">
                  기사 선택 후 링크 입력 노드에서 URL을 저장해주세요
                </p>
              </div>
            ) : articleLoading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-[#999]">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-[11px]">기사 불러오는 중...</span>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Article source (collapsible) */}
                <div className="overflow-hidden rounded-[9px] border border-black/8 bg-[#f9f9f7]">
                  <button
                    type="button"
                    data-interactive="true"
                    onClick={(e) => {
                      e.stopPropagation()
                      setArticleExpanded((p) => !p)
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="flex w-full items-center gap-2 px-2.5 py-2 text-left hover:bg-black/[0.02]"
                  >
                    {articleImage ? (
                      <Image
                        src={articleImage}
                        alt=""
                        width={32}
                        height={32}
                        className="h-8 w-8 shrink-0 rounded-[6px] object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] bg-black/5">
                        <ImageOff className="h-3 w-3 text-[#999]" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] font-medium text-[#999] uppercase">
                        원본 · {newsData?.selectedPress}
                      </p>
                      <p className="line-clamp-2 text-[11px] font-medium text-[#1a1a1a]">
                        {articleTitle}
                      </p>
                    </div>
                    {articleExpanded ? (
                      <ChevronUp className="h-3 w-3 shrink-0 text-[#999]" />
                    ) : (
                      <ChevronDown className="h-3 w-3 shrink-0 text-[#999]" />
                    )}
                  </button>
                  {articleExpanded && (
                    <div className="border-t border-black/6 bg-white px-2.5 py-2">
                      {articleUrl && (
                        <a
                          href={articleUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          data-interactive="true"
                          className="block text-[10px] text-[#6366f1] hover:underline"
                        >
                          기사 원문 보기 →
                        </a>
                      )}
                    </div>
                  )}
                </div>

                {/* Post content */}
                <div className="overflow-hidden rounded-[9px] border border-black/8 bg-white shadow-sm">
                  <div className="flex items-center gap-2 border-b border-black/5 px-2.5 py-1.5">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1877F2] text-[9px] font-semibold text-white">
                      {pageInitial}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[10px] font-semibold text-[#1a1a1a]">
                        {pageName} 공식
                      </p>
                      <div className="flex items-center gap-0.5 text-[9px] text-[#999]">
                        <span>방금 전</span>
                        <span>·</span>
                        <Globe className="h-2.5 w-2.5" />
                      </div>
                    </div>
                  </div>
                  <div className="px-2.5 py-2">
                    <div className="group relative">
                      {loading && (
                        <div className="flex items-center gap-2 py-4">
                          <Loader2 className="h-3 w-3 animate-spin text-[#6366f1]" />
                          <span className="text-[10px] text-[#999]">요약 중...</span>
                        </div>
                      )}
                      <div
                        ref={handleEditableRef}
                        contentEditable
                        suppressContentEditableWarning
                        data-interactive="true"
                        onFocus={() => setIsEditingPost(true)}
                        onBlur={() => {
                          setIsEditingPost(false)
                          const text = editableRef.current?.textContent ?? ''
                          if (nodeId && text) {
                            saveNodeConfig(nodeId, {
                              summary: text,
                              articleTitle,
                              articleContent: articleBody.slice(0, 1500),
                              articleUrl,
                              articleImage: articleImage ?? undefined,
                            })
                          }
                        }}
                        onInput={handlePostInput}
                        onPointerDown={(e) => e.stopPropagation()}
                        style={loading ? { display: 'none' } : undefined}
                        className="min-h-[60px] rounded-[6px] p-2 text-[11px] leading-relaxed whitespace-pre-wrap text-[#1a1a1a] outline-none hover:bg-[#f9f9f7] focus:bg-[#f9f9f7] focus:ring-1 focus:ring-[#6366f1]/30"
                      />
                      {!loading && !isEditingPost && summary && (
                        <div className="pointer-events-none absolute top-1.5 right-1.5 flex items-center gap-0.5 rounded bg-white/90 px-1 py-0.5 text-[9px] text-[#999] opacity-0 shadow-sm transition group-hover:opacity-100">
                          <Pencil className="h-2.5 w-2.5" />
                          클릭하여 수정
                        </div>
                      )}
                    </div>
                    {articleUrl && (
                      <div className="mt-1.5 overflow-hidden rounded-[6px] border border-black/6">
                        {articleImage && (
                          <div className="relative aspect-[1.91/1] w-full overflow-hidden">
                            <Image
                              src={articleImage}
                              alt=""
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                        )}
                        <div className="bg-[#f0f2f5] px-2 py-1">
                          <p className="text-[8px] font-medium text-[#65676b] uppercase">
                            {pageName}
                          </p>
                          <p className="mt-0.5 line-clamp-2 text-[9px] font-medium text-[#1a1a1a]">
                            {articleTitle || '기사 원문 보기'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex border-t border-black/5">
                    <div className="flex flex-1 items-center justify-center gap-0.5 py-1 text-[9px] text-[#65676b]">
                      <ThumbsUp className="h-2.5 w-2.5" />
                      좋아요
                    </div>
                    <div className="flex flex-1 items-center justify-center gap-0.5 py-1 text-[9px] text-[#65676b]">
                      <MessageCircle className="h-2.5 w-2.5" />
                      댓글
                    </div>
                    <div className="flex flex-1 items-center justify-center gap-0.5 py-1 text-[9px] text-[#65676b]">
                      <Share2 className="h-2.5 w-2.5" />
                      공유
                    </div>
                  </div>
                </div>
                {summary && (
                  <p className="text-right text-[10px] text-[#999]">{summary.length}자</p>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    type="button"
                    data-interactive="true"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleConfirm()
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    disabled={!summary || loading}
                    className="w-full rounded-[7px] bg-[#6366f1] py-1.5 text-[10px] hover:bg-[#5558e3]"
                  >
                    콘텐츠 검증으로 보내기 →
                  </Button>
                </div>
              </div>
            )}
          </div>
        </NodeShell>
      </div>

      {/* AI Chat - 우측 고정 */}
      <div
        className="relative flex min-h-0 shrink-0 flex-col overflow-hidden rounded-[12px] border border-[#6366f1]/20 bg-white"
        style={{ width: aiPanelW, height: aiPanelH }}
      >
        <AiAssistantPanel
          title="AI 어시스턴트"
          subtitle="요약 수정·포스팅 초안 요청"
          messages={chatMessages}
          isLoading={isAiLoading}
          onSend={handleAiSend}
          placeholder="기사를 기반으로 페이스북 게시글을 작성해줘"
          loadingText="생각 중..."
          showModelDropdown={true}
          availablePlatforms={availablePlatforms}
          selectedModel={selectedModel}
          onSelectedModelChange={setSelectedModel}
          className="h-full w-full"
        />
        {/* 리사이즈 핸들 — 우하단 */}
        <div
          data-interactive="true"
          onPointerDown={handleAiPanelResizeStart}
          className="absolute right-0 bottom-0 flex cursor-nwse-resize items-end justify-end p-1"
          style={{ width: 18, height: 18, borderRadius: '0 0 12px 0' }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <line
              x1="10"
              y1="3"
              x2="3"
              y2="10"
              stroke="rgba(99,102,241,0.5)"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
            <line
              x1="10"
              y1="6"
              x2="6"
              y2="10"
              stroke="rgba(99,102,241,0.5)"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
            <line
              x1="10"
              y1="9"
              x2="9"
              y2="10"
              stroke="rgba(99,102,241,0.5)"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>
    </div>
  )
}
