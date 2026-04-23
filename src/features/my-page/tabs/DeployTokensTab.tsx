'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/shared/ui/basic/button'
import { Input } from '@/shared/ui/basic/input'
import { Label } from '@/shared/ui/basic/label'
import { Separator } from '@/shared/ui/basic/separator'
import { Badge } from '@/shared/ui/basic/badge'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/shared/ui/basic/accordion'
import {
  Mail,
  Share2,
  Trash2,
  KeyRound,
  HelpCircle,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/shared/libs/utils'

type TokenRow = { id: string; provider: string; expiresAt: string | null }

const PROVIDERS = [
  {
    value: 'GMAIL',
    label: 'Gmail',
    icon: Mail,
    description: '이메일 발송에 사용',
  },
  {
    value: 'FACEBOOK',
    label: 'Meta',
    icon: Share2,
    description: '광고 연동에 사용',
  },
] as const

type ProviderType = (typeof PROVIDERS)[number]['value']

export function DeployTokensTab() {
  const t = useTranslations('myPage.emailTokens')
  const queryClient = useQueryClient()
  const searchParams = useSearchParams()
  const [selectedProvider, setSelectedProvider] = useState<ProviderType>('GMAIL')
  const [accessToken, setAccessToken] = useState('')
  const [refreshToken, setRefreshToken] = useState('')
  const [showManualForm, setShowManualForm] = useState(false)

  useEffect(() => {
    const gmailResult = searchParams.get('gmail')
    if (gmailResult === 'success') {
      toast.success('Gmail 연동이 완료되었습니다.')
      queryClient.invalidateQueries({ queryKey: ['my-page', 'external-tokens'] })
    } else if (gmailResult === 'error') {
      const reason = searchParams.get('reason') || '알 수 없는 오류'
      toast.error(`Gmail 연동 실패: ${reason}`)
    }

    const facebookResult = searchParams.get('facebook')
    if (facebookResult === 'success') {
      toast.success('Meta 연동이 완료되었습니다.')
      queryClient.invalidateQueries({ queryKey: ['my-page', 'external-tokens'] })
      setSelectedProvider('FACEBOOK')
    } else if (facebookResult === 'error') {
      const reason = searchParams.get('reason') || '알 수 없는 오류'
      toast.error(`Meta 연동 실패: ${reason}`)
    }
  }, [searchParams, queryClient])

  const { data: tokens = [], isLoading } = useQuery<TokenRow[]>({
    queryKey: ['my-page', 'external-tokens'],
    queryFn: async () => {
      const res = await fetch('/api/user/tokens')
      if (!res.ok) throw new Error('Failed to fetch')
      return res.json()
    },
  })

  const addMutation = useMutation({
    mutationFn: async (body: { provider: string; accessToken: string; refreshToken?: string }) => {
      const res = await fetch('/api/user/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || res.statusText)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['my-page', 'external-tokens'],
      })
      setAccessToken('')
      setRefreshToken('')
      setShowManualForm(false)
      toast.success(t('addSuccess'))
    },
    onError: (e: Error) => toast.error(e.message || t('addError')),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/user/tokens?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Delete failed')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['my-page', 'external-tokens'],
      })
      toast.success(t('deleteSuccess'))
    },
    onError: () => toast.error(t('deleteError')),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!accessToken.trim()) return
    addMutation.mutate({
      provider: selectedProvider,
      accessToken: accessToken.trim(),
      refreshToken: refreshToken.trim() || undefined,
    })
  }

  const tGmail = useTranslations('myPage.emailTokens.gmail')
  const tMeta = useTranslations('myPage.emailTokens.meta')
  const tProvider = selectedProvider === 'GMAIL' ? tGmail : tMeta

  const connectedProviders = new Set(tokens.map((t) => t.provider))

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">{t('title')}</h2>
        <p className="text-muted-foreground mt-1 text-sm">{t('description')}</p>
      </div>

      <Separator />

      {/* Service selector */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium">서비스 선택</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {PROVIDERS.map(({ value, label, icon: Icon, description }) => {
            const isConnected = connectedProviders.has(value)
            const isActive = selectedProvider === value
            return (
              <button
                key={value}
                type="button"
                onClick={() => setSelectedProvider(value)}
                className={cn(
                  'flex items-center gap-3 rounded-lg border p-4 text-left transition-all',
                  isActive
                    ? 'border-primary/40 bg-primary/5 ring-primary/20 ring-1'
                    : 'hover:bg-muted/50'
                )}
              >
                <div
                  className={cn(
                    'flex size-9 shrink-0 items-center justify-center rounded-lg',
                    isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                  )}
                >
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{label}</span>
                    {isConnected && <CheckCircle2 className="size-3.5 text-emerald-500" />}
                  </div>
                  <p className="text-muted-foreground text-xs">{description}</p>
                </div>
                {isConnected && (
                  <Badge
                    variant="secondary"
                    className="shrink-0 bg-emerald-50 text-xs text-emerald-600 dark:bg-emerald-900/20"
                  >
                    연결됨
                  </Badge>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <Separator />

      {/* Connect section */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium">
          {PROVIDERS.find((p) => p.value === selectedProvider)?.label} 연결
        </h3>

        {selectedProvider === 'GMAIL' && (
          <div className="space-y-3">
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={() => {
                window.location.href = '/api/auth/gmail/authorize'
              }}
            >
              <ExternalLink className="size-4" />
              Google 계정으로 연결
            </Button>
            <div>
              <button
                type="button"
                onClick={() => setShowManualForm((v) => !v)}
                className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-xs transition-colors"
              >
                <KeyRound className="size-3" />
                {showManualForm ? '직접 입력 닫기' : '토큰 직접 입력 (고급)'}
              </button>
            </div>
          </div>
        )}

        {selectedProvider === 'FACEBOOK' && (
          <div className="space-y-3">
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={() => {
                window.location.href = '/api/auth/facebook/authorize'
              }}
            >
              <ExternalLink className="size-4" />
              Meta 계정으로 연결
            </Button>
            <div>
              <button
                type="button"
                onClick={() => setShowManualForm((v) => !v)}
                className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-xs transition-colors"
              >
                <KeyRound className="size-3" />
                {showManualForm ? '직접 입력 닫기' : '토큰 직접 입력 (고급)'}
              </button>
            </div>
          </div>
        )}

        {showManualForm && (
          <form onSubmit={handleSubmit} className="bg-muted/30 space-y-4 rounded-lg border p-4">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="howto" className="border-none">
                <AccordionTrigger className="text-muted-foreground hover:text-foreground py-2 text-xs hover:no-underline">
                  <span className="flex items-center gap-1.5">
                    <HelpCircle className="size-3.5" />
                    {tProvider('howToTitle')}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-3 pl-5 text-xs leading-relaxed">
                  {tProvider('howToSteps')}
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="access-token" className="text-xs">
                  {tProvider('accessToken')}
                </Label>
                <Input
                  id="access-token"
                  type="password"
                  placeholder={tProvider('accessTokenPlaceholder')}
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  className="font-mono text-sm"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="refresh-token" className="text-xs">
                  {tProvider('refreshToken')}
                  {selectedProvider === 'GMAIL' && <span className="ml-1 text-red-500">*</span>}
                </Label>
                <Input
                  id="refresh-token"
                  type="password"
                  placeholder={tProvider('refreshTokenPlaceholder')}
                  value={refreshToken}
                  onChange={(e) => setRefreshToken(e.target.value)}
                  className="font-mono text-sm"
                  autoComplete="off"
                />
              </div>
            </div>

            <Button
              type="submit"
              size="sm"
              disabled={
                !accessToken.trim() ||
                (selectedProvider === 'GMAIL' && !refreshToken.trim()) ||
                addMutation.isPending
              }
            >
              {addMutation.isPending ? t('adding') : t('addToken')}
            </Button>
          </form>
        )}
      </div>

      <Separator />

      {/* Connected tokens list */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium">{t('connected')}</h3>
        {isLoading ? (
          <p className="text-muted-foreground text-sm">{t('loading')}</p>
        ) : tokens.length === 0 ? (
          <div className="rounded-lg border border-dashed px-4 py-8 text-center">
            <p className="text-muted-foreground text-sm">{t('empty')}</p>
          </div>
        ) : (
          <div className="divide-y rounded-lg border">
            {tokens.map((row) => {
              const providerInfo = PROVIDERS.find((p) => p.value === row.provider)
              const Icon = providerInfo?.icon ?? KeyRound
              return (
                <div key={row.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-md">
                      <Icon className="text-muted-foreground size-4" />
                    </div>
                    <div>
                      <span className="text-sm font-medium">
                        {providerInfo?.label ?? row.provider}
                      </span>
                      <p className="text-muted-foreground text-xs">ID: {row.id.slice(0, 8)}…</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className="bg-emerald-50 text-xs text-emerald-600 dark:bg-emerald-900/20"
                    >
                      연결됨
                    </Badge>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => deleteMutation.mutate(row.id)}
                      disabled={deleteMutation.isPending}
                      aria-label={t('delete')}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
