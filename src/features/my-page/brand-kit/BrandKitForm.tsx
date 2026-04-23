'use client'

import { useState, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/shared/ui/basic/card'
import { Button } from '@/shared/ui/basic/button'
import { Input } from '@/shared/ui/basic/input'
import { Label } from '@/shared/ui/basic/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/basic/select'
import { useBrandKit, type BrandKitData } from './useBrandKit'
import { BrandKitPreview } from './BrandKitPreview'

const TONES = ['casual', 'professional', 'witty', 'warm'] as const

const FEELINGS = ['exciting', 'reassuring', 'trustworthy', 'inspiring'] as const

const FONTS = ['Pretendard', 'Noto Sans KR', 'Spoqa Han Sans', 'Apple SD Gothic Neo'] as const

const EMPTY_KIT = {
  logoUrl: '',
  primaryColor: '#6366f1',
  secondaryColor: '#f1f5f9',
  fontFamily: 'Pretendard',
  tone: '',
  feeling: '',
}

function SectionHeader({ step, title, desc }: { step: number; title: string; desc?: string }) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <span className="bg-primary/10 text-primary mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold">
        {step}
      </span>
      <div className="flex items-center gap-2">
        <div>
          <p className="font-semibold">{title}</p>
          {desc && <p className="text-muted-foreground mt-0.5 text-xs">{desc}</p>}
        </div>
      </div>
    </div>
  )
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-10 cursor-pointer rounded-lg border"
      />
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-muted-foreground text-xs">{value}</p>
      </div>
    </div>
  )
}

export function BrandKitForm() {
  const t = useTranslations('myPage.brandKit')
  const { data: saved, isLoading, save, extract } = useBrandKit()

  const [kit, setKit] = useState(EMPTY_KIT)
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (saved) {
      setKit({
        logoUrl: saved.logoUrl ?? '',
        primaryColor: saved.primaryColor ?? '#6366f1',
        secondaryColor: saved.secondaryColor ?? '#f1f5f9',
        fontFamily: saved.fontFamily ?? 'Pretendard',
        tone: saved.tone ?? '',
        feeling: saved.feeling ?? '',
      })
    }
  }, [saved])

  const update = useCallback((key: string, val: string) => {
    setKit((prev) => ({ ...prev, [key]: val }))
    setDirty(true)
  }, [])

  const handleExtract = async () => {
    if (!websiteUrl) return
    const result = await extract.mutateAsync(websiteUrl)
    setKit((prev) => ({
      ...prev,
      ...(result.primaryColor && { primaryColor: result.primaryColor }),
      ...(result.secondaryColor && { secondaryColor: result.secondaryColor }),
      ...(result.logoUrl && { logoUrl: result.logoUrl }),
      ...(result.fontFamily && { fontFamily: result.fontFamily }),
      ...(result.tone && { tone: result.tone }),
      ...(result.feeling && { feeling: result.feeling }),
      ...(result.senderName && { senderName: result.senderName }),
    }))
    setDirty(true)
  }

  const handleSave = () => {
    const payload: Partial<BrandKitData> = { ...kit }
    save.mutate(payload, { onSuccess: () => setDirty(false) })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{t('title')}</h2>
        <p className="text-muted-foreground mt-1 text-sm">{t('description')}</p>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ── LEFT: Form ── */}
        <div className="space-y-5">
          {/* 1. URL 자동 추출 */}
          <Card>
            <CardContent>
              <SectionHeader step={1} title={t('extract.title')} desc={t('extract.desc')} />
              <div className="flex gap-2">
                <Input
                  placeholder="https://yourbrand.com"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleExtract} disabled={extract.isPending || !websiteUrl.trim()}>
                  {extract.isPending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      {t('extract.loading')}
                    </>
                  ) : (
                    t('extract.button')
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 2. 시각 요소 */}
          <Card>
            <CardContent>
              <SectionHeader step={2} title={t('visual.title')} desc={t('visual.desc')} />
              <div className="space-y-4">
                <div>
                  <Label>{t('visual.logoUrl')}</Label>
                  <Input
                    placeholder="https://yourbrand.com/logo.png"
                    value={kit.logoUrl}
                    onChange={(e) => update('logoUrl', e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div className="flex gap-6">
                  <ColorField
                    label={t('visual.primaryColor')}
                    value={kit.primaryColor}
                    onChange={(v) => update('primaryColor', v)}
                  />
                  <ColorField
                    label={t('visual.secondaryColor')}
                    value={kit.secondaryColor}
                    onChange={(v) => update('secondaryColor', v)}
                  />
                </div>
                <div>
                  <Label>{t('visual.font')}</Label>
                  <Select value={kit.fontFamily} onValueChange={(v) => update('fontFamily', v)}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FONTS.map((f) => (
                        <SelectItem key={f} value={f}>
                          {f}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 3. 브랜드 보이스 */}
          <Card>
            <CardContent>
              <SectionHeader step={3} title={t('voice.title')} desc={t('voice.desc')} />
              <div className="space-y-4">
                <div>
                  <Label className="mb-2 block">{t('voice.tone')}</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {TONES.map((tone) => (
                      <button
                        key={tone}
                        type="button"
                        onClick={() => update('tone', tone)}
                        className={`rounded-lg border px-3 py-2.5 text-left text-sm transition-all ${
                          kit.tone === tone
                            ? 'border-primary bg-primary/5 text-primary font-medium'
                            : 'border-border text-muted-foreground hover:border-muted-foreground/40'
                        }`}
                      >
                        {t(`voice.tones.${tone}`)}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="mb-2 block">{t('voice.feeling')}</Label>
                  <div className="flex flex-wrap gap-2">
                    {FEELINGS.map((feeling) => (
                      <button
                        key={feeling}
                        type="button"
                        onClick={() => update('feeling', feeling)}
                        className={`rounded-full border px-3 py-1.5 text-sm transition-all ${
                          kit.feeling === feeling
                            ? 'border-primary bg-primary/5 text-primary font-medium'
                            : 'border-border text-muted-foreground hover:border-muted-foreground/40'
                        }`}
                      >
                        {t(`voice.feelings.${feeling}`)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save */}
          <Button
            onClick={handleSave}
            disabled={save.isPending || !dirty}
            className="w-full"
            size="lg"
          >
            {save.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {t('saving')}
              </>
            ) : (
              t('save')
            )}
          </Button>
        </div>

        {/* ── RIGHT: Preview ── */}
        <div className="h-fit lg:sticky lg:top-6">
          <BrandKitPreview
            logoUrl={kit.logoUrl}
            primaryColor={kit.primaryColor}
            secondaryColor={kit.secondaryColor}
            fontFamily={kit.fontFamily}
            tone={kit.tone}
          />
        </div>
      </div>
    </div>
  )
}
