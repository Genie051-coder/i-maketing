'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Key, Mail, Database, User, Brush } from 'lucide-react'
import { cn } from '@/shared/libs/utils'
import { AiApiKeysTab } from './tabs/AiApiKeysTab'
import { DeployTokensTab } from './tabs/DeployTokensTab'
import { GlobalDbTab } from './tabs/GlobalDbTab'
import { AccountTab } from './tabs/AccountTab'
import { BrandKitForm } from './brand-kit/BrandKitForm'

const TABS = [
  { id: 'account', icon: User, labelKey: 'tabs.account' },
  { id: 'ai-keys', icon: Key, labelKey: 'tabs.aiKeys' },
  { id: 'email-tokens', icon: Mail, labelKey: 'tabs.emailTokens' },
  { id: 'brand-kit', icon: Brush, labelKey: 'tabs.brandKit' },
  { id: 'global-db', icon: Database, labelKey: 'tabs.globalDb' },
] as const

type TabId = (typeof TABS)[number]['id']

export function MyPageContent() {
  const t = useTranslations('myPage')
  const router = useRouter()
  const searchParams = useSearchParams()

  const tabParam = searchParams.get('tab') as TabId | null
  const activeTab: TabId = TABS.some((tab) => tab.id === tabParam) ? (tabParam as TabId) : 'account'

  const setTab = (id: TabId) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', id)
    router.push(`?${params.toString()}`)
  }

  return (
    <div className="container mx-auto max-w-5xl py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{t('subtitle')}</p>
      </div>

      <div className="flex gap-10">
        {/* Sidebar nav */}
        <aside className="w-44 shrink-0">
          <nav className="space-y-0.5">
            {TABS.map(({ id, icon: Icon, labelKey }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
                  activeTab === id
                    ? 'bg-accent text-accent-foreground font-medium'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                )}
              >
                <Icon className="size-4 shrink-0" />
                {t(labelKey)}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main className="min-w-0 flex-1">
          {activeTab === 'account' && <AccountTab />}
          {activeTab === 'ai-keys' && <AiApiKeysTab />}
          {activeTab === 'email-tokens' && <DeployTokensTab />}
          {activeTab === 'brand-kit' && <BrandKitForm />}
          {activeTab === 'global-db' && <GlobalDbTab />}
        </main>
      </div>
    </div>
  )
}
