'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Brush, X } from 'lucide-react'
import { Button } from '@/shared/ui/basic/button'

export function OnboardingBanner() {
  const t = useTranslations('onboarding')
  const router = useRouter()
  const { status } = useSession()
  const queryClient = useQueryClient()
  const [dismissed, setDismissed] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['onboarding'],
    queryFn: async () => {
      const res = await fetch('/api/user/onboarding')
      if (!res.ok) return { isOnboarded: true }
      return res.json() as Promise<{ isOnboarded: boolean }>
    },
    enabled: status === 'authenticated',
  })

  const dismissMutation = useMutation({
    mutationFn: async () => {
      await fetch('/api/user/onboarding', { method: 'PUT' })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding'] })
    },
  })

  if (status !== 'authenticated' || isLoading || dismissed || data?.isOnboarded) return null

  const handleGo = () => {
    router.push('/my-page?tab=brand-kit')
  }

  const handleDismiss = () => {
    setDismissed(true)
    dismissMutation.mutate()
  }

  return (
    <div className="animate-in slide-in-from-right fade-in bg-background fixed top-4 right-4 z-50 w-80 rounded-lg border p-4 shadow-lg duration-300">
      <button
        type="button"
        onClick={handleDismiss}
        className="text-muted-foreground hover:text-foreground absolute top-2 right-2 rounded-sm p-1 transition-colors"
        aria-label="dismiss"
      >
        <X className="size-3.5" />
      </button>
      <div className="flex items-start gap-3">
        <div className="bg-primary/10 flex size-9 shrink-0 items-center justify-center rounded-full">
          <Brush className="text-primary size-4" />
        </div>
        <div className="min-w-0 flex-1 pr-4">
          <p className="text-sm font-semibold">{t('title')}</p>
          <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">{t('description')}</p>
          <Button size="sm" className="mt-3 w-full" onClick={handleGo}>
            {t('action')}
          </Button>
        </div>
      </div>
    </div>
  )
}
