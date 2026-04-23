'use client'

import { GripVertical, Trash2, Plus, X } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/shared/ui/basic/button'
import { Input } from '@/shared/ui/basic/input'
import { Textarea } from '@/shared/ui/basic/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/basic/select'
import { EmailBlock, TextLevel, ListBlockStyle } from '../types'

interface EmailBlockItemProps {
  block: EmailBlock
  index: number
  onUpdateBlock: (index: number, newBlock: EmailBlock) => void
  onDeleteBlock: (index: number) => void
}

const BLOCK_TYPE_LABELS: Record<EmailBlock['type'], string> = {
  Logo: '로고',
  Text: '텍스트',
  Image: '이미지',
  Button: '버튼',
  List: '목록',
  Hr: '구분선',
  TwoColumn: '2단 레이아웃',
  SnsShare: 'SNS 공유',
  SnsLinks: 'SNS 링크',
  VideoPreview: '동영상 미리보기',
  Html: 'HTML 코드',
  Footer: '푸터',
  Spacer: '공백',
}

export function EmailBlockItem({
  block,
  index,
  onUpdateBlock,
  onDeleteBlock,
}: EmailBlockItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm ${isDragging ? 'opacity-80 ring-2 ring-indigo-400/40' : ''}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
        <div className="flex items-center gap-2">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab text-gray-300 hover:text-gray-500 active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4" />
          </div>
          <h3 className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
            {BLOCK_TYPE_LABELS[block.type]}
          </h3>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDeleteBlock(index)}
          className="h-7 w-7 text-gray-400 hover:bg-red-50 hover:text-red-500"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Block-specific editors */}
      {block.type === 'Logo' && (
        <div className="space-y-2.5">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">로고 이미지 URL</label>
            <Input
              type="url"
              value={block.url}
              onChange={(e) => onUpdateBlock(index, { ...block, url: e.target.value })}
              placeholder="https://..."
              className="w-full text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">너비 (px)</label>
              <Input
                type="number"
                min={20}
                max={600}
                value={block.width ?? 120}
                onChange={(e) =>
                  onUpdateBlock(index, {
                    ...block,
                    width: Number(e.target.value) || 120,
                  })
                }
                className="w-full text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                클릭 링크 (선택)
              </label>
              <Input
                type="url"
                value={block.link ?? ''}
                onChange={(e) =>
                  onUpdateBlock(index, {
                    ...block,
                    link: e.target.value || undefined,
                  })
                }
                placeholder="https://..."
                className="w-full text-sm"
              />
            </div>
          </div>
          {block.url && (
            <div className="flex justify-center rounded-lg border border-gray-100 bg-gray-50 p-2">
              <img
                src={block.url}
                alt="logo preview"
                className="object-contain"
                style={{
                  maxHeight: 48,
                  width: block.width ? `${block.width}px` : 'auto',
                  maxWidth: '100%',
                }}
              />
            </div>
          )}
        </div>
      )}

      {block.type === 'Text' && (
        <div className="space-y-2.5">
          <Select
            value={block.level}
            onValueChange={(v) => onUpdateBlock(index, { ...block, level: v as TextLevel })}
          >
            <SelectTrigger className="h-8 w-full text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="h1">H1 (대제목)</SelectItem>
              <SelectItem value="h2">H2 (중제목)</SelectItem>
              <SelectItem value="h3">H3 (소제목)</SelectItem>
              <SelectItem value="h4">H4</SelectItem>
              <SelectItem value="h5">H5</SelectItem>
              <SelectItem value="h6">H6</SelectItem>
              <SelectItem value="body">본문</SelectItem>
            </SelectContent>
          </Select>
          {block.level === 'body' ? (
            <Textarea
              value={block.content}
              onChange={(e) => onUpdateBlock(index, { ...block, content: e.target.value })}
              placeholder="내용을 입력하세요..."
              rows={4}
              className="w-full resize-none text-sm"
            />
          ) : (
            <Input
              value={block.content}
              onChange={(e) => onUpdateBlock(index, { ...block, content: e.target.value })}
              placeholder="제목을 입력하세요..."
              className="w-full text-sm"
            />
          )}
        </div>
      )}

      {block.type === 'Image' && (
        <div className="space-y-2.5">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">이미지 URL</label>
            <Input
              type="url"
              value={block.url}
              onChange={(e) => onUpdateBlock(index, { ...block, url: e.target.value })}
              placeholder="https://..."
              className="w-full text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">대체 텍스트</label>
            <Input
              value={block.alt}
              onChange={(e) => onUpdateBlock(index, { ...block, alt: e.target.value })}
              placeholder="이미지 설명"
              className="w-full text-sm"
            />
          </div>
        </div>
      )}

      {block.type === 'Button' && (
        <div className="space-y-2.5">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">버튼 텍스트</label>
            <Input
              value={block.content}
              onChange={(e) => onUpdateBlock(index, { ...block, content: e.target.value })}
              placeholder="버튼명"
              className="w-full text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">링크 URL</label>
            <Input
              type="url"
              value={block.url}
              onChange={(e) => onUpdateBlock(index, { ...block, url: e.target.value })}
              placeholder="https://..."
              className="w-full text-sm"
            />
          </div>
        </div>
      )}

      {block.type === 'List' && (
        <div className="space-y-2.5">
          <Select
            value={block.style}
            onValueChange={(v) => onUpdateBlock(index, { ...block, style: v as ListBlockStyle })}
          >
            <SelectTrigger className="h-8 w-full text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bullet">글머리 기호</SelectItem>
              <SelectItem value="numbered">번호 목록</SelectItem>
            </SelectContent>
          </Select>
          <Textarea
            value={block.items.join('\n')}
            onChange={(e) => {
              const items = e.target.value.split('\n')
              onUpdateBlock(index, { ...block, items })
            }}
            placeholder="항목 1&#10;항목 2&#10;항목 3"
            rows={4}
            className="w-full resize-none font-mono text-sm"
          />
        </div>
      )}

      {block.type === 'Hr' && (
        <div className="flex items-center justify-center py-2 opacity-50">
          <div className="h-px w-full bg-gray-300" />
        </div>
      )}

      {block.type === 'TwoColumn' && (
        <div className="space-y-2.5">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">왼쪽 내용</label>
            <Textarea
              value={block.leftContent}
              onChange={(e) => onUpdateBlock(index, { ...block, leftContent: e.target.value })}
              placeholder="왼쪽 컬럼 텍스트"
              rows={3}
              className="w-full resize-none text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">오른쪽 내용</label>
            <Textarea
              value={block.rightContent}
              onChange={(e) => onUpdateBlock(index, { ...block, rightContent: e.target.value })}
              placeholder="오른쪽 컬럼 텍스트"
              rows={3}
              className="w-full resize-none text-sm"
            />
          </div>
        </div>
      )}

      {block.type === 'SnsShare' && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-500">공유할 플랫폼 (쉼표로 구분)</label>
          <Input
            value={block.platforms.join(', ')}
            onChange={(e) =>
              onUpdateBlock(index, {
                ...block,
                platforms: e.target.value
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
            placeholder="twitter, facebook, instagram"
            className="w-full text-sm"
          />
          <p className="text-[10px] text-gray-400">
            사용 가능: twitter, facebook, instagram, linkedin, kakao
          </p>
        </div>
      )}

      {block.type === 'SnsLinks' && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-500">소셜 링크</label>
          <div className="space-y-2">
            {block.links.map((link, i) => (
              <div key={i} className="flex gap-1.5">
                <Input
                  value={link.platform}
                  onChange={(e) => {
                    const newLinks = [...block.links]
                    newLinks[i] = { ...link, platform: e.target.value }
                    onUpdateBlock(index, { ...block, links: newLinks })
                  }}
                  placeholder="플랫폼"
                  className="w-24 text-xs"
                />
                <Input
                  type="url"
                  value={link.url}
                  onChange={(e) => {
                    const newLinks = [...block.links]
                    newLinks[i] = { ...link, url: e.target.value }
                    onUpdateBlock(index, { ...block, links: newLinks })
                  }}
                  placeholder="https://..."
                  className="flex-1 text-xs"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    const newLinks = block.links.filter((_, idx) => idx !== i)
                    onUpdateBlock(index, { ...block, links: newLinks })
                  }}
                  className="h-8 w-8 shrink-0 text-gray-400 hover:text-red-500"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <button
              onClick={() =>
                onUpdateBlock(index, {
                  ...block,
                  links: [...block.links, { platform: '', url: '' }],
                })
              }
              className="flex items-center gap-1 text-xs text-indigo-500 hover:underline"
            >
              <Plus className="h-3 w-3" /> 링크 추가
            </button>
          </div>
        </div>
      )}

      {block.type === 'VideoPreview' && (
        <div className="space-y-2.5">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">동영상 URL</label>
            <Input
              type="url"
              value={block.videoUrl}
              onChange={(e) => onUpdateBlock(index, { ...block, videoUrl: e.target.value })}
              placeholder="https://youtube.com/watch?v=..."
              className="w-full text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              썸네일 URL (선택)
            </label>
            <Input
              type="url"
              value={block.thumbnailUrl || ''}
              onChange={(e) => onUpdateBlock(index, { ...block, thumbnailUrl: e.target.value })}
              placeholder="https://..."
              className="w-full text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">제목 (선택)</label>
            <Input
              value={block.title || ''}
              onChange={(e) => onUpdateBlock(index, { ...block, title: e.target.value })}
              placeholder="동영상 제목"
              className="w-full text-sm"
            />
          </div>
        </div>
      )}

      {block.type === 'Html' && (
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">HTML 코드</label>
          <Textarea
            value={block.code}
            onChange={(e) => onUpdateBlock(index, { ...block, code: e.target.value })}
            placeholder="<p>HTML 코드를 입력하세요</p>"
            rows={6}
            className="w-full resize-none font-mono text-xs"
          />
        </div>
      )}

      {block.type === 'Footer' && (
        <div className="space-y-2.5">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">회사명</label>
            <Input
              value={block.companyName || ''}
              onChange={(e) => onUpdateBlock(index, { ...block, companyName: e.target.value })}
              placeholder="회사명"
              className="w-full text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">주소</label>
            <Input
              value={block.address || ''}
              onChange={(e) => onUpdateBlock(index, { ...block, address: e.target.value })}
              placeholder="서울시 강남구 ..."
              className="w-full text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">수신거부 URL</label>
            <Input
              type="url"
              value={block.unsubscribeUrl || ''}
              onChange={(e) =>
                onUpdateBlock(index, {
                  ...block,
                  unsubscribeUrl: e.target.value,
                })
              }
              placeholder="https://..."
              className="w-full text-sm"
            />
          </div>
        </div>
      )}

      {block.type === 'Spacer' && (
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">높이 (px)</label>
          <Input
            type="number"
            min={4}
            max={200}
            value={block.height}
            onChange={(e) =>
              onUpdateBlock(index, {
                ...block,
                height: Number(e.target.value) || 24,
              })
            }
            className="w-full text-sm"
          />
        </div>
      )}
    </div>
  )
}
