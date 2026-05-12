'use client'

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Image from 'next/image'
import { GripVertical, Trash2, ImageIcon, Play, Code2, Share2, Link2, Layout } from 'lucide-react'
import { EmailBlock, EmailFormData } from '../types'

export function renderBlockContent(block: EmailBlock, brandColor: string) {
  switch (block.type) {
    case 'Logo':
      return block.url ? (
        <div className="flex justify-center py-3">
          <Image
            src={block.url}
            alt="logo"
            width={block.width ? Math.min(block.width, 600) : 200}
            height={56}
            className="max-h-14 w-auto max-w-full object-contain"
            style={block.width ? { width: block.width, maxWidth: '100%' } : { maxWidth: '100%' }}
            unoptimized
          />
        </div>
      ) : (
        <div className="flex h-14 flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50">
          <ImageIcon className="h-5 w-5 text-gray-300" />
          <span className="mt-1 text-[10px] text-gray-400">로고 URL을 입력하세요</span>
        </div>
      )
    case 'Text': {
      const textClasses: Record<string, string> = {
        h1: 'text-3xl font-bold',
        h2: 'text-2xl font-bold',
        h3: 'text-xl font-semibold',
        h4: 'text-lg font-semibold',
        h5: 'text-base font-medium',
        h6: 'text-sm font-medium',
        body: 'text-sm leading-relaxed text-gray-700',
      }
      return (
        <p
          className={`whitespace-pre-line ${textClasses[block.level] ?? textClasses.body}`}
          style={block.level !== 'body' ? { color: brandColor } : {}}
        >
          {block.content || (
            <span className="text-gray-300 italic">텍스트 내용을 입력하세요...</span>
          )}
        </p>
      )
    }
    case 'Image':
      return block.url ? (
        <Image
          src={block.url}
          alt={block.alt || ''}
          width={800}
          height={450}
          className="max-h-48 w-full rounded object-cover"
          unoptimized
        />
      ) : (
        <div className="flex h-28 flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50">
          <ImageIcon className="h-7 w-7 text-gray-300" />
          <span className="mt-2 text-xs text-gray-400">이미지 URL을 입력하세요</span>
        </div>
      )
    case 'Button':
      return (
        <div className="flex justify-center py-2">
          <span
            className="cursor-default rounded px-6 py-2.5 text-sm font-bold text-white"
            style={{ backgroundColor: brandColor }}
          >
            {block.content || '버튼 텍스트'}
          </span>
        </div>
      )
    case 'Hr':
      return <hr className="border-gray-200" />
    case 'List':
      return block.style === 'numbered' ? (
        <ol className="list-decimal space-y-1 pl-6 text-sm text-gray-700">
          {(block.items.length ? block.items.filter(Boolean) : ['항목 예시']).map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ol>
      ) : (
        <ul className="list-disc space-y-1 pl-6 text-sm text-gray-700">
          {(block.items.length ? block.items.filter(Boolean) : ['항목 예시']).map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      )
    case 'TwoColumn':
      return (
        <div className="grid grid-cols-2 gap-3">
          <div className="min-h-[60px] rounded-lg border border-dashed border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
            {block.leftContent || <span className="text-gray-300">왼쪽 내용</span>}
          </div>
          <div className="min-h-[60px] rounded-lg border border-dashed border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
            {block.rightContent || <span className="text-gray-300">오른쪽 내용</span>}
          </div>
        </div>
      )
    case 'SnsShare':
      return (
        <div className="flex items-center justify-center gap-3 py-2">
          <span className="text-xs text-gray-400">공유하기:</span>
          {(block.platforms.length ? block.platforms : ['twitter', 'facebook', 'instagram']).map(
            (p) => (
              <div
                key={p}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-gray-50"
              >
                <Share2 className="h-3.5 w-3.5 text-gray-500" />
              </div>
            )
          )}
        </div>
      )
    case 'SnsLinks':
      return (
        <div className="flex items-center justify-center gap-2 py-2">
          {(block.links.length
            ? block.links
            : [
                { platform: 'instagram', url: '' },
                { platform: 'twitter', url: '' },
              ]
          ).map((l, i) => (
            <div
              key={i}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-gray-50"
              title={l.platform}
            >
              <Link2 className="h-3.5 w-3.5 text-gray-500" />
            </div>
          ))}
        </div>
      )
    case 'VideoPreview':
      return (
        <div className="relative flex h-36 items-center justify-center overflow-hidden rounded-lg bg-gray-800">
          {block.thumbnailUrl ? (
            <Image
              src={block.thumbnailUrl}
              alt={block.title || ''}
              fill
              className="object-cover opacity-60"
              unoptimized
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-gray-600 to-gray-900" />
          )}
          <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-white/90 shadow-lg">
            <Play className="ml-0.5 h-5 w-5 fill-current text-gray-800" />
          </div>
          {block.title && (
            <div className="absolute right-0 bottom-2 left-0 px-3 text-center text-xs font-medium text-white/90">
              {block.title}
            </div>
          )}
        </div>
      )
    case 'Html':
      return (
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
          <Code2 className="h-4 w-4 shrink-0 text-gray-400" />
          <pre className="flex-1 overflow-hidden text-xs text-ellipsis whitespace-nowrap text-gray-500">
            {block.code || '<-- HTML 코드 입력 -->'}
          </pre>
        </div>
      )
    case 'Footer':
      return (
        <div className="space-y-1 border-t border-gray-100 pt-4 text-center text-xs text-gray-400">
          {block.companyName && <p className="font-medium">{block.companyName}</p>}
          {block.address && <p>{block.address}</p>}
          <p className="cursor-default text-blue-400 underline">
            {block.unsubscribeUrl ? '수신거부' : '수신거부 링크'}
          </p>
        </div>
      )
    case 'Spacer':
      return (
        <div
          className="flex items-center justify-center rounded border border-dashed border-gray-200 bg-gray-50/50 text-xs text-gray-300"
          style={{ height: Math.max(block.height || 24, 12) }}
        >
          {block.height}px
        </div>
      )
    default:
      return null
  }
}

interface SortableBlockProps {
  block: EmailBlock
  brandColor: string
  isSelected: boolean
  onSelect: () => void
  onDelete: () => void
}

function SortableBlock({ block, brandColor, isSelected, onSelect, onDelete }: SortableBlockProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative ${isDragging ? 'opacity-60' : ''}`}
    >
      <div
        onClick={onSelect}
        className={`relative cursor-pointer rounded-lg border-2 transition-all ${
          isSelected
            ? 'border-indigo-400 shadow-[0_0_0_3px_rgba(99,102,241,0.12)]'
            : 'border-transparent hover:border-gray-200'
        }`}
      >
        {/* drag handle */}
        <div
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className={`absolute top-1/2 -left-6 flex h-5 w-5 -translate-y-1/2 cursor-grab items-center justify-center rounded text-gray-300 opacity-0 transition-opacity group-hover:opacity-100 hover:text-gray-500 active:cursor-grabbing ${isSelected ? 'opacity-100' : ''}`}
        >
          <GripVertical className="h-4 w-4" />
        </div>

        {/* delete button */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className={`absolute top-1/2 -right-6 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-gray-300 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-500 ${isSelected ? 'opacity-100' : ''}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>

        <div className="px-1 py-1">{renderBlockContent(block, brandColor)}</div>
      </div>
    </div>
  )
}

interface EmailDropZoneProps {
  emailForm: EmailFormData
  selectedBlockId: string | null
  onSelectBlock: (id: string | null) => void
  onUpdateBlocks: (blocks: EmailBlock[]) => void
  onDeleteBlock: (id: string) => void
}

export function EmailDropZone({
  emailForm,
  selectedBlockId,
  onSelectBlock,
  onUpdateBlocks,
  onDeleteBlock,
}: EmailDropZoneProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || !emailForm.blocks) return
    if (active.id !== over.id) {
      const oldIndex = emailForm.blocks.findIndex((b) => b.id === active.id)
      const newIndex = emailForm.blocks.findIndex((b) => b.id === over.id)
      onUpdateBlocks(arrayMove(emailForm.blocks, oldIndex, newIndex))
    }
  }

  const blocks = emailForm.blocks ?? []

  return (
    <div
      className="flex h-full min-h-0 flex-col overflow-hidden bg-[#EBEDF0]"
      onClick={() => onSelectBlock(null)}
    >
      <div className="flex-1 overflow-y-auto px-10 py-6">
        <div className="mx-auto max-w-[600px]">
          {/* Email canvas */}
          <div className="overflow-hidden rounded-xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.1)]">
            {/* Gmail-like header */}
            <div className="border-b border-gray-100 px-6 py-4">
              <h2 className="mb-3 text-lg font-normal text-gray-800">
                {emailForm.subject || <span className="text-gray-400">(제목 없음)</span>}
              </h2>
              <div className="flex items-center gap-2.5">
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                  style={{ backgroundColor: emailForm.brandColor || '#0f172a' }}
                >
                  {emailForm.fromName ? emailForm.fromName[0].toUpperCase() : 'P'}
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-800">
                    {emailForm.fromName || '발신자명'}
                  </span>
                </div>
              </div>
            </div>

            {/* Blocks area */}
            <div className="px-12 py-6" onClick={(e) => e.stopPropagation()}>
              {blocks.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 py-16 text-center">
                  <Layout className="mb-3 h-10 w-10 text-gray-200" />
                  <p className="text-sm font-medium text-gray-400">오른쪽에서 블록을 추가하거나</p>
                  <p className="text-sm text-gray-400">AI에게 초안 생성을 요청해보세요</p>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={blocks.map((b) => b.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3 pr-6 pl-6">
                      {blocks.map((block) => (
                        <SortableBlock
                          key={block.id}
                          block={block}
                          brandColor={emailForm.brandColor || '#0f172a'}
                          isSelected={selectedBlockId === block.id}
                          onSelect={() => onSelectBlock(block.id)}
                          onDelete={() => onDeleteBlock(block.id)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
