'use client'

import { useEffect, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from '@/shared/ui/basic/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/basic/dropdown-menu'
import { Home, Settings, User, Sun, Moon, LogOut } from 'lucide-react'
import { cn } from '@/shared/libs/utils'
import { Badge } from '@/shared/ui/basic/badge'
import { useTranslations, useLocale } from 'next-intl'
import { usePathname, useRouter } from '@/i18n/navigation'
import { AuthModal } from '@/features/auth'

type FlowItem = { id: string; title: string; createdAt: string; type: 'email' | 'facebook' }

type DateGroup = { label: string; flows: FlowItem[] }

function getDateGroupLabel(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return '오늘'
  if (diffDays === 1) return '어제'
  if (diffDays <= 7) return '이번 주'
  if (diffDays <= 30) return '이번 달'
  return '이전'
}

const DATE_GROUP_ORDER = ['오늘', '어제', '이번 주', '이번 달', '이전']

function groupFlowsByDate(flows: FlowItem[]): DateGroup[] {
  const map = new Map<string, FlowItem[]>()
  for (const flow of flows) {
    const label = getDateGroupLabel(flow.createdAt)
    if (!map.has(label)) map.set(label, [])
    map.get(label)!.push(flow)
  }
  return DATE_GROUP_ORDER.filter((l) => map.has(l)).map((label) => ({
    label,
    flows: map.get(label)!,
  }))
}

export function AppSidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const locale = useLocale()
  const t = useTranslations()
  const { status: sessionStatus } = useSession()
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  /** 세션/쿼리로 자식 수가 달라지면 Radix useId 순서가 어긋나 hydration 경고가 난다. 첫 페인트는 동일 HTML로 맞춘 뒤 마운트 후 확장. */
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  const isHome = pathname === '/' || pathname === ''

  const { data: flows = [] } = useQuery<FlowItem[]>({
    queryKey: ['user-flows'],
    queryFn: async () => {
      const res = await fetch('/api/user/flows')
      if (!res.ok) return []
      return res.json()
    },
    enabled: sessionStatus === 'authenticated',
  })

  const dateGroups = groupFlowsByDate(flows)

  const switchLocale = (newLocale: 'ko' | 'en') => {
    router.replace(pathname, { locale: newLocale })
  }

  const handleProfileClick = () => {
    if (sessionStatus !== 'authenticated') {
      setAuthModalOpen(true)
      return
    }
    router.push('/my-page')
  }

  const handleLogout = () => {
    signOut({ callbackUrl: '/' })
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="flex flex-row items-center justify-between">
        <span className="truncate font-semibold group-data-[state=collapsed]:hidden">
          {t('common.appName')}
        </span>
        <SidebarTrigger />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t('common.dashboard')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={isHome} onClick={() => router.push('/')}>
                  <Home />
                  <span>{t('common.home')}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {mounted &&
          dateGroups.length > 0 &&
          dateGroups.map((group) => (
            <SidebarGroup key={group.label} className="group-data-[state=collapsed]:hidden">
              <SidebarGroupLabel className="text-[11px] font-normal text-muted-foreground">
                {group.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.flows.map((flow) => {
                    const isActive = pathname === `/flow/${flow.id}`
                    return (
                      <SidebarMenuItem key={flow.id}>
                        <SidebarMenuButton
                          isActive={isActive}
                          onClick={() => router.push(`/flow/${flow.id}`)}
                          className="h-auto items-start gap-2 py-2"
                        >
                          <span className="flex min-w-0 flex-1 flex-col gap-1">
                            <span className="w-0 min-w-full truncate text-[13px] leading-snug">
                              {flow.title ?? '제목 없는 플로우'}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Badge
                                variant="secondary"
                                className="h-4 rounded px-1 py-0 text-[10px] font-normal"
                              >
                                {flow.type === 'facebook' ? 'Facebook' : 'Email'}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground">
                                {new Date(flow.createdAt).toLocaleDateString('ko-KR', {
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </span>
                            </span>
                          </span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleProfileClick}>
              <User />
              <span>{t('common.profile')}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton>
                  <Settings />
                  <span>{t('common.settings')}</span>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="start" className="min-w-40">
                <div
                  className="flex rounded-md border p-0.5"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      switchLocale('ko')
                    }}
                    className={cn(
                      'flex-1 rounded px-2.5 py-1 text-xs font-medium transition-colors',
                      locale === 'ko'
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted bg-transparent'
                    )}
                  >
                    KO
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      switchLocale('en')
                    }}
                    className={cn(
                      'flex-1 rounded px-2.5 py-1 text-xs font-medium transition-colors',
                      locale === 'en'
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted bg-transparent'
                    )}
                  >
                    EN
                  </button>
                </div>
                <DropdownMenuSeparator />
                <div
                  className="flex rounded-md border p-0.5"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      setTheme('light')
                    }}
                    className={cn(
                      'flex flex-1 items-center justify-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors',
                      theme === 'light'
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted bg-transparent'
                    )}
                  >
                    <Sun className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      setTheme('dark')
                    }}
                    className={cn(
                      'flex flex-1 items-center justify-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors',
                      theme === 'dark'
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted bg-transparent'
                    )}
                  >
                    <Moon className="h-3.5 w-3.5" />
                  </button>
                </div>
                {mounted && sessionStatus === 'authenticated' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} variant="destructive">
                      <LogOut className="h-4 w-4" />
                      {t('common.settingsDropdown.logout')}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
    </Sidebar>
  )
}
