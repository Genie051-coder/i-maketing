'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Mail, Info, ExternalLink, AlertTriangle, Loader2, Clock, ArrowRight } from 'lucide-react'
import { Input } from '@/shared/ui/basic/input'
import { Button } from '@/shared/ui/basic/button'
import { Label } from '@/shared/ui/basic/label'
import { RadioGroup, RadioGroupItem } from '@/shared/ui/basic/radio-group'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/basic/tooltip'
import { useFlowStore } from '@/features/flow/store/useFlowStore'
import { cn } from '@/shared/libs/utils'

type SendSettingsConfigProps = { nodeId?: string }

type TokenRow = { id: string; provider: string; expiresAt: string | null }

const SUBJECT_MAX = 40

export function SendSettingsConfig({ nodeId }: SendSettingsConfigProps) {
  const router = useRouter()
  const getNode = useFlowStore((s) => s.getNode)
  const saveNodeConfig = useFlowStore((s) => s.saveNodeConfig)
  const closeConfig = useFlowStore((s) => s.closeConfig)

  const existing = nodeId
    ? (getNode(nodeId)?.data as
        | {
            subject?: string
            previewText?: string
            sendMode?: 'now' | 'scheduled'
            scheduledAt?: string
          }
        | undefined)
    : undefined

  const [subject, setSubject] = useState(existing?.subject ?? '')
  const [previewText, setPreviewText] = useState(existing?.previewText ?? '')
  const [sendMode, setSendMode] = useState<'now' | 'scheduled'>(existing?.sendMode ?? 'now')
  const [scheduledAt, setScheduledAt] = useState(existing?.scheduledAt ?? '')

  const { data: tokens = [], isLoading: tokensLoading } = useQuery<TokenRow[]>({
    queryKey: ['my-page', 'external-tokens'],
    queryFn: async () => {
      const res = await fetch('/api/user/tokens')
      if (!res.ok) throw new Error('Failed to fetch')
      return res.json()
    },
  })

  const gmailToken = tokens.find((t) => t.provider === 'GMAIL')
  const hasGmail = !!gmailToken

  const canSave = hasGmail && subject.trim().length > 0

  const handleSave = async () => {
    if (!nodeId || !canSave) return
    await saveNodeConfig(nodeId, {
      subject: subject.trim(),
      previewText: previewText.trim(),
      sendMode,
      ...(sendMode === 'scheduled' && scheduledAt ? { scheduledAt } : {}),
    })
    closeConfig()
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 items-start justify-center overflow-y-auto">
        <div className="w-full max-w-[560px] space-y-6 px-6 py-10">
          {/* Header */}
          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-900">발송 설정</h2>
            <p className="mt-1 text-sm text-gray-500">언제, 누가 보낼지 설정해주세요</p>
          </div>

          {/* 발신자 */}
          <section className="rounded-xl border border-gray-200 p-4">
            <Label className="mb-3 text-gray-700">발신자</Label>
            {tokensLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                확인 중…
              </div>
            ) : hasGmail ? (
              <div className="flex items-center gap-3 rounded-lg bg-gray-50 px-4 py-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100">
                  <Mail className="h-4 w-4 text-red-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900">Gmail 연동됨</p>
                  <p className="text-xs text-gray-500">
                    마이페이지 → 외부 서비스에서 변경할 수 있어요
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 gap-1 text-xs text-gray-500"
                  onClick={() => router.push('/my-page?tab=email-tokens')}
                >
                  이동
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-amber-800">Gmail이 연동되지 않았어요</p>
                  <p className="text-xs text-amber-600">
                    발송하려면 마이페이지에서 Gmail을 연동해주세요
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-1 text-xs"
                  onClick={() => router.push('/my-page?tab=email-tokens')}
                >
                  Gmail 연동하기
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            )}
          </section>

          {/* 이메일 제목 */}
          <section className="space-y-2">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="email-subject">
                이메일 제목 <span className="text-red-400">*</span>
              </Label>
              <span
                className={cn(
                  'text-xs',
                  subject.length > SUBJECT_MAX ? 'text-red-500' : 'text-gray-400'
                )}
              >
                {subject.length}자
              </span>
            </div>
            <Input
              id="email-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="이메일 제목을 입력해주세요"
            />
            {subject.length > SUBJECT_MAX && (
              <p className="text-xs text-red-500">모바일 기준 {SUBJECT_MAX}자 이내 권장</p>
            )}
          </section>

          {/* 미리보기 텍스트 */}
          <section className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="preview-text">미리보기 텍스트</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 cursor-help text-gray-400" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[240px]">
                    <p className="mb-1 font-medium">받은편지함에서 이렇게 보여요</p>
                    <div className="rounded bg-white/10 px-2 py-1 text-[11px] leading-relaxed">
                      <span className="font-medium">발신자명</span>
                      <br />
                      제목 텍스트 &nbsp;
                      <span className="opacity-60">미리보기~</span>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="preview-text"
              value={previewText}
              onChange={(e) => setPreviewText(e.target.value)}
              placeholder="받은 편지함 목록에서 제목 옆에 보이는 텍스트예요"
            />
            <p className="text-xs text-gray-400">비워두면 이메일 본문 첫 줄이 자동으로 표시돼요</p>
          </section>

          {/* 발송 시간 */}
          <section className="rounded-xl border border-gray-200 p-4">
            <div className="mb-3 flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-gray-500" />
              <Label>발송 시간</Label>
            </div>
            <RadioGroup
              value={sendMode}
              onValueChange={(v) => setSendMode(v as 'now' | 'scheduled')}
              className="gap-3"
            >
              <label className="flex cursor-pointer items-center gap-2.5">
                <RadioGroupItem value="now" />
                <span className="text-sm text-gray-700">즉시 발송</span>
              </label>
              <div className="flex items-center gap-2.5">
                <label className="flex cursor-pointer items-center gap-2.5">
                  <RadioGroupItem value="scheduled" />
                  <span className="text-sm text-gray-700">예약 발송</span>
                </label>
                {sendMode === 'scheduled' && (
                  <Input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="h-8 w-auto text-sm"
                  />
                )}
              </div>
            </RadioGroup>
          </section>

          {/* 저장 */}
          <Button onClick={handleSave} disabled={!canSave} className="w-full">
            저장
          </Button>
        </div>
      </div>
    </div>
  )
}
