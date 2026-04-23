'use client'

import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Send,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  Pencil,
  Monitor,
  Smartphone,
  Mail,
} from 'lucide-react'
import { Button } from '@/shared/ui/basic/button'
import { Badge } from '@/shared/ui/basic/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/shared/ui/basic/dialog'
import { useFlowStore } from '@/features/flow/store/useFlowStore'
import {
  CAMPAIGN_TYPES,
  CAMPAIGN_META,
  type CampaignType,
} from '../email-campaign-purpose/constants'
import { cn } from '@/shared/libs/utils'

type ConfirmSendConfigProps = { nodeId?: string }

type TokenRow = { id: string; provider: string; expiresAt: string | null }

type CheckStatus = 'pass' | 'warn' | 'error'
type CheckItem = { label: string; status: CheckStatus; hint?: string }

function StatusIcon({ status }: { status: CheckStatus }) {
  if (status === 'pass') return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
  if (status === 'warn') return <AlertTriangle className="h-4 w-4 text-amber-500" />
  return <XCircle className="h-4 w-4 text-red-500" />
}

function InfoRow({ label, value, onEdit }: { label: string; value: string; onEdit?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="shrink-0 text-sm text-gray-500">{label}</span>
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate text-sm font-medium text-gray-900">{value || '—'}</span>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="shrink-0 text-xs text-indigo-600 hover:text-indigo-700"
          >
            <Pencil className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  )
}

