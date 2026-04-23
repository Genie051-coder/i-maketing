import { notFound } from 'next/navigation'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { QueryProvider } from '@/shared/providers/QueryProvider'
import { SessionProvider } from '@/shared/providers/SessionProvider'
import { SidebarProvider } from '@/shared/ui/basic/sidebar'
import { OnboardingBanner } from '@/features/my-page/brand-kit/OnboardingBanner'
import { routing } from '@/i18n/routing'
import { AppSidebar } from '@/features/nodes/layout/AppSidebar'

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!routing.locales.includes(locale as 'ko' | 'en')) notFound()

  const messages = await getMessages()

  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      <SessionProvider>
        <QueryProvider>
          <SidebarProvider defaultOpen={true}>
            <AppSidebar />
            <main className="flex min-h-screen flex-1 flex-col">
              <OnboardingBanner />
              <div className="h-full flex-1">{children}</div>
            </main>
          </SidebarProvider>
        </QueryProvider>
      </SessionProvider>
    </NextIntlClientProvider>
  )
}
