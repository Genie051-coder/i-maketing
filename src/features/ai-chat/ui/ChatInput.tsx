'use client'

import { useState, FormEvent, useEffect } from 'react'
import { Button } from '@/shared/ui/basic/button'
import { ArrowUp, Loader2, X, FileIcon } from 'lucide-react'
import { AgentInfo } from '@/shared/types/agent'
import { useDropzone } from 'react-dropzone'

interface ChatInputProps {
  onSendMessage?: (message: string, agentId?: string) => void
  disabled?: boolean
  upload?: boolean
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
}

export function ChatInput({
  onSendMessage,
  disabled = false,
  upload = false,
  placeholder = '시작할 캠페인의 제목을 입력해주세요.',
  value: externalValue,
  onChange: externalOnChange,
}: ChatInputProps) {
  const [internalInput, setInternalInput] = useState('')
  const input = externalValue !== undefined ? externalValue : internalInput
  const [selectedAgent, setSelectedAgent] = useState<string>()
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      setUploadedFiles((prev) => [...prev, ...acceptedFiles])
    },
    noClick: true,
    noKeyboard: true,
    disabled,
  })

  useEffect(() => {
    fetch('/api/agents')
      .then((res) => res.json())
      .then((data: AgentInfo[]) => {
        // 첫 번째 에이전트를 기본값으로 설정
        if (data.length > 0 && !selectedAgent) {
          setSelectedAgent(data[0].id)
        }
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

      {/* Top: Textarea */}
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="placeholder:text-muted-foreground flex field-sizing-content min-h-[48px] w-full resize-none rounded-md bg-transparent px-3 py-2 text-base outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
        disabled={disabled}
      />

      {/* Bottom: Action Buttons */}
      <div className="flex items-center justify-between px-3 pb-1">
        {/* Right: AiSelecter and Send Button */}
        <div className="flex items-center">
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || disabled}
            className="h-8 w-8 rounded-full bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300"
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
