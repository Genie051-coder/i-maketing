export type ModelKind = 'text' | 'image' | 'video' | 'music'

export interface ModelOption {
  id: string
  name: string
  kind: ModelKind
  description?: string
}

export interface PlatformOption {
  id: string
  displayName: string
  assetPath: string
  models: ModelOption[]
}

export const PLATFORMS: readonly PlatformOption[] = [
  {
    id: 'google',
    displayName: 'Google',
    assetPath: '@/shared/assets/gemini.svg',
    models: [
      {
        id: 'gemini-3-flash',
        name: 'Gemini 3 Flash',
        kind: 'text',
      },
      {
        id: 'nano-banana-2',
        name: 'Nano Banana 2',
        kind: 'image',
      },
    ],
  },
  {
    id: 'openai',
    displayName: 'OpenAI',
    assetPath: '@/shared/assets/openAi.svg',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o', kind: 'text' },

      { id: 'dall-e-3', name: 'DALL-E 3', kind: 'image' },
    ],
  },
  {
    id: 'anthropic',
    displayName: 'Anthropic',
    assetPath: '@/shared/assets/anthropic.svg',
    models: [{ id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', kind: 'text' }],
  },
] as const

/** 마이페이지 API 키 provider (DB) → ChatInput 플랫폼 id */
export const DB_PROVIDER_TO_PLATFORM_ID: Record<string, string> = {
  ANTHROPIC: 'anthropic',
  OPENAI: 'openai',
  GEMINI: 'google',
}

/** ChatInput 플랫폼 id → 마이페이지 API 키 provider (DB) */
export const PLATFORM_ID_TO_DB_PROVIDER: Record<string, string> = {
  anthropic: 'ANTHROPIC',
  openai: 'OPENAI',
  google: 'GEMINI',
}

/** 등록된 키 목록(provider[])으로 선택 가능한 플랫폼만 필터 */
export function getAvailablePlatforms(keys: { provider: string }[]): PlatformOption[] {
  const allowedIds = new Set(
    keys.map((k) => DB_PROVIDER_TO_PLATFORM_ID[k.provider]).filter(Boolean)
  )
  return PLATFORMS.filter((p) => allowedIds.has(p.id)) as PlatformOption[]
}

/** 플랫폼 목록에서 기본 선택값 "platformId:modelId" (텍스트 모델 우선) */
export function getDefaultSelectedModel(platforms: readonly PlatformOption[]): string {
  const first = platforms[0]
  if (!first) return ''
  const textModel = first.models.find((m) => m.kind === 'text') ?? first.models[0]
  return textModel ? `${first.id}:${textModel.id}` : ''
}
