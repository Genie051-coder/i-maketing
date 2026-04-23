/**
 * AI 모델 인스턴스 팩토리
 *
 * 유저가 마이페이지에 등록한 API 키를 DB에서 조회하고,
 * 선택한 플랫폼(Anthropic / OpenAI / Gemini)에 맞는 LanguageModel 인스턴스를 반환합니다.
 *
 * selectedModel 형식: "platformId:modelId" (예: "anthropic:claude-3-5-haiku")
 */
import type { LanguageModel } from 'ai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { prisma } from '@/shared/libs/prisma'
import { PLATFORM_ID_TO_DB_PROVIDER } from '@/shared/ui/chat/constants'

const ALLOWED_PROVIDERS = ['ANTHROPIC', 'OPENAI', 'GEMINI'] as const
type DbProvider = (typeof ALLOWED_PROVIDERS)[number]

function isDbProvider(s: string): s is DbProvider {
  return ALLOWED_PROVIDERS.includes(s as DbProvider)
}

/**
 * selectedModel: "platformId:modelId" (예: "anthropic:claude-3-5-haiku")
 * 마이페이지에 등록된 유저 API 키로 해당 플랫폼/모델 인스턴스를 반환합니다.
 */
export async function getModelForUser(
  userId: string,
  selectedModel: string
): Promise<LanguageModel | null> {
  const [platformId, modelId] = selectedModel.includes(':') ? selectedModel.split(':') : ['', '']
  if (!platformId || !modelId) return null

  const provider = PLATFORM_ID_TO_DB_PROVIDER[platformId]
  if (!provider || !isDbProvider(provider)) return null

  const row = await (
    prisma as unknown as {
      userApiKey: {
        findUnique: (args: {
          where: { userId_provider: { userId: string; provider: string } }
          select: { encryptedValue: true }
        }) => Promise<{ encryptedValue: string } | null>
      }
    }
  ).userApiKey.findUnique({
    where: { userId_provider: { userId, provider } },
    select: { encryptedValue: true },
  })
  if (!row?.encryptedValue) return null

  const apiKey = row.encryptedValue

  switch (provider) {
    case 'ANTHROPIC': {
      const anthropic = createAnthropic({ apiKey })
      return anthropic(modelId) as LanguageModel
    }
    case 'OPENAI': {
      const openai = createOpenAI({ apiKey })
      return openai(modelId) as LanguageModel
    }
    case 'GEMINI': {
      const google = createGoogleGenerativeAI({ apiKey })
      return google(modelId) as LanguageModel
    }
    default:
      return null
  }
}
