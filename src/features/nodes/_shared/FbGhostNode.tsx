import { Newspaper, Sparkles, Eye, Send, Link2, Lock } from 'lucide-react'
import { NODE_BODY_WIDTH } from '@/features/flow/constants'

type GhostType = 'news-source' | 'fb-url-input' | 'fb-summary' | 'fb-preview' | 'fb-publish'

export function FbGhostNode({ type }: { type: GhostType }) {
  const meta = getGhostMeta(type)

  return (
    <div
      className="pointer-events-none rounded-[14px] border border-black/10 bg-white opacity-40"
      style={{ width: NODE_BODY_WIDTH }}
    >
      <div className="overflow-hidden rounded-[14px]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-black/6 px-3.5 py-2.5">
          <div className="flex items-center gap-[7px]">
            <div className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md bg-[#f0f0ec] text-[#ccc]">
              {meta.icon}
            </div>
            <span className="text-xs font-medium text-[#bbb]">{meta.title}</span>
          </div>
          <span className="rounded-full bg-[#f0f0ec] px-[7px] py-0.5 text-[10px] whitespace-nowrap text-[#888]">
            <Lock className="mr-1 inline h-3 w-3 align-middle" />
            선행 필요
          </span>
        </div>

        {/* Body */}
        <div className="p-3.5">
          <p className="mb-2 text-[10px] leading-relaxed text-[#999]">{meta.hint}</p>
          {type === 'news-source' && <NewsSourceSkeleton />}
          {type === 'fb-url-input' && <UrlInputSkeleton />}
          {type === 'fb-summary' && <SummarySkeleton />}
          {type === 'fb-preview' && <PreviewSkeleton />}
          {type === 'fb-publish' && <PublishSkeleton />}
        </div>
      </div>
    </div>
  )
}

function getGhostMeta(type: GhostType): { title: string; hint: string; icon: React.ReactNode } {
  switch (type) {
    case 'news-source':
      return {
        title: '기사 선택',
        hint: '먼저 기사 선택 단계에서 기사를 선택해주세요.',
        icon: <Newspaper className="h-[13px] w-[13px]" />,
      }
    case 'fb-url-input':
      return {
        title: '링크 입력',
        hint: '기사 선택을 완료하면 여기에 URL 입력 단계가 활성화됩니다.',
        icon: <Link2 className="h-[13px] w-[13px]" />,
      }
    case 'fb-summary':
      return {
        title: 'AI 콘텐츠 생성',
        hint: '링크 입력에서 URL을 저장하면 AI 콘텐츠 생성을 진행할 수 있어요.',
        icon: <Sparkles className="h-[13px] w-[13px]" />,
      }
    case 'fb-preview':
      return {
        title: '콘텐츠 검증',
        hint: 'AI 콘텐츠 생성을 완료하면 콘텐츠 검증에서 승인할 수 있어요.',
        icon: <Eye className="h-[13px] w-[13px]" />,
      }
    case 'fb-publish':
      return {
        title: '배포',
        hint: '콘텐츠 검증에서 승인하면 배포 단계가 활성화됩니다.',
        icon: <Send className="h-[13px] w-[13px]" />,
      }
  }
}

function NewsSourceSkeleton() {
  return (
    <div className="space-y-2">
      <div className="flex h-7 gap-[5px]">
        <div className="h-full flex-1 rounded-[7px] bg-[#ebebeb]" />
        <div className="h-full w-[56px] rounded-[7px] bg-[#e0e0e0]" />
      </div>
      <div className="space-y-[5px]">
        <div className="h-9 rounded-[9px] bg-[#f9f9f7]" />
        <div className="h-9 rounded-[9px] bg-[#f9f9f7]" />
        <div className="h-9 rounded-[9px] bg-[#f9f9f7]" />
      </div>
    </div>
  )
}

function UrlInputSkeleton() {
  return (
    <div className="rounded-[10px] bg-[#f9f9f7] p-2.5">
      <div className="mb-2 h-[6px] w-16 rounded-full bg-[#e0e0e0]" />
      <div className="mb-1.5 h-7 rounded-[7px] bg-[#ebebeb]" />
      <div className="h-7 rounded-[7px] bg-[#e0e0e0]" />
    </div>
  )
}

function SummarySkeleton() {
  return (
    <div className="space-y-2">
      <div className="rounded-[9px] bg-[#f9f9f7] p-2.5">
        <div className="mb-2 h-[6px] w-10 rounded-full bg-[#e0e0e0]" />
        <div className="space-y-[5px]">
          <div className="h-[7px] w-[90%] rounded-full bg-[#ebebeb]" />
          <div className="h-[7px] w-[75%] rounded-full bg-[#ebebeb]" />
          <div className="h-[7px] w-[60%] rounded-full bg-[#ebebeb]" />
        </div>
      </div>
      <div className="flex gap-[5px]">
        <div className="h-7 flex-1 rounded-[7px] bg-[#ebebeb]" />
        <div className="h-7 flex-1 rounded-[7px] bg-[#dceeff]" />
      </div>
    </div>
  )
}

function PreviewSkeleton() {
  return (
    <div className="space-y-2">
      <div className="rounded-[10px] bg-[#f9f9f7] p-2.5">
        <div className="mb-2 flex items-center gap-[7px] border-b border-black/5 pb-[7px]">
          <div className="h-[26px] w-[26px] shrink-0 rounded-full bg-[#e0e0e0]" />
          <div>
            <div className="mb-[3px] h-2 w-[70px] rounded-full bg-[#e0e0e0]" />
            <div className="h-1.5 w-[45px] rounded-full bg-[#ebebeb]" />
          </div>
        </div>
        <div className="space-y-1">
          <div className="h-[7px] w-[90%] rounded-full bg-[#ebebeb]" />
          <div className="h-[7px] w-[75%] rounded-full bg-[#ebebeb]" />
          <div className="h-[7px] w-[55%] rounded-full bg-[#ebebeb]" />
          <div className="h-[7px] w-[80%] rounded-full bg-[#ebebeb]" />
        </div>
        <div className="mt-1 h-[7px] w-[110px] rounded-full bg-[#dceeff]" />
      </div>
      <div className="flex gap-[5px]">
        <div className="h-7 flex-1 rounded-[7px] bg-[#ebebeb]" />
        <div className="h-7 flex-1 rounded-[7px] bg-[#dceeff]" />
      </div>
    </div>
  )
}

function PublishSkeleton() {
  return (
    <div className="flex flex-col items-center py-2">
      <div className="mb-2 h-9 w-9 rounded-full bg-[#ebebeb]" />
      <div className="mb-1 h-[7px] w-[70px] rounded-full bg-[#ebebeb]" />
      <div className="mb-1 h-[7px] w-[100px] rounded-full bg-[#ebebeb]" />
      <div className="h-[7px] w-[80px] rounded-full bg-[#ebebeb]" />
    </div>
  )
}
