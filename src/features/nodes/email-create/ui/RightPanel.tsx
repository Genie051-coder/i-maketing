'use client'

import { useState, useEffect } from 'react'
import {
  Type,
  ImageIcon,
  Columns2,
  Minus,
  Share2,
  Link2,
  Play,
  Code2,
  PanelBottom,
  MousePointerClick,
  List,
  Plus,
  Sparkles,
  Pencil,
  AlignVerticalSpaceBetween,
  Hexagon,
} from 'lucide-react'
import { EmailBlock, EmailFormData, RightPanelMode, EditTab } from '../types'
import { EmailBlockItem } from './EmailBlockItem'
import { EmailAiAssistant } from './EmailAiAssistant'
import type { PlatformOption } from '@/shared/ui/chat/constants'
import type { UIMessage } from 'ai'
import type { CampaignType, CampaignTypeOption } from '../../email-campaign-purpose/constants'

type BrandKit = {
  logoUrl?: string | null
  primaryColor?: string | null
  senderName?: string | null
  senderEmail?: string | null
  tone?: string | null
  feeling?: string | null
}

const BLOCK_TYPES: {
  type: EmailBlock['type']
  label: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: any
  desc: string
}[] = [
  { type: 'Logo', label: '로고', icon: Hexagon, desc: '브랜드 로고 이미지' },
  { type: 'Text', label: '텍스트', icon: Type, desc: '제목 또는 본문' },
  { type: 'Image', label: '이미지', icon: ImageIcon, desc: 'URL 이미지 삽입' },
  { type: 'Button', label: '버튼', icon: MousePointerClick, desc: 'CTA 버튼' },
  { type: 'Hr', label: '구분선', icon: Minus, desc: '가로 구분선' },
  { type: 'List', label: '목록', icon: List, desc: '글머리 / 번호 목록' },
  { type: 'TwoColumn', label: '2단', icon: Columns2, desc: '2컬럼 레이아웃' },
  { type: 'SnsShare', label: 'SNS 공유', icon: Share2, desc: '소셜 공유 버튼' },
  { type: 'SnsLinks', label: 'SNS 링크', icon: Link2, desc: '소셜 계정 링크' },
  {
    type: 'VideoPreview',
    label: '동영상',
    icon: Play,
    desc: '동영상 미리보기',
  },
  { type: 'Html', label: 'HTML 코드', icon: Code2, desc: '직접 HTML 삽입' },
  {
    type: 'Footer',
    label: '푸터',
    icon: PanelBottom,
    desc: '회사 정보 / 수신거부',
  },
  {
    type: 'Spacer',
    label: '공백',
    icon: AlignVerticalSpaceBetween,
    desc: '여백 블록',
  },
]

interface RightPanelProps {
  emailForm: EmailFormData
  onFormChange: (updates: Partial<EmailFormData>) => void
  brandKit: BrandKit | null
  onApplyBrandKit: () => void
  campaignType: CampaignType | null
  campaignInfo: CampaignTypeOption | null
  onApplyTemplate: () => void
  selectedBlockId: string | null
  onSelectBlock: (id: string | null) => void
  onAddBlock: (type: string) => void
  onUpdateBlock: (index: number, block: EmailBlock) => void
  onDeleteBlock: (id: string) => void
  // AI
  messages: UIMessage[]
  aiStatus: 'streaming' | 'submitted' | 'ready' | 'error'
  aiError: Error | undefined
  onAiSend: (text: string) => void
  availablePlatforms?: PlatformOption[]
  selectedModel?: string
  onSelectedModelChange?: (value: string) => void
}

