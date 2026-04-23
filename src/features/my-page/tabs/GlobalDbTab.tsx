'use client'

import { useTranslations } from 'next-intl'
import { Separator } from '@/shared/ui/basic/separator'
import { Badge } from '@/shared/ui/basic/badge'
import { Database, FileSpreadsheet, FileText, Clock } from 'lucide-react'

const COMING_SOON_FEATURES = [
  {
    icon: FileSpreadsheet,
    label: 'Excel / CSV',
    description: '스프레드시트 데이터를 노드에서 참조',
  },
  { icon: FileText, label: 'PDF', description: '문서 내용을 AI 노드에서 활용' },
  {
    icon: Database,
    label: 'DB 연결',
    description: '외부 데이터베이스 직접 연동',
  },
]

export function GlobalDbTab() {
  const t = useTranslations('myPage.globalDb')

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">{t('title')}</h2>
          <Badge variant="secondary" className="text-xs">
            Coming soon
          </Badge>
        </div>
        <p className="text-muted-foreground mt-1 text-sm">{t('description')}</p>
      </div>

      <Separator />

      <div className="space-y-3">
        {COMING_SOON_FEATURES.map(({ icon: Icon, label, description }) => (
          <div
            key={label}
            className="flex items-center gap-4 rounded-lg border border-dashed px-4 py-3 opacity-60"
          >
            <div className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-lg">
              <Icon className="text-muted-foreground size-4" />
            </div>
            <div>
              <p className="text-sm font-medium">{label}</p>
              <p className="text-muted-foreground text-xs">{description}</p>
            </div>
            <div className="text-muted-foreground ml-auto flex items-center gap-1 text-xs">
              <Clock className="size-3" />
              준비 중
            </div>
          </div>
        ))}
      </div>

      <p className="text-muted-foreground text-xs">{t('comingSoon')}</p>
    </div>
  )
}
