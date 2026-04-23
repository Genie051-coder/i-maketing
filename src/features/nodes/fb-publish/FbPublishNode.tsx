'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Send,
  Check,
  Loader2,
  ExternalLink,
  Share2,
  AlertTriangle,
  ArrowRight,
  Globe,
  ThumbsUp,
  MessageCircle,
} from 'lucide-react'
import { EmptyDescription } from '@/shared/ui/basic/empty'
import { NodeShell } from '../_shared/NodeShell'
import { useFlowStore } from '@/features/flow/store/useFlowStore'
import type { FbNodeBaseProps } from '../_shared/fb-types'
import { Button } from '@/shared/ui/basic/button'

type TokenRow = {
  id: string
  provider: string
  expiresAt: string | null
  metadata?: { pageId?: string; pageName?: string }
}

export function FbPublishNode({
  nodeId,
  data,
  validationErrors,
  validationWarnings,
  executionResult,
}: FbNodeBaseProps) {
  const router = useRouter()
  const nodes = useFlowStore((s) => s.nodes)
  const saveNodeConfig = useFlowStore((s) => s.saveNodeConfig)
  const setNodeStatus = useFlowStore((s) => s.setNodeStatus)
  const setStepState = useFlowStore((s) => s.setStepState)

  const postUrl = typeof data?.postUrl === 'string' ? data.postUrl : ''
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 같은 브랜치의 fb-preview (이 publish로 연결된 것)
  const previewNode =
    nodes.find((n) => n.type === 'fb-preview' && n.nextNodeId === nodeId) ??
    nodes.find((n) => n.type === 'fb-preview')
  const sourceData = (previewNode?.data ?? data) as
    | {
        content?: string
        hashtags?: string[]
        articleUrl?: string
        articleTitle?: string
        articleImage?: string
        pageName?: string
      }
    | undefined

  const { data: tokens = [], isLoading: tokensLoading } = useQuery<TokenRow[]>({
    queryKey: ['my-page', 'external-tokens'],
    queryFn: async () => {
      const res = await fetch('/api/user/tokens')
      if (!res.ok) throw new Error('Failed to fetch')
      return res.json()
    },
  })

  const fbToken = tokens.find((t) => t.provider === 'FACEBOOK')
  const hasFacebook = !!fbToken
  const fbPageName = (fbToken?.metadata as { pageName?: string } | undefined)?.pageName
  const fbPageId = (fbToken?.metadata as { pageId?: string } | undefined)?.pageId
  const content = sourceData?.content ?? ''
  const hashtags = Array.isArray(sourceData?.hashtags) ? (sourceData.hashtags as string[]) : []
  const articleUrl = sourceData?.articleUrl ?? ''
  const articleTitle = sourceData?.articleTitle ?? ''
  const articleImage = sourceData?.articleImage ?? ''
  const pageName = fbPageName ?? sourceData?.pageName ?? '페이지'

  const handlePublish = async () => {
    if (!nodeId || !content || !hasFacebook) return
    setPublishing(true)
    setError(null)
    setNodeStatus(nodeId, { status: 'running' })

    try {
      const res = await fetch('/api/facebook/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, hashtags, articleUrl }),
      })

      const resData = await res.json()
      if (!res.ok) {
        const errMsg = resData.error ?? '배포 실패'
        setNodeStatus(nodeId, { status: 'failed', message: errMsg })
        setError(errMsg)
        toast.error(errMsg)
        return
      }

      await saveNodeConfig(nodeId, {
        postUrl: resData.postUrl,
        postId: resData.postId,
        publishedAt: new Date().toISOString(),
      })
      setNodeStatus(nodeId, { status: 'success' })
      setStepState(nodeId, 'done')
    } catch {
      const errMsg = '배포 중 오류가 발생했습니다'
      setNodeStatus(nodeId, { status: 'failed', message: errMsg })
      setError(errMsg)
      toast.error(errMsg)
    } finally {
      setPublishing(false)
    }
  }

  const isDone = postUrl || executionResult?.status === 'success'
  const canPublish = hasFacebook && content.length > 0

  return (
    <NodeShell
      icon={<Send className="h-[13px] w-[13px]" />}
      title="배포"
      validationErrors={validationErrors}
      validationWarnings={validationWarnings}
      executionResult={executionResult}
    >
      {isDone ? (
        <div className="py-2 text-center">
          <div className="mx-auto mb-[9px] flex h-[38px] w-[38px] items-center justify-center rounded-full bg-[#E1F5EE]">
            <Check className="h-[18px] w-[18px] text-[#1D9E75]" strokeWidth={1.8} />
          </div>
          <div className="mb-0.5 text-[12px] font-medium text-[#1a1a1a]">페이스북 배포 완료!</div>
          <div className="mb-2.5 text-[10px] leading-normal text-[#999]">
            페이지에 게시됐습니다.
          </div>
          {postUrl && (
            <a
              href={postUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-interactive="true"
              className="inline-block rounded-[7px] bg-[#E6F1FB] px-3 py-1.5 text-[11px] text-[#185FA5] no-underline hover:bg-[#E6F1FB]/90"
            >
              <ExternalLink className="mr-1 inline h-3 w-3 align-middle" />
              페이스북에서 보기 →
            </a>
          )}
          <p className="mt-2 text-[10px] text-[#999]">
            다른 기사로 배포하려면 기사 선택에서 새로 검색하세요
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* 페이스북 연동 확인 */}
          <div className="space-y-1">
            <div className="py-2 text-[10px] font-medium text-[#666]">페이스북 연동</div>
            {tokensLoading ? (
              <div className="flex items-center gap-1.5 text-[10px] text-[#999]">
                <Loader2 className="h-3 w-3 animate-spin" />
                확인 중…
              </div>
            ) : hasFacebook ? (
              <div className="flex items-center gap-2 rounded-[6px] bg-gray-50 px-2 py-1.5">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#1877F2]/15">
                  <Share2 className="h-2.5 w-2.5 text-[#1877F2]" />
                </div>
                <p className="min-w-0 flex-1 truncate text-[10px] font-medium text-[#1a1a1a]">
                  Meta 연동됨
                </p>
                <Button
                  type="button"
                  data-interactive="true"
                  variant="ghost"
                  size="xs"
                  onClick={() => router.push('/my-page?tab=email-tokens')}
                  className="h-auto shrink-0 px-1 py-0 text-[9px] text-[#666] hover:text-[#1877F2]"
                >
                  변경
                </Button>
              </div>
            ) : (
              <div className="flex items-start gap-2 rounded-[6px] border border-amber-200 bg-amber-50 px-2 py-1.5">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-medium text-amber-800">연동되지 않음</p>
                  <Button
                    type="button"
                    data-interactive="true"
                    variant="ghost"
                    size="xs"
                    onClick={() => router.push('/my-page?tab=email-tokens')}
                    className="mt-1 h-auto px-0 py-0 text-[9px] text-amber-600 hover:text-amber-700"
                  >
                    마이페이지에서 연동하기
                    <ArrowRight className="h-2.5 w-2.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* 배포 대상 */}
          <div className="space-y-1">
            <div className="py-2 text-[10px] font-medium text-[#666]">배포 대상</div>
            {hasFacebook && (fbPageName || fbPageId) ? (
              <div className="flex items-center gap-2 rounded-[6px] border border-black/6 bg-white px-2 py-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1877F2] text-[10px] font-semibold text-white">
                  {(fbPageName ?? '페이지').charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-medium text-[#1a1a1a]">
                    {fbPageName ?? '페이스북 페이지'}
                  </p>
                  <p className="text-[9px] text-[#666]">여기에 게시됩니다</p>
                </div>
                {fbPageId && (
                  <a
                    href={`https://www.facebook.com/${fbPageId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-interactive="true"
                    className="flex shrink-0 items-center gap-0.5 rounded-[6px] bg-[#E6F1FB] px-2 py-1 text-[9px] text-[#185FA5] no-underline hover:bg-[#E6F1FB]/90"
                  >
                    페이지 보기
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                )}
              </div>
            ) : hasFacebook ? (
              <p className="text-[10px] text-[#666]">페이스북 페이지 정보를 불러오는 중…</p>
            ) : (
              <EmptyDescription className="text-[10px]">
                페이스북 연동 후 배포 대상이 표시됩니다
              </EmptyDescription>
            )}
          </div>

          {/* 최종 버전 */}
          <div className="space-y-1">
            <div className="py-2 text-[10px] font-medium text-[#666]">최종 버전</div>
            {content ? (
              <div className="rounded-[10px] border border-black/8 bg-white shadow-sm">
                {/* Page header (계정정보) */}
                <div className="flex items-center gap-2 border-b border-black/5 px-2.5 py-2">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1877F2] text-[9px] font-semibold text-white">
                    {pageName.charAt(0)}
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

                {/* Post content */}
                <div className="px-2.5 py-2">
                  <p className="text-[10px] leading-normal whitespace-pre-line text-[#1a1a1a]">
                    {content}
                  </p>

                  {/* Article link card */}
                  {articleUrl && (
                    <div className="mt-2 overflow-hidden rounded-[6px] border border-black/6">
                      {articleImage && (
                        <div className="relative aspect-[1.91/1] w-full overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={articleImage}
                            alt=""
                            className="absolute inset-0 h-full w-full object-cover"
                          />
                        </div>
                      )}
                      <div className="bg-[#f0f2f5] px-2 py-1.5">
                        <p className="text-[8px] font-medium tracking-wide text-[#65676b] uppercase">
                          {pageName}
                        </p>
                        <p className="mt-0.5 text-[9px] font-medium text-[#1a1a1a]">
                          {articleTitle || '기사 원문 보기'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Engagement bar */}
                <div className="flex border-t border-black/5">
                  <div className="flex flex-1 items-center justify-center gap-1 py-1.5 text-[9px] font-medium text-[#65676b]">
                    <ThumbsUp className="h-3 w-3" />
                    좋아요
                  </div>
                  <div className="flex flex-1 items-center justify-center gap-1 py-1.5 text-[9px] font-medium text-[#65676b]">
                    <MessageCircle className="h-3 w-3" />
                    댓글
                  </div>
                  <div className="flex flex-1 items-center justify-center gap-1 py-1.5 text-[9px] font-medium text-[#65676b]">
                    <Share2 className="h-3 w-3" />
                    공유
                  </div>
                </div>
              </div>
            ) : (
              <EmptyDescription className="text-[10px]">콘텐츠 승인 후 표시됩니다</EmptyDescription>
            )}
          </div>

          {/* 배포 버튼 */}
          {content && (
            <Button
              type="button"
              data-interactive="true"
              onClick={handlePublish}
              disabled={!canPublish || publishing}
              className="w-full rounded-[7px] bg-[#1877F2] py-2 text-[11px] hover:bg-[#1565c0]"
            >
              {publishing ? (
                <span className="flex items-center justify-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  배포 중...
                </span>
              ) : (
                '페이스북에 배포하기'
              )}
            </Button>
          )}
          {error && <p className="text-[10px] text-red-500">{error}</p>}
        </div>
      )}
    </NodeShell>
  )
}
