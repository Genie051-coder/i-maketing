'use client'

import { useState, FormEvent, useEffect, useRef } from 'react'
import Image from 'next/image'
import { Button } from '@/shared/ui/basic/button'
import {
  ArrowUp,
  Loader2,
  X,
  FileIcon,
  Plus,
  LayoutGrid,
  ChevronDown,
  ChevronRight,
  KeyRound,
} from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { PLATFORMS, getDefaultSelectedModel, type PlatformOption } from '@/shared/ui/chat/constants'
import openAiIcon from '@/shared/assets/openAi.svg'
import geminiIcon from '@/shared/assets/gemini.svg'
import anthropicIcon from '@/shared/assets/anthropic.svg'

const PLATFORM_ICONS: Record<string, string> = {
  openai: openAiIcon as string,
  google: geminiIcon as string,
  anthropic: anthropicIcon as string,
}

/** 선택된 모델 표시명 (플랫폼 목록 기준) */
function getSelectedDisplay(
  platforms: readonly PlatformOption[],
  platformId: string,
  modelId: string
): string {
  const platform = platforms.find((p) => p.id === platformId)
  const model = platform?.models.find((m) => m.id === modelId)
  return model?.name ?? '모델 선택'
}

function getTextModels(platform: PlatformOption) {
  return platform.models.filter((m) => m.kind === 'text')
}
function getImageModels(platform: PlatformOption) {
  return platform.models.filter((m) => m.kind === 'image')
}

interface ChatInputProps {
  onSendMessage?: (message: string, agentId?: string) => void
  disabled?: boolean
  upload?: boolean
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
  /** 도구 버튼 클릭 시 (선택) */
  onToolsClick?: () => void
  /** 모델/에이전트 드롭다운 표시 여부 */
  showModelDropdown?: boolean
  /** 마이페이지에 등록된 키 기준 플랫폼만 표시 (없으면 전체 PLATFORMS) */
  availablePlatforms?: PlatformOption[]
  /** 선택된 모델 "platformId:modelId" (controlled) */
  selectedModel?: string
  /** 모델 변경 시 (controlled일 때 사용) */
  onSelectedModelChange?: (value: string) => void
}

