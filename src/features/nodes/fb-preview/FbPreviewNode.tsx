'use client'

import { Eye, Globe, ThumbsUp, MessageCircle, Share2, Pencil } from 'lucide-react'
import { EmptyDescription } from '@/shared/ui/basic/empty'
import { Button } from '@/shared/ui/basic/button'
import { NodeShell } from '../_shared/NodeShell'
import { useFlowStore } from '@/features/flow/store/useFlowStore'
import type { FbNodeBaseProps } from '../_shared/fb-types'

export function FbPreviewNode({
  nodeId,
  data,
  validationErrors,
  validationWarnings,
  executionResult,
}: FbNodeBaseProps) {
  const saveNodeConfig = useFlowStore((s) => s.saveNodeConfig)
  const setNodeStatus = useFlowStore((s) => s.setNodeStatus)
  const setStepState = useFlowStore((s) => s.setStepState)
  const content = typeof data?.content === 'string' ? data.content : ''
  const approved = data?.approved === true
  const hashtags = Array.isArray(data?.hashtags) ? (data.hashtags as string[]) : []
  const articleUrl = typeof data?.articleUrl === 'string' ? data.articleUrl : ''
  const articleTitle = typeof data?.articleTitle === 'string' ? data.articleTitle : ''
  const articleImage = typeof data?.articleImage === 'string' ? data.articleImage : ''
  const pageName = typeof data?.pageName === 'string' ? data.pageName : '페이지'

  return (
    <NodeShell
      icon={<Eye className="h-[13px] w-[13px]" />}
      title="콘텐츠 검증"
      validationErrors={validationErrors}
      validationWarnings={validationWarnings}
      executionResult={executionResult}
    >
      {content ? (
        <>
          {/* 페이스북 포스트 미리보기 (실제 UI와 동일) */}
          <div className="overflow-hidden rounded-[10px] border border-black/8 bg-white shadow-sm">
            {/* Page header */}
            <div className="flex items-center gap-2 border-b border-black/5 px-2.5 py-2">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1877F2] text-[9px] font-semibold text-white">
                {pageName.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[10px] font-semibold text-[#1a1a1a]">{pageName} 공식</p>
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

              {/* Article link card (페이스북 링크 미리보기) */}
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

          {/* 승인 / 수정 / 바로 배포 버튼 */}
          <div className="mt-2 flex gap-1">
            {!approved ? (
              <>
                <Button
                  type="button"
                  data-interactive="true"
                  size="xs"
                  onClick={async () => {
                    if (!nodeId || !content) return
                    await saveNodeConfig(nodeId, {
                      content,
                      hashtags,
                      articleUrl,
                      pageName,
                      articleTitle: articleTitle || undefined,
                      articleImage: articleImage || undefined,
                      approved: true,
                    })
                    setNodeStatus(nodeId, { status: 'success' })
                    setStepState(nodeId, 'done')
                  }}
                  className="flex-1 rounded-[7px] bg-[#1877F2] py-1.5 text-[10px] hover:bg-[#1565c0]"
                >
                  승인 →
                </Button>
              </>
            ) : (
              <Button
                type="button"
                data-interactive="true"
                variant="outline"
                size="xs"
                onClick={async () => {
                  if (!nodeId) return
                  await saveNodeConfig(nodeId, {
                    content,
                    hashtags,
                    articleUrl,
                    pageName,
                    articleTitle: articleTitle || undefined,
                    articleImage: articleImage || undefined,
                    approved: false,
                  })
                  setNodeStatus(nodeId, { status: 'idle' })
                  setStepState(nodeId, 'editing')
                }}
                className="flex-1 rounded-[7px] border-[#378ADD] bg-[#E6F1FB] py-1.5 text-[10px] text-[#185FA5] hover:bg-[#d6e9fa]"
              >
                <Pencil className="h-3 w-3" />
                수정
              </Button>
            )}
          </div>
        </>
      ) : (
        <EmptyDescription className="text-[11px]">
          AI 콘텐츠 생성을 완료하면 여기에 미리보기가 표시됩니다
        </EmptyDescription>
      )}
    </NodeShell>
  )
}
