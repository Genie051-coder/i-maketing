import type { LucideIcon } from 'lucide-react'
import { Megaphone, Newspaper, HandMetal } from 'lucide-react'

export type CampaignType = 'promotion' | 'newsletter' | 'onboarding'

export interface CampaignTypeOption {
  id: CampaignType
  label: string
  description: string
  icon: LucideIcon
  iconBg: string
  iconColor: string
  examples: string[]
  nameTemplate: string
}

export const CAMPAIGN_TYPES: CampaignTypeOption[] = [
  {
    id: 'promotion',
    label: '프로모션',
    description: '할인·이벤트·신제품 알림',
    icon: Megaphone,
    iconBg: 'bg-orange-50',
    iconColor: 'text-orange-500',
    examples: ['시즌 세일', '신제품 출시', '쿠폰 발송'],
    nameTemplate: '프로모션',
  },
  {
    id: 'newsletter',
    label: '뉴스레터',
    description: '정기적인 콘텐츠·소식 공유',
    icon: Newspaper,
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-500',
    examples: ['주간 인사이트', '큐레이션', '업계 소식'],
    nameTemplate: '뉴스레터',
  },
  {
    id: 'onboarding',
    label: '온보딩',
    description: '신규 구독자 환영·안내',
    icon: HandMetal,
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-500',
    examples: ['가입 환영', '서비스 소개', '첫 혜택 안내'],
    nameTemplate: '온보딩',
  },
]

export const CAMPAIGN_META: Record<
  CampaignType,
  {
    aiPromptHint: string
    recommendedSendTime: string
    requiredBlocks: string[]
    checklistItems: string[]
  }
> = {
  promotion: {
    aiPromptHint: '프로모션 이메일. CTA 중심, 혜택 강조',
    recommendedSendTime: '10:00',
    requiredBlocks: ['header', 'image', 'button'],
    checklistItems: ['CTA 링크 확인', '할인 조건 명시'],
  },
  newsletter: {
    aiPromptHint: '뉴스레터. 정보 중심, 읽기 편한 구조',
    recommendedSendTime: '화요일 09:00',
    requiredBlocks: ['header', 'text', 'divider'],
    checklistItems: ['구독 취소 링크', '발신자 정보'],
  },
  onboarding: {
    aiPromptHint: '온보딩 이메일. 친근한 톤, 핵심 기능 소개',
    recommendedSendTime: '가입 직후',
    requiredBlocks: ['header', 'text', 'button'],
    checklistItems: ['환영 메시지', '다음 단계 안내'],
  },
}
