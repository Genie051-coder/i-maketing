'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/shared/ui/basic/button'
import { Input } from '@/shared/ui/basic/input'
import { Label } from '@/shared/ui/basic/label'
import { Separator } from '@/shared/ui/basic/separator'
import { Badge } from '@/shared/ui/basic/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/basic/select'
import { Trash2, Plus, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'

type ApiKeyRow = {
  id: string
  provider: string
  label: string | null
  createdAt: string
}

const PROVIDERS = [
  {
    value: 'ANTHROPIC',
    label: 'Anthropic',
    sublabel: 'Claude',
    color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  },
  {
    value: 'OPENAI',
    label: 'OpenAI',
    sublabel: 'GPT',
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  {
    value: 'GEMINI',
    label: 'Google',
    sublabel: 'Gemini',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
] as const

function ProviderBadge({ provider }: { provider: string }) {
  const p = PROVIDERS.find((p) => p.value === provider)
  if (!p) return <span className="text-sm font-medium">{provider}</span>
  return (
    <div className="flex items-center gap-2">
      <span
        className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${p.color}`}
      >
        {p.label}
      </span>
      <span className="text-sm font-medium">{p.sublabel}</span>
    </div>
  )
}

export function AiApiKeysTab() {
  const t = useTranslations('myPage.aiKeys')
  const queryClient = useQueryClient()
  const [provider, setProvider] = useState<string>('ANTHROPIC')
  const [value, setValue] = useState('')
  const [label, setLabel] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const { data: keys = [], isLoading } = useQuery<ApiKeyRow[]>({
    queryKey: ['my-page', 'ai-keys'],
    queryFn: async () => {
      const res = await fetch('/api/user/ai-keys')
      if (!res.ok) throw new Error('Failed to fetch')
      return res.json()
    },
  })

  const addMutation = useMutation({
    mutationFn: async (body: { provider: string; value: string; label?: string }) => {
      const res = await fetch('/api/user/ai-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || res.statusText)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-page', 'ai-keys'] })
      setValue('')
      setLabel('')
      setShowForm(false)
      toast.success(t('addSuccess'))
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async (p: string) => {
      const res = await fetch(`/api/user/ai-keys?provider=${encodeURIComponent(p)}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Delete failed')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-page', 'ai-keys'] })
      toast.success(t('deleteSuccess'))
    },
    onError: () => toast.error(t('deleteError')),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!value.trim()) return
    addMutation.mutate({
      provider,
      value: value.trim(),
      label: label.trim() || undefined,
    })
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">{t('title')}</h2>
        <p className="text-muted-foreground mt-1 text-sm">{t('description')}</p>
      </div>

      <Separator />

      {/* Key list */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">{t('registered')}</h3>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs"
            onClick={() => setShowForm((v) => !v)}
          >
            <Plus className="size-3.5" />
            {t('add')}
          </Button>
        </div>

        {/* Add form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="bg-muted/30 space-y-4 rounded-lg border p-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="ai-provider" className="text-xs">
                  {t('provider')}
                </Label>
                <Select value={provider} onValueChange={setProvider}>
                  <SelectTrigger id="ai-provider">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVIDERS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label} ({p.sublabel})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ai-key-value" className="text-xs">
                  {t('apiKey')}
                </Label>
                <div className="relative">
                  <Input
                    id="ai-key-value"
                    type={showKey ? 'text' : 'password'}
                    placeholder="sk-..."
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="pr-9 font-mono text-sm"
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey((v) => !v)}
                    className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2"
                    tabIndex={-1}
                  >
                    {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ai-key-label" className="text-xs">
                  {t('labelOptional')}
                </Label>
                <Input
                  id="ai-key-label"
                  placeholder={t('labelPlaceholder')}
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={!value.trim() || addMutation.isPending}>
                {t('add')}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowForm(false)
                  setValue('')
                  setLabel('')
                }}
              >
                취소
              </Button>
            </div>
          </form>
        )}

        {/* Keys list */}
        {isLoading ? (
          <p className="text-muted-foreground text-sm">{t('loading')}</p>
        ) : keys.length === 0 ? (
          <div className="rounded-lg border border-dashed px-4 py-8 text-center">
            <p className="text-muted-foreground text-sm">{t('empty')}</p>
          </div>
        ) : (
          <div className="divide-y rounded-lg border">
            {keys.map((row) => (
              <div key={row.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <ProviderBadge provider={row.provider} />
                  {row.label && (
                    <Badge variant="secondary" className="text-xs font-normal">
                      {row.label}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground font-mono text-xs">••••••••••••••••</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => deleteMutation.mutate(row.provider)}
                    disabled={deleteMutation.isPending}
                    aria-label={t('delete')}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
