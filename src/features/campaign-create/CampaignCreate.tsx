'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useQueryClient } from '@tanstack/react-query'
import { Mail, PenLine, Share2, Camera, MessageSquare } from 'lucide-react'
import { ChatInput } from '../ai-chat/ui/ChatInput'
import { AuthModal } from '@/features/auth'
import { useTranslations, useMessages } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { cn } from '@/shared/libs/utils'

const CAMPAIGN_TYPES = [
  { value: 'email', icon: Mail, labelKey: 'campaignCreate.email' },
  { value: 'blog', icon: PenLine, labelKey: 'campaignCreate.blog' },
  { value: 'facebook', icon: Share2, labelKey: 'campaignCreate.facebook' },
  { value: 'instagram', icon: Camera, labelKey: 'campaignCreate.instagram' },
  { value: 'sms', icon: MessageSquare, labelKey: 'campaignCreate.sms' },
] as const

export function CampaignCreate() {
  const t = useTranslations()
  const messages = useMessages()
  const router = useRouter()
  const { status: sessionStatus } = useSession()
  const queryClient = useQueryClient()

  const [selectedType, setSelectedType] = useState('')
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [typeError, setTypeError] = useState(false)

  const examples = (messages as Record<string, { examples?: Record<string, string[]> }>)
    ?.campaignCreate?.examples
  const currentExamples: string[] = selectedType
    ? (examples?.[selectedType] ?? [])
    : (examples?.email ?? [])

  const createCampaign = async (title: string) => {
    if (!title.trim() || !selectedType) return
    setLoading(true)
    setErrorMsg(null)
    try {
      const res = await fetch('/api/flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), type: selectedType }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setErrorMsg(data.error || '캠페인 생성 실패')
        setLoading(false)
        return
      }
      const campaign = await res.json()
      queryClient.invalidateQueries({ queryKey: ['user-flows'] })
      router.push(`/flow/${campaign.id}`)
    } catch (e: Error | unknown) {
      setErrorMsg(e instanceof Error ? e.message : '캠페인 생성 중 오류 발생')
      setLoading(false)
    }
  }

  const handleSubmit = (title: string) => {
    if (!selectedType) {
      setTypeError(true)
      return
    }
    if (sessionStatus !== 'authenticated') {
      setAuthModalOpen(true)
      return
    }
    createCampaign(title)
  }

  const handleTypeSelect = (value: string) => {
    setSelectedType(value)
    setTypeError(false)
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl space-y-10">
        {/* Header */}
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">{t('campaignCreate.title')}</h1>
          <p className="text-muted-foreground">{t('campaignCreate.subtitle')}</p>
        </div>

        {/* Input + Type chips */}
        <div className="space-y-3">
          <ChatInput
            upload={false}
            value={inputValue}
            onChange={setInputValue}
            onSendMessage={handleSubmit}
            placeholder={t('campaignCreate.chatPlaceholder')}
            disabled={loading}
          />

          <div className="flex flex-wrap gap-2 px-1">
            {CAMPAIGN_TYPES.map(({ value, icon: Icon, labelKey }) => (
              <button
                key={value}
                type="button"
                onClick={() => handleTypeSelect(value)}
                disabled={loading}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-all',
                  selectedType === value
                    ? 'bg-foreground text-background border-foreground'
                    : 'border-border text-muted-foreground hover:border-foreground/50 hover:text-foreground'
                )}
              >
                <Icon className="size-3.5" />
                {t(labelKey)}
              </button>
            ))}
          </div>

          {typeError && (
            <p className="text-destructive px-1 text-xs">{t('campaignCreate.typeRequired')}</p>
          )}
        </div>

        {/* Examples */}
        <div className="space-y-3">
          <p className="text-muted-foreground text-center text-sm">{t('campaignCreate.hint')}</p>
          <div className="flex flex-wrap justify-center gap-2">
            {currentExamples.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setInputValue(example)}
                disabled={loading}
                className="border-border bg-background hover:border-foreground/30 hover:bg-muted/50 rounded-full border px-4 py-2 text-sm transition-colors"
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        {errorMsg && <p className="text-destructive text-center text-sm">{errorMsg}</p>}
      </div>

      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
    </div>
  )
}
