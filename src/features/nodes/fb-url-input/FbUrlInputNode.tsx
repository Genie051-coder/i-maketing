'use client'

import { useState, type ChangeEvent, type KeyboardEvent } from 'react'
import { Link2, Pencil } from 'lucide-react'
import { Button } from '@/shared/ui/basic/button'
import { Input } from '@/shared/ui/basic/input'
import { useFlowStore } from '@/features/flow/store/useFlowStore'
import { NodeShell } from '../_shared/NodeShell'
import { cn } from '@/shared/libs/utils'
import type { FbNodeBaseProps } from '../_shared/fb-types'

interface FbUrlInputNodeProps extends FbNodeBaseProps {
  nodeId?: string
}

export function FbUrlInputNode({
  nodeId,
  data,
  validationErrors,
  validationWarnings,
  executionResult,
}: FbUrlInputNodeProps) {
  const nodes = useFlowStore((s) => s.nodes)
  const saveNodeConfig = useFlowStore((s) => s.saveNodeConfig)
  const setStepState = useFlowStore((s) => s.setStepState)

  const savedUrl = typeof data?.articleUrl === 'string' ? data.articleUrl : ''
  const [url, setUrl] = useState(savedUrl)

  const newsNode = nodes.find((n) => n.type === 'news-source')
  const newsData = newsNode?.data as
    | {
        selectedTitle?: string
        selectedUrl?: string
        selections?: Record<string, { selectedTitle?: string; selectedUrl?: string }>
      }
    | undefined
  // 버전별 selections 우선, 없으면 레거시 flat 데이터
  const mySelection = (
    nodeId && newsData?.selections
      ? (newsData.selections as Record<string, { selectedTitle?: string; selectedUrl?: string }>)[
          nodeId
        ]
      : undefined
  ) as { selectedTitle?: string; selectedUrl?: string } | undefined
  const selectedTitle = mySelection?.selectedTitle ?? newsData?.selectedTitle ?? ''
  const suggestedUrl = mySelection?.selectedUrl ?? newsData?.selectedUrl ?? ''

  const isDone = !!savedUrl

  const handleSave = async () => {
    const trimmed = url.trim()
    if (!nodeId || !trimmed) return
    await saveNodeConfig(nodeId, { articleUrl: trimmed })
    setStepState(nodeId, 'done')
  }

  return (
    <NodeShell
      icon={<Link2 className="h-[13px] w-[13px]" />}
      title="링크 입력"
      badgeLabel={isDone ? '완료' : '입력 필요'}
      isConfigured={isDone}
      validationErrors={validationErrors}
      validationWarnings={validationWarnings}
      executionResult={executionResult}
    >
      <div className="space-y-2">
        {/* Selected article hint + 이 기사 사용 */}
        {selectedTitle && suggestedUrl && (
          <div className="mb-2 rounded-[7px] border border-[#1D9E75]/30 bg-[#E1F5EE]/50 px-2.5 py-1.5">
            <p className="text-[9px] font-medium text-[#085041]">선택된 기사</p>
            <p className="line-clamp-1 text-[10px] text-[#1a1a1a]">{selectedTitle}</p>
            {!isDone && (
              <Button
                type="button"
                data-interactive="true"
                size="xs"
                onClick={async (e) => {
                  e.stopPropagation()
                  setUrl(suggestedUrl)
                  if (nodeId) {
                    await saveNodeConfig(nodeId, { articleUrl: suggestedUrl })
                    setStepState(nodeId, 'done')
                  }
                }}
                onPointerDown={(e) => e.stopPropagation()}
                className="mt-1.5 w-full rounded-[6px] bg-[#1D9E75] py-1.5 text-[10px] hover:bg-[#178B66]"
              >
                이 기사 사용
              </Button>
            )}
          </div>
        )}

        {/* URL zone */}
        <div
          className={cn(
            'rounded-[10px] border-[1.5px] border-dashed p-2.5',
            isDone ? 'border-[#1D9E75] bg-[#f9f9f7]' : 'border-[#378ADD] bg-[#EBF5FF]'
          )}
        >
          <p
            className={cn(
              'mb-[7px] flex items-center gap-[5px] text-[10px] font-medium',
              isDone ? 'text-[#085041]' : 'text-[#185FA5]'
            )}
          >
            <Link2 className="h-[10px] w-[10px]" />
            {isDone ? '링크 저장됨' : '기사 URL 붙여넣기'}
          </p>

          <Input
            data-interactive="true"
            value={url}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setUrl(e.target.value)}
            onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
              e.stopPropagation()
              if (e.key === 'Enter') handleSave()
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className={cn(
              'mb-1.5 h-auto rounded-[7px] px-[10px] py-[7px] text-[11px]',
              isDone ? 'border-black/8' : 'border-black/12 focus:border-[#378ADD]'
            )}
          />

          {!isDone && (
            <Button
              data-interactive="true"
              type="button"
              size="xs"
              onClick={(e) => {
                e.stopPropagation()
                handleSave()
              }}
              onPointerDown={(e) => e.stopPropagation()}
              disabled={!url.trim()}
              className={cn(
                'w-full rounded-[7px] py-[7px] text-[11px]',
                url.trim() ? 'bg-[#378ADD] hover:bg-[#2b6cb5]' : 'bg-[#e8e8e8] text-[#bbb]'
              )}
            >
              저장
            </Button>
          )}

          {isDone && (
            <div className="flex items-center justify-between gap-2">
              <p className="min-w-0 flex-1 truncate text-[10px] text-[#085041]">
                ✓ {savedUrl.length > 35 ? savedUrl.slice(0, 35) + '...' : savedUrl}
              </p>
              <Button
                data-interactive="true"
                type="button"
                variant="outline"
                size="xs"
                onClick={(e) => {
                  e.stopPropagation()
                  setUrl('')
                  if (nodeId) saveNodeConfig(nodeId, { articleUrl: '' })
                }}
                onPointerDown={(e) => e.stopPropagation()}
                className="shrink-0 rounded-[6px] border-[#378ADD] bg-[#E6F1FB] px-2 py-1 text-[10px] text-[#185FA5] hover:bg-[#d6e9fa]"
              >
                <Pencil className="h-3 w-3" />
                수정
              </Button>
            </div>
          )}
        </div>

        {!isDone && (
          <p className="mt-1.5 text-center text-[10px] text-[#bbb]">
            기사를 열어 주소창 URL을 복사 후 붙여넣으세요
          </p>
        )}
      </div>
    </NodeShell>
  )
}
