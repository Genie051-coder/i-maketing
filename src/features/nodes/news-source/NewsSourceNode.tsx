'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Newspaper, Search, Loader2, ExternalLink } from 'lucide-react'
import { Button } from '@/shared/ui/basic/button'
import { Input } from '@/shared/ui/basic/input'
import { useFlowStore } from '@/features/flow/store/useFlowStore'
import { NodeShell } from '../_shared/NodeShell'
import { cn, formatRelativeTime } from '@/shared/libs/utils'

interface Article {
  title: string
  link: string
  articleUrl: string
  pubDate: string
  description: string
  source: string
}

type SelectionData = {
  selectedTitle: string
  selectedUrl: string
  selectedContent: string
  selectedPress: string
  selectedPubDate: string
}

interface NewsSourceNodeProps {
  nodeId?: string
  data?: Record<string, unknown>
  validationErrors?: string[]
  validationWarnings?: string[]
  executionResult?: {
    status: 'running' | 'success' | 'failed'
    message?: string
  }
}

export function NewsSourceNode({
  nodeId,
  data,
  validationErrors,
  validationWarnings,
  executionResult,
}: NewsSourceNodeProps) {
  const EMPTY_BRANCH_IDS: string[] = []
  const nodes = useFlowStore((s) => s.nodes)
  const saveNodeConfig = useFlowStore((s) => s.saveNodeConfig)
  const addBranch = useFlowStore((s) => s.addBranch)
  const setStepState = useFlowStore((s) => s.setStepState)

  const newsNode = nodeId ? nodes.find((n) => n.id === nodeId) : undefined
  const branchIds = newsNode?.branchIds ?? EMPTY_BRANCH_IDS
  const branchCount = branchIds.length

  // 버전 목록: [메인 url-input id, ...branchIds]
  const versionIds = useMemo(() => {
    const mainId = newsNode?.nextNodeId
    if (!mainId) return branchIds
    return [mainId, ...branchIds]
  }, [newsNode?.nextNodeId, branchIds])

  const initialQuery = typeof data?.query === 'string' ? data.query : ''
  const selections = (data?.selections as Record<string, SelectionData>) ?? {}
  const legacyTitle = typeof data?.selectedTitle === 'string' ? data.selectedTitle : ''

  const [query, setQuery] = useState(initialQuery)
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(false)
  const [fetchingBody, setFetchingBody] = useState<string | null>(null)
  const [activeVersionId, setActiveVersionId] = useState<string>(() => versionIds[0] ?? '')

  useEffect(() => {
    setActiveVersionId((prev) => (versionIds.includes(prev) ? prev : (versionIds[0] ?? prev)))
  }, [versionIds])

  // 버전별 선택 우선, 메인(versionIds[0])이고 레거시 데이터 있으면 사용
  const activeSelection = selections[activeVersionId]
  const selectedTitle =
    activeSelection?.selectedTitle ?? (activeVersionId === versionIds[0] ? legacyTitle : '')

  const isConfigured = !!selectedTitle || Object.keys(selections).length > 0

  const fetchArticles = useCallback(async (q: string) => {
    if (!q.trim()) return
    setLoading(true)
    try {
      const res = await fetch(`/api/news?query=${encodeURIComponent(q.trim())}&limit=10`)
      if (res.ok) {
        const d = await res.json()
        const items = (d.items ?? []) as Article[]
        const now = new Date()
        const isSameLocalDay = (a: Date, b: Date) =>
          a.getFullYear() === b.getFullYear() &&
          a.getMonth() === b.getMonth() &&
          a.getDate() === b.getDate()

        const sorted = [...items].sort((a, b) => {
          const da = new Date(a.pubDate)
          const db = new Date(b.pubDate)
          const aToday = isSameLocalDay(da, now)
          const bToday = isSameLocalDay(db, now)
          if (aToday !== bToday) return aToday ? -1 : 1
          return db.getTime() - da.getTime()
        })

        setArticles(sorted.slice(0, 10))
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (initialQuery) fetchArticles(initialQuery)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelect = async (article: Article) => {
    if (!nodeId || !activeVersionId || fetchingBody) return
    setFetchingBody(article.title)

    try {
      let content = article.description
      const bodyRes = await fetch('/api/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleUrl: article.articleUrl }),
      })
      if (bodyRes.ok) {
        const bodyData = await bodyRes.json()
        content = bodyData.content || article.description
      }

      const selection: SelectionData = {
        selectedTitle: article.title,
        selectedUrl: article.articleUrl,
        selectedContent: content,
        selectedPress: article.source,
        selectedPubDate: article.pubDate,
      }

      await saveNodeConfig(nodeId, {
        query,
        selections: { ...selections, [activeVersionId]: selection },
      })
      setStepState(nodeId, 'done')
    } catch {
      // ignore
    } finally {
      setFetchingBody(null)
    }
  }

  return (
    <NodeShell
      icon={<Newspaper className="h-[13px] w-[13px]" />}
      title="기사 선택"
      badgeLabel={isConfigured ? '완료' : '입력 필요'}
      isConfigured={isConfigured}
      validationErrors={validationErrors}
      validationWarnings={validationWarnings}
      executionResult={executionResult}
    >
      <div className="space-y-2">
        {/* Search bar */}
        <div className="mb-2 flex h-8 gap-[5px]">
          <div className="relative flex flex-1">
            <Input
              data-interactive="true"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation()
                if (e.key === 'Enter') fetchArticles(query)
              }}
              onPointerDown={(e) => e.stopPropagation()}
              placeholder="검색 키워드"
              className="h-full rounded-[7px] border-black/12 bg-[#f9f9f7] py-0 pr-2 pl-[26px] text-[11px] focus:border-black/25"
            />
            <Search className="pointer-events-none absolute top-1/2 left-2 h-3 w-3 -translate-y-1/2 text-[#999]" />
          </div>
          <Button
            data-interactive="true"
            type="button"
            variant="outline"
            size="xs"
            onClick={(e) => {
              e.stopPropagation()
              fetchArticles(query)
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="h-full rounded-[7px] border-black/12 bg-[#f9f9f7] px-2 text-[10px] text-[#666] hover:bg-[#f0f0ec]"
          >
            {loading ? '...' : '검색'}
          </Button>
        </div>

        {/* 비교용 기사 선택 탭 */}
        {nodeId && (
          <div className="mb-2 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#999]">비교할 기사</span>
              <Button
                data-interactive="true"
                type="button"
                variant="outline"
                size="xs"
                disabled={branchCount >= 3}
                onClick={(e) => {
                  e.stopPropagation()
                  addBranch(nodeId)
                }}
                onPointerDown={(e) => e.stopPropagation()}
                className="rounded-[7px] border-dashed border-[#6366f1]/40 px-2 py-1 text-[10px] text-[#6366f1] hover:bg-[#6366f1]/5"
              >
                {branchCount >= 3 ? '최대 3개' : '+ 기사 추가'}
              </Button>
            </div>
            {versionIds.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {versionIds.map((vid, i) => {
                  const sel = selections[vid] as SelectionData | undefined
                  const label = sel?.selectedTitle
                    ? sel.selectedTitle.length > 12
                      ? sel.selectedTitle.slice(0, 12) + '…'
                      : sel.selectedTitle
                    : `비교 ${i + 1}`
                  return (
                    <Button
                      key={vid}
                      data-interactive="true"
                      type="button"
                      size="xs"
                      onClick={(e) => {
                        e.stopPropagation()
                        setActiveVersionId(vid)
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                      className={cn(
                        'rounded-[6px] px-2 py-1 text-[10px]',
                        activeVersionId === vid
                          ? 'bg-[#1D9E75] text-white'
                          : 'bg-[#f0f0ec] text-[#666] hover:bg-[#e8e8e4]'
                      )}
                      title={sel?.selectedTitle}
                    >
                      {label}
                    </Button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Article list */}
        <div className="flex flex-col gap-[5px]">
          {!query.trim() && articles.length === 0 && (
            <div className="rounded-[9px] border border-dashed border-black/12 bg-[#f9f9f7] px-3 py-6 text-center">
              <p className="text-[11px] text-[#999]">검색어를 입력하고 검색 버튼을 눌러보세요</p>
            </div>
          )}
          {loading && articles.length === 0 && (
            <div className="flex items-center justify-center py-4 text-[11px] text-[#999]">
              <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
              불러오는 중...
            </div>
          )}
          {!loading && query.trim() && articles.length === 0 && (
            <div className="rounded-[9px] border border-dashed border-black/12 bg-[#f9f9f7] px-3 py-6 text-center">
              <p className="text-[11px] text-[#999]">검색 결과가 없습니다</p>
            </div>
          )}

          {articles.map((article, idx) => {
            const isSelected = selectedTitle === article.title
            const isFetching = fetchingBody === article.title

            return (
              <div
                key={`${article.title}-${idx}`}
                className={cn(
                  'rounded-[9px] border px-2.5 py-[9px] transition-all',
                  isSelected
                    ? 'border-[#1D9E75] bg-[#E1F5EE]'
                    : 'border-black/8 hover:border-black/18 hover:bg-[#f9f9f7]',
                  isFetching && 'opacity-60'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div
                      className={cn(
                        'mb-[3px] text-[11px] leading-[1.4] font-medium',
                        isSelected ? 'text-[#085041]' : 'text-[#1a1a1a]'
                      )}
                    >
                      {article.title}
                    </div>
                    <div className="flex flex-wrap items-center gap-1 text-[10px] text-[#999]">
                      {isSelected && (
                        <span className="rounded-full bg-[#E1F5EE] px-[5px] py-px text-[9px] text-[#085041]">
                          ✓ 추가됨
                        </span>
                      )}
                      {isFetching && (
                        <Loader2 className="h-2.5 w-2.5 animate-spin text-[#1D9E75]" />
                      )}
                      <span>{article.source}</span>
                      <span>{formatRelativeTime(article.pubDate)}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      data-interactive="true"
                      size="xs"
                      onClick={async (e) => {
                        e.stopPropagation()
                        if (!isSelected) await handleSelect(article)
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                      disabled={isFetching}
                      className={cn(
                        'rounded-[6px] px-2 py-1 text-[10px]',
                        isSelected
                          ? 'cursor-default bg-[#1D9E75] text-white'
                          : 'bg-[#378ADD] text-white hover:bg-[#2b6cb5]'
                      )}
                    >
                      {isSelected ? '선택됨' : '선택'}
                    </Button>
                    <a
                      href={article.articleUrl || article.link || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-interactive="true"
                      onClick={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                      className="flex items-center gap-0.5 rounded-[6px] border border-black/12 bg-white px-2 py-1 text-[10px] text-[#666] no-underline hover:bg-[#f9f9f7]"
                    >
                      <ExternalLink className="h-2.5 w-2.5" />
                      기사 보기
                    </a>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </NodeShell>
  )
}
