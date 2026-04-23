'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'

export type BrandKitData = {
  id?: string
  logoUrl: string | null
  primaryColor: string | null
  secondaryColor: string | null
  fontFamily: string | null
  tone: string | null
  feeling: string | null
}

export type BrandExtractResult = {
  brandName: string | null
  primaryColor: string | null
  secondaryColor: string | null
  logoUrl: string | null
  fontFamily: string | null
  tone: string | null
  feeling: string | null
  senderName: string | null
  confidence: number
}

const BRAND_KIT_KEY = ['my-page', 'brand-kit'] as const

export function useBrandKit() {
  const t = useTranslations('myPage.brandKit')
  const queryClient = useQueryClient()

  const query = useQuery<BrandKitData | null>({
    queryKey: BRAND_KIT_KEY,
    queryFn: async () => {
      const res = await fetch('/api/user/brand-kit')
      if (!res.ok) throw new Error('Failed to fetch')
      return res.json()
    },
  })

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<BrandKitData>) => {
      const res = await fetch('/api/user/brand-kit', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || res.statusText)
      }
      return res.json() as Promise<BrandKitData>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BRAND_KIT_KEY })
      toast.success(t('saveSuccess'))
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const extractMutation = useMutation({
    mutationFn: async (url: string) => {
      const res = await fetch('/api/user/brand-kit/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || res.statusText)
      }
      const json = await res.json()
      return json.data as BrandExtractResult
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return {
    data: query.data,
    isLoading: query.isLoading,
    save: saveMutation,
    extract: extractMutation,
  }
}