export function RightPanel({
  emailForm,
  onFormChange,
  selectedBlockId,
  onSelectBlock,
  onAddBlock,
  onUpdateBlock,
  onDeleteBlock,
  brandKit,
  onApplyBrandKit,
  campaignType,
  campaignInfo,
  onApplyTemplate,
  messages,
  aiStatus,
  aiError,
  onAiSend,
  availablePlatforms,
  selectedModel,
  onSelectedModelChange,
}: RightPanelProps) {
  const [rightMode, setRightMode] = useState<RightPanelMode>('edit')
  const [editTab, setEditTab] = useState<EditTab>('add')

  const selectedBlock = selectedBlockId
    ? (emailForm.blocks?.find((b) => b.id === selectedBlockId) ?? null)
    : null

  const selectedIndex = selectedBlockId
    ? (emailForm.blocks?.findIndex((b) => b.id === selectedBlockId) ?? -1)
    : -1

  // Auto-switch to editBlock tab when a block is selected
  useEffect(() => {
    if (selectedBlockId) {
      setEditTab('editBlock')
    }
  }, [selectedBlockId])

  const hasBlocks = (emailForm.blocks?.length ?? 0) > 0

  return (
    <div className="flex h-full min-h-0 flex-col border-l border-gray-200 bg-white">
      {/* Campaign type badge */}
      {campaignInfo && (
        <div className={`shrink-0 border-b px-3 py-2 ${campaignInfo.iconBg} border-gray-100`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <campaignInfo.icon className={`h-3.5 w-3.5 ${campaignInfo.iconColor}`} />
              <span className={`text-xs font-semibold ${campaignInfo.iconColor}`}>
                {campaignInfo.label}
              </span>
              <span className="text-[10px] text-gray-400">{campaignInfo.description}</span>
            </div>
            {!hasBlocks && (
              <button
                onClick={onApplyTemplate}
                className="rounded-md bg-white/80 px-2 py-1 text-[11px] font-semibold text-gray-700 shadow-sm transition-all hover:bg-white hover:shadow active:scale-95"
              >
                템플릿 적용
              </button>
            )}
          </div>
        </div>
      )}

      {/* Mode toggle */}
      <div className="shrink-0 border-b border-gray-100 p-2">
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
          <button
            onClick={() => setRightMode('edit')}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
              rightMode === 'edit'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Pencil className="h-3 w-3" />
            편집
          </button>
          <button
            onClick={() => setRightMode('ai')}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
              rightMode === 'ai'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Sparkles className="h-3 w-3" />
            AI 채팅
          </button>
        </div>
      </div>

      {/* Edit panel */}
      {rightMode === 'edit' && (
        <div className="flex min-h-0 flex-1 flex-col">
          {/* Sub-tabs */}
          <div className="flex shrink-0 border-b border-gray-100">
            <button
              onClick={() => setEditTab('add')}
              className={`flex flex-1 items-center justify-center gap-1 py-2.5 text-xs font-semibold transition-colors ${
                editTab === 'add'
                  ? 'border-b-2 border-indigo-500 text-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Plus className="h-3 w-3" />
              블록 추가
            </button>
            <button
              onClick={() => selectedBlock && setEditTab('editBlock')}
              className={`flex flex-1 items-center justify-center gap-1 py-2.5 text-xs font-semibold transition-colors ${
                editTab === 'editBlock'
                  ? 'border-b-2 border-indigo-500 text-indigo-600'
                  : selectedBlock
                    ? 'text-gray-500 hover:text-gray-700'
                    : 'cursor-not-allowed text-gray-300'
              }`}
            >
              블록 편집
              {selectedBlock && (
                <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-600">
                  ✓
                </span>
              )}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Block library */}
            {editTab === 'add' && (
              <div className="p-3">
                <p className="mb-2.5 text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                  블록 타입 선택
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {BLOCK_TYPES.map((b) => {
                    const Icon = b.icon
                    return (
                      <button
                        key={b.type}
                        onClick={() => onAddBlock(b.type)}
                        className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-2 text-left transition-all hover:border-indigo-200 hover:bg-indigo-50 active:scale-95"
                      >
                        <Icon className="h-4 w-4 shrink-0 text-gray-500" />
                        <div>
                          <p className="text-xs font-semibold text-gray-700">{b.label}</p>
                          <p className="text-[10px] text-gray-400">{b.desc}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>

                {/* Email settings */}
                <div className="mt-4 border-t border-gray-100 pt-4">
                  <p className="mb-2.5 text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                    이메일 설정
                  </p>

                  {/* Brand kit card */}
                  {brandKit ? (
                    <div className="mb-3 overflow-hidden rounded-lg border border-indigo-100 bg-indigo-50">
                      <div className="flex items-center justify-between px-3 py-2">
                        <div className="flex items-center gap-2">
                          {brandKit.logoUrl ? (
                            <img
                              src={brandKit.logoUrl}
                              alt="logo"
                              className="h-5 w-5 rounded object-contain"
                            />
                          ) : (
                            <div
                              className="h-5 w-5 rounded"
                              style={{
                                backgroundColor: brandKit.primaryColor ?? '#0f172a',
                              }}
                            />
                          )}
                          <div>
                            <p className="text-xs font-semibold text-indigo-700">브랜드 키트</p>
                            <div className="flex items-center gap-1">
                              {brandKit.primaryColor && (
                                <span
                                  className="inline-block h-2.5 w-2.5 rounded-full border border-white shadow-sm"
                                  style={{
                                    backgroundColor: brandKit.primaryColor,
                                  }}
                                />
                              )}
                              <span className="text-[10px] text-indigo-400">
                                {brandKit.primaryColor ?? '색상 미설정'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={onApplyBrandKit}
                          className="rounded-md bg-indigo-600 px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-indigo-700 active:scale-95"
                        >
                          적용
                        </button>
                      </div>
                      <div className="border-t border-indigo-100 bg-white/50 px-3 py-1.5 text-[10px] text-indigo-400">
                        <span>색상·로고{brandKit.senderName ? '·발신자명' : ''} 자동 적용</span>
                        {(brandKit.tone || brandKit.feeling) && (
                          <span className="ml-1.5 inline-flex items-center gap-1">
                            {brandKit.tone && (
                              <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[9px] font-semibold text-indigo-500 uppercase">
                                {brandKit.tone}
                              </span>
                            )}
                            {brandKit.feeling && (
                              <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[9px] font-semibold text-purple-500 uppercase">
                                {brandKit.feeling}
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <a
                      href="/my-page?tab=brand-kit"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mb-3 flex items-center gap-2 rounded-lg border border-dashed border-gray-200 px-3 py-2.5 text-xs text-gray-400 transition-colors hover:border-indigo-200 hover:text-indigo-500"
                    >
                      <span className="text-base">🎨</span>
                      <span>
                        브랜드 키트를 등록하면 색상·로고를
                        <br />
                        자동으로 불러올 수 있어요
                      </span>
                    </a>
                  )}
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">제목</label>
                      <input
                        type="text"
                        value={emailForm.subject ?? ''}
                        onChange={(e) => onFormChange({ subject: e.target.value })}
                        className="w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-xs outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-100"
                        placeholder="이메일 제목"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">
                        미리보기 텍스트
                      </label>
                      <input
                        type="text"
                        value={emailForm.previewText ?? ''}
                        onChange={(e) => onFormChange({ previewText: e.target.value })}
                        className="w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-xs outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-100"
                        placeholder="수신함에서 보이는 미리보기"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">
                        발신자명
                      </label>
                      <input
                        type="text"
                        value={emailForm.fromName ?? ''}
                        onChange={(e) => onFormChange({ fromName: e.target.value })}
                        className="w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-xs outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-100"
                        placeholder="발신자 이름"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">
                        브랜드 색상
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={emailForm.brandColor || '#0f172a'}
                          onChange={(e) => onFormChange({ brandColor: e.target.value })}
                          className="h-8 w-10 cursor-pointer rounded border border-gray-200 bg-transparent p-0.5"
                        />
                        <input
                          type="text"
                          value={emailForm.brandColor || ''}
                          onChange={(e) => onFormChange({ brandColor: e.target.value })}
                          className="flex-1 rounded-md border border-gray-200 px-2.5 py-1.5 font-mono text-xs uppercase outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-100"
                          placeholder="#000000"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Block editor */}
            {editTab === 'editBlock' && (
              <div className="p-3">
                {selectedBlock && selectedIndex >= 0 ? (
                  <EmailBlockItem
                    block={selectedBlock}
                    index={selectedIndex}
                    onUpdateBlock={onUpdateBlock}
                    onDeleteBlock={(idx) => {
                      const block = emailForm.blocks[idx]
                      if (block) {
                        onDeleteBlock(block.id)
                        onSelectBlock(null)
                        setEditTab('add')
                      }
                    }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="mb-3 text-3xl">👆</div>
                    <p className="text-sm text-gray-400">왼쪽 미리보기에서</p>
                    <p className="text-sm text-gray-400">블록을 클릭하면 편집할 수 있어요</p>
                    <button
                      onClick={() => setEditTab('add')}
                      className="mt-4 text-xs text-indigo-500 hover:underline"
                    >
                      블록 추가하기 →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI panel */}
      {rightMode === 'ai' && (
        <EmailAiAssistant
          className="min-h-0 flex-1"
          messages={messages}
          status={aiStatus}
          error={aiError}
          onSend={onAiSend}
          availablePlatforms={availablePlatforms}
          selectedModel={selectedModel}
          onSelectedModelChange={onSelectedModelChange}
        />
      )}
    </div>
  )
}