export function ConfirmSendConfig({ nodeId }: ConfirmSendConfigProps) {
  const nodes = useFlowStore((s) => s.nodes)
  const openConfig = useFlowStore((s) => s.openConfig)
  const closeConfig = useFlowStore((s) => s.closeConfig)

  const [checking, setChecking] = useState(true)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [previewMode, setPreviewMode] = useState<'pc' | 'mobile'>('pc')

  const { data: tokens = [] } = useQuery<TokenRow[]>({
    queryKey: ['my-page', 'external-tokens'],
    queryFn: async () => {
      const res = await fetch('/api/user/tokens')
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
  })

  const hasGmail = tokens.some((t) => t.provider === 'GMAIL')

  const purposeNode = nodes.find((n) => n.type === 'campaign-purpose')
  const emailNode = nodes.find((n) => n.type === 'email')
  const addressNode = nodes.find((n) => n.type === 'address-book')
  const sendSettingsNode = nodes.find((n) => n.type === 'send-settings')

  const purposeData = purposeNode?.data as { campaignType?: CampaignType } | undefined
  const emailData = emailNode?.data as { subject?: string; blocks?: unknown[] } | undefined
  const addressData = addressNode?.data as { recipientEmail?: string } | undefined
  const settingsData = sendSettingsNode?.data as
    | {
        subject?: string
        previewText?: string
        sendMode?: string
      }
    | undefined

  const campaignType = purposeData?.campaignType
  const campaignMeta = campaignType ? CAMPAIGN_TYPES.find((t) => t.id === campaignType) : null
  const campaignChecklist = campaignType ? CAMPAIGN_META[campaignType] : null

  const recipientEmail = addressData?.recipientEmail ?? ''
  const subject = settingsData?.subject ?? ''
  const previewText = settingsData?.previewText ?? ''

  useEffect(() => {
    const t = setTimeout(() => setChecking(false), 800)
    return () => clearTimeout(t)
  }, [])

  const checks = useMemo<CheckItem[]>(() => {
    const items: CheckItem[] = [
      {
        label: 'Gmail 연동 상태',
        status: hasGmail ? 'pass' : 'error',
        hint: hasGmail ? undefined : '마이페이지에서 Gmail을 연동해주세요',
      },
      {
        label: '수신자 이메일 유효',
        status: recipientEmail && recipientEmail.includes('@') ? 'pass' : 'error',
        hint: !recipientEmail ? '수신자 이메일을 입력해주세요' : undefined,
      },
      {
        label: '이메일 제목 입력됨',
        status: subject.trim() ? 'pass' : 'error',
        hint: !subject.trim() ? '발송 설정에서 제목을 입력해주세요' : undefined,
      },
      {
        label: '미리보기 텍스트',
        status: previewText.trim() ? 'pass' : 'warn',
        hint: !previewText.trim() ? '비워두면 본문 첫 줄이 표시돼요' : undefined,
      },
    ]

    if (campaignChecklist) {
      campaignChecklist.checklistItems.forEach((item) => {
        items.push({ label: item, status: 'pass' })
      })
    }

    return items
  }, [hasGmail, recipientEmail, subject, previewText, campaignChecklist])

  const hasError = checks.some((c) => c.status === 'error')

  const buildDefinition = useFlowStore((s) => s.buildDefinition)

  const handleEditNode = (nodeId: string | undefined) => {
    if (!nodeId) return
    closeConfig()
    setTimeout(() => openConfig(nodeId), 100)
  }

  const [sendError, setSendError] = useState<string | null>(null)

  const handleSend = async () => {
    setSending(true)
    setSendError(null)

    try {
      const { nodes } = buildDefinition()
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error ?? '발송에 실패했습니다.')
      }
      setSent(true)
      setConfirmOpen(false)
    } catch (err) {
      setSendError(err instanceof Error ? err.message : '발송에 실패했습니다.')
      setConfirmOpen(false)
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
          <Mail className="h-8 w-8 text-emerald-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">발송이 완료됐어요!</h2>
        <p className="text-sm text-gray-500">{recipientEmail}</p>
        <div className="mt-4 flex gap-2">
          <Button variant="outline" onClick={() => closeConfig()}>
            캠페인으로 돌아가기
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 items-start justify-center overflow-y-auto">
        <div className="w-full max-w-[600px] space-y-5 px-6 py-10">
          {/* Header */}
          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-900">확인 &amp; 발송</h2>
            <p className="mt-1 text-sm text-gray-500">발송 전 마지막으로 확인해주세요</p>
          </div>

          {/* 캠페인 요약 뱃지 */}
          {campaignMeta && (
            <div className="flex justify-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-1.5">
                <campaignMeta.icon className={cn('h-4 w-4', campaignMeta.iconColor)} />
                <span className="text-sm font-medium text-gray-700">{campaignMeta.label}</span>
              </div>
            </div>
          )}

          {/* 발송 정보 */}
          <section className="rounded-xl border border-gray-200 px-4 py-1">
            <InfoRow
              label="받는 사람"
              value={recipientEmail}
              onEdit={() => handleEditNode(addressNode?.id)}
            />
            <div className="border-t border-gray-100" />
            <InfoRow label="발신자" value={hasGmail ? 'Gmail 연동됨' : '미연동'} />
            <div className="border-t border-gray-100" />
            <InfoRow
              label="제목"
              value={subject}
              onEdit={() => handleEditNode(sendSettingsNode?.id)}
            />
            {previewText && (
              <>
                <div className="border-t border-gray-100" />
                <InfoRow label="미리보기" value={previewText} />
              </>
            )}
          </section>

          {/* 자동 검증 */}
          <section className="rounded-xl border border-gray-200 p-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">자동 검증</span>
              {checking && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  검사 중
                </Badge>
              )}
              {!checking && !hasError && (
                <Badge className="gap-1 bg-emerald-500 text-xs">모두 통과</Badge>
              )}
              {!checking && hasError && (
                <Badge variant="destructive" className="gap-1 text-xs">
                  수정 필요
                </Badge>
              )}
            </div>

            {checking ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            ) : (
              <ul className="space-y-2">
                {checks.map((c) => (
                  <li key={c.label} className="flex items-start gap-2.5">
                    <StatusIcon status={c.status} />
                    <div className="min-w-0">
                      <span
                        className={cn(
                          'text-sm',
                          c.status === 'pass' && 'text-gray-700',
                          c.status === 'warn' && 'text-amber-700',
                          c.status === 'error' && 'text-red-700'
                        )}
                      >
                        {c.label}
                      </span>
                      {c.hint && <p className="mt-0.5 text-xs text-gray-400">{c.hint}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* 이메일 미리보기 */}
          <section className="rounded-xl border border-gray-200 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">이메일 미리보기</span>
              <div className="flex items-center gap-1 rounded-lg border border-gray-200 p-0.5">
                <button
                  type="button"
                  onClick={() => setPreviewMode('pc')}
                  className={cn(
                    'flex items-center gap-1 rounded-md px-2.5 py-1 text-xs transition-colors',
                    previewMode === 'pc'
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  <Monitor className="h-3 w-3" />
                  PC
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('mobile')}
                  className={cn(
                    'flex items-center gap-1 rounded-md px-2.5 py-1 text-xs transition-colors',
                    previewMode === 'mobile'
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  <Smartphone className="h-3 w-3" />
                  모바일
                </button>
              </div>
            </div>

            <div
              className={cn(
                'mx-auto overflow-hidden rounded-lg border border-gray-200 bg-white transition-all',
                previewMode === 'mobile' ? 'max-w-[375px]' : 'w-full'
              )}
            >
              <div className="border-b border-gray-100 px-4 py-2.5">
                <p className="truncate text-xs text-gray-400">From: Gmail 연동 계정</p>
                <p className="mt-0.5 truncate text-sm font-medium text-gray-800">
                  {subject || '(제목 없음)'}
                </p>
                {previewText && (
                  <p className="mt-0.5 truncate text-xs text-gray-400">{previewText}</p>
                )}
              </div>
              <div className="flex items-center justify-center px-4 py-12 text-center text-sm text-gray-400">
                이메일 콘텐츠 미리보기
              </div>
            </div>
          </section>

          {sendError && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <XCircle className="h-4 w-4 shrink-0" />
              {sendError}
            </div>
          )}

          {/* 발송 버튼 */}
          <Button
            onClick={() => setConfirmOpen(true)}
            disabled={hasError || checking || sending}
            className="w-full gap-2"
            size="lg"
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                발송 중…
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                지금 발송하기
              </>
            )}
          </Button>
        </div>
      </div>

      {/* 확인 모달 */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent showCloseButton={false} className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>정말 발송할까요?</DialogTitle>
            <DialogDescription>
              <span className="font-medium text-gray-900">{recipientEmail}</span> 에게 지금 바로
              발송돼요
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">취소</Button>
            </DialogClose>
            <Button onClick={handleSend} disabled={sending} className="gap-1.5">
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  발송 중…
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  발송하기
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
