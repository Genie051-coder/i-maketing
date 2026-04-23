'use client'

import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { Avatar, AvatarFallback } from '@/shared/ui/basic/avatar'
import { Separator } from '@/shared/ui/basic/separator'
import { Badge } from '@/shared/ui/basic/badge'

export function AccountTab() {
  const t = useTranslations('myPage.account')
  const { data: session } = useSession()

  const email = session?.user?.email ?? ''
  const name = session?.user?.name ?? null
  const initial = (name || email).slice(0, 1).toUpperCase()

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">{t('title')}</h2>
        <p className="text-muted-foreground mt-1 text-sm">{t('description')}</p>
      </div>

      <Separator />

      {/* Profile section */}
      <div className="space-y-4">
        <h3 className="text-foreground text-sm font-medium">{t('profile')}</h3>
        <div className="flex items-center gap-4">
          <Avatar className="size-16">
            <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
              {initial}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            {name && <p className="text-base font-medium">{name}</p>}
            <p className="text-muted-foreground text-sm">{email}</p>
            <Badge variant="secondary" className="text-xs">
              Free
            </Badge>
          </div>
        </div>
      </div>

      <Separator />

      {/* Account info section */}
      <div className="space-y-4">
        <h3 className="text-foreground text-sm font-medium">{t('accountInfo')}</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-1">
            <span className="text-muted-foreground text-sm">{t('email')}</span>
            <span className="text-sm font-medium">{email || '—'}</span>
          </div>
          <Separator className="opacity-50" />
          <div className="flex items-center justify-between py-1">
            <span className="text-muted-foreground text-sm">{t('displayName')}</span>
            <span className="text-sm font-medium">{name || '—'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