export function ChatInput({
  onSendMessage,
  disabled = false,
  upload = false,
  placeholder = '시작할 캠페인의 제목을 입력해주세요.',
  value: externalValue,
  onChange: externalOnChange,
  onToolsClick,
  showModelDropdown = false,
  availablePlatforms,
  selectedModel: controlledSelectedModel,
  onSelectedModelChange,
}: ChatInputProps) {
  const [internalInput, setInternalInput] = useState('')
  const input = externalValue !== undefined ? externalValue : internalInput
  const platforms = availablePlatforms ?? PLATFORMS
  const defaultForPlatforms = getDefaultSelectedModel(platforms)
  const [internalSelected, setInternalSelected] = useState<string>(defaultForPlatforms)
  const isControlled = controlledSelectedModel !== undefined
  const selectedAgent = isControlled ? controlledSelectedModel : internalSelected
  const setSelectedAgent = (value: string) => {
    if (!isControlled) setInternalSelected(value)
    onSelectedModelChange?.(value)
  }
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [expandedPlatformId, setExpandedPlatformId] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const [selectedPlatformId, selectedModelId] = selectedAgent.includes(':')
    ? selectedAgent.split(':')
    : ['', '']

  const t = useTranslations('aiAssistant')
  const noModelsRegistered = showModelDropdown && platforms.length === 0

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop: (acceptedFiles) => {
      setUploadedFiles((prev) => [...prev, ...acceptedFiles])
    },
    noClick: true,
    noKeyboard: true,
    disabled,
  })

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
        setExpandedPlatformId(null)
      }
    }
    if (dropdownOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [dropdownOpen])

  // 등록된 플랫폼만 쓰는 모드에서 플랫폼 목록이 바뀌면 기본 선택 동기화 (uncontrolled일 때)
  useEffect(() => {
    if (isControlled || platforms.length === 0) return
    const [pid, mid] = selectedAgent.split(':')
    const exists = platforms.some((p) => p.id === pid && p.models.some((m) => m.id === mid))
    if (!exists) setInternalSelected(getDefaultSelectedModel(platforms))
  }, [platforms, isControlled, selectedAgent])

  const setInput = (value: string) => {
    if (externalOnChange) {
      externalOnChange(value)
    } else {
      setInternalInput(value)
    }
  }

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!input.trim() || disabled) return

    onSendMessage?.(input, selectedAgent)
    setInput('')
    setUploadedFiles([])
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (input.trim() && !disabled) {
        onSendMessage?.(input, selectedAgent)
        setInput('')
        setUploadedFiles([])
      }
    }
  }

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <form
      {...getRootProps()}
      onSubmit={handleSubmit}
      className={`relative flex flex-col gap-2 rounded-[28px] border ${
        isDragActive ? 'border-spacing-0.5 border-dashed border-emerald-400' : 'border-gray-300'
      } bg-white p-2 shadow-sm transition-all focus-within:border-gray-400`}
    >
      <input {...getInputProps()} />

      {upload && (
        <>
          {/* Drag Overlay */}
          {isDragActive && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[28px] backdrop-blur-sm">
              <div className="flex flex-col items-center gap-2 text-emerald-500">
                <FileIcon />
                <p className="text-sm font-medium">파일이 여기 나타납니다.</p>
              </div>
            </div>
          )}

          {/* Uploaded Files Display */}
          {uploadedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 px-3 pt-2">
              {uploadedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-1.5 text-sm"
                >
                  <FileIcon className="h-4 w-4 text-gray-600" />
                  <span className="max-w-[150px] truncate text-gray-700">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* 상단: 입력 영역 */}
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="placeholder:text-muted-foreground flex field-sizing-content w-full resize-none rounded-md bg-transparent px-3 pt-2 text-base outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
        disabled={disabled}
      />

      {/* 하단: 도구 모음 (좌: +/도구 | space-between | 드롭다운/전송) */}
      <div className="flex items-center justify-between gap-2 px-2 py-2">
        {/* 좌측: + 버튼, 도구 */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              open()
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
            aria-label="첨부"
          >
            <Plus className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={onToolsClick}
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-100"
            aria-label="도구"
          >
            <LayoutGrid className="h-4 w-4" />
            <span>도구</span>
          </button>
        </div>

        {/* 우측: 모델 드롭다운 또는 등록 유도 링크, 전송 버튼 */}
        <div className="flex items-center gap-2">
          {noModelsRegistered ? (
            <Link
              href="/my-page?tab=ai-keys"
              className="flex items-center gap-1.5 rounded-full border border-dashed border-amber-300 bg-amber-50 px-2.5 py-1.5 text-sm font-medium text-amber-800 transition-colors hover:bg-amber-100"
            >
              <KeyRound className="h-4 w-4" />
              <span>{t('goToRegisterModel')}</span>
            </Link>
          ) : showModelDropdown ? (
            <div className="relative z-50" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => {
                  setDropdownOpen((o) => !o)
                  if (!dropdownOpen) setExpandedPlatformId(null)
                }}
                className="flex items-center gap-1 rounded-full px-2.5 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-100"
                aria-expanded={dropdownOpen}
                aria-haspopup="listbox"
              >
                {selectedPlatformId && PLATFORM_ICONS[selectedPlatformId] && (
                  <Image
                    src={PLATFORM_ICONS[selectedPlatformId]}
                    alt=""
                    width={18}
                    height={18}
                    className="h-[18px] w-[18px] shrink-0 object-contain"
                  />
                )}
                <span>{getSelectedDisplay(platforms, selectedPlatformId, selectedModelId)}</span>
                <ChevronDown className="h-4 w-4" />
              </button>
              {dropdownOpen && (
                <div
                  className={`absolute bottom-full left-[-83px] mb-1 flex rounded-lg border border-gray-200 bg-white shadow-lg ${
                    expandedPlatformId ? 'min-w-[200px]' : 'min-w-[140px]'
                  }`}
                  role="listbox"
                >
                  {/* 1단계: 플랫폼 목록 */}
                  <div
                    className={`flex flex-col py-1 ${expandedPlatformId ? 'border-r border-gray-200' : ''}`}
                  >
                    {platforms.map((platform) => (
                      <button
                        key={platform.id}
                        type="button"
                        onClick={() =>
                          setExpandedPlatformId((prev) =>
                            prev === platform.id ? null : platform.id
                          )
                        }
                        className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-gray-100 ${
                          expandedPlatformId === platform.id ? 'bg-gray-100' : ''
                        }`}
                      >
                        <Image
                          src={PLATFORM_ICONS[platform.id]}
                          alt=""
                          width={18}
                          height={18}
                          className="h-[18px] w-[18px] shrink-0 object-contain"
                        />
                        <span className="flex-1">{platform.displayName}</span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
                      </button>
                    ))}
                  </div>
                  {/* 2단계: 플랫폼 클릭 시에만 오른쪽에 모델 목록 확장 */}
                  {expandedPlatformId && (
                    <div className="min-w-[180px] py-1">
                      {(() => {
                        const platform = platforms.find((p) => p.id === expandedPlatformId)
                        if (!platform) return null
                        const isSelected = (modelId: string) =>
                          selectedPlatformId === platform.id && selectedModelId === modelId
                        return (
                          <>
                            <p className="px-3 py-1.5 text-xs font-medium tracking-wide text-gray-500 uppercase">
                              텍스트
                            </p>
                            {getTextModels(platform).map((model) => (
                              <button
                                key={`text-${model.id}`}
                                type="button"
                                role="option"
                                aria-selected={isSelected(model.id)}
                                onClick={() => {
                                  setSelectedAgent(`${platform.id}:${model.id}`)
                                  setDropdownOpen(false)
                                  setExpandedPlatformId(null)
                                }}
                                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 ${
                                  isSelected(model.id) ? 'bg-gray-100' : ''
                                }`}
                              >
                                {model.name}
                              </button>
                            ))}
                            {getImageModels(platform).length > 0 && (
                              <>
                                <p className="mt-1 border-t border-gray-100 px-3 py-1.5 text-xs font-medium tracking-wide text-gray-500 uppercase">
                                  이미지
                                </p>
                                {getImageModels(platform).map((model) => (
                                  <button
                                    key={`image-${model.id}`}
                                    type="button"
                                    role="option"
                                    aria-selected={isSelected(model.id)}
                                    onClick={() => {
                                      setSelectedAgent(`${platform.id}:${model.id}`)
                                      setDropdownOpen(false)
                                      setExpandedPlatformId(null)
                                    }}
                                    className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 ${
                                      isSelected(model.id) ? 'bg-gray-100' : ''
                                    }`}
                                  >
                                    {model.name}
                                  </button>
                                ))}
                              </>
                            )}
                          </>
                        )
                      })()}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : null}
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || disabled || (showModelDropdown && platforms.length === 0)}
            className="h-8 w-8 shrink-0 rounded-full bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300"
          >
            {disabled ? (
              <Loader2 className="h-4 w-4 animate-spin text-gray-600" />
            ) : (
              <ArrowUp className="h-4 w-4 text-white" />
            )}
          </Button>
        </div>
      </div>
    </form>
  )
}
export default ChatInput
