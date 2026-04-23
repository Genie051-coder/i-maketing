'use client'

import { useTranslations } from 'next-intl'

type Props = {
  logoUrl: string
  primaryColor: string
  secondaryColor: string
  fontFamily: string
  tone: string
}

const SAMPLE_COPY: Record<string, { subject: string; body: string }> = {
  casual: {
    subject: '이번 주 뉴스레터 도착! 📬',
    body: '안녕하세요! 이번 주도 알차게 준비했어요. 같이 살펴볼까요?',
  },
  professional: {
    subject: '3월 마케팅 인사이트 리포트',
    body: '안녕하세요. 이번 달 주요 지표와 인사이트를 공유드립니다.',
  },
  witty: {
    subject: '읽지 않으면 후회하는 뉴스레터 😏',
    body: '또 왔어요. 이번엔 진짜 유용한 거 들고 왔으니까 믿어봐요!',
  },
  warm: {
    subject: '오늘 하루도 수고하셨어요 🌿',
    body: '바쁜 일상 속에서도 잠깐 쉬어가세요. 오늘의 이야기를 전합니다.',
  },
}

export function BrandKitPreview({
  logoUrl,
  primaryColor,
  secondaryColor,
  fontFamily,
  tone,
}: Props) {
  const t = useTranslations('myPage.brandKit.preview')
  const primary = primaryColor || '#6366f1'
  const bgColor = secondaryColor || '#f1f5f9'
  const font = fontFamily || 'Pretendard, sans-serif'
  const name = t('brandName')
  const copy = SAMPLE_COPY[tone] || SAMPLE_COPY.casual

  return (
    <div className="rounded-lg border p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold">{t('title')}</p>
        <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs">
          {t('autoSync')}
        </span>
      </div>

      <div
        className="overflow-hidden rounded-md border text-sm shadow-sm"
        style={{ fontFamily: font }}
      >
        {/* Inbox header */}
        <div className="border-b bg-white px-4 py-3 dark:bg-neutral-900">
          <p className="text-muted-foreground mb-1 text-xs">{t('inbox')}</p>
          <p className="text-sm font-semibold">{copy.subject}</p>
          <p className="text-muted-foreground mt-1 text-xs">
            {t('from')}: {name}
          </p>
        </div>

        {/* Email body */}
        <div className="space-y-4 p-5" style={{ backgroundColor: bgColor }}>
          {/* Header band */}
          <div className="rounded-lg px-5 py-4 text-white" style={{ backgroundColor: primary }}>
            {logoUrl ? (
              <img src={logoUrl} alt="logo" className="mb-2 h-7 object-contain" />
            ) : (
              <div className="mb-1 text-base font-bold text-white">{name}</div>
            )}
            <p className="text-xs text-white/80">Monthly Newsletter</p>
          </div>

          {/* Content card */}
          <div className="space-y-3 rounded-lg bg-white p-4 dark:bg-neutral-900">
            <p className="leading-relaxed">{copy.body}</p>
            <p className="text-muted-foreground text-xs">{t('bodyExtra')}</p>
            <button
              className="mt-2 rounded-lg px-4 py-2 text-xs font-semibold text-white"
              style={{ backgroundColor: primary }}
              type="button"
              onClick={(e) => e.preventDefault()}
            >
              {t('cta')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
