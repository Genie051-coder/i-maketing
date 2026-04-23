import { nanoid } from 'nanoid'
import type { CampaignType } from '@/features/nodes/email-campaign-purpose/constants'
import type { EmailBlock } from '@/features/nodes/email-create/types'

export interface EmailTemplateOptions {
  logoUrl?: string | null
  companyName?: string | null
}

export function generateEmailTemplateBlocks(
  type: CampaignType,
  options: EmailTemplateOptions = {}
): EmailBlock[] {
  const logoBlock: EmailBlock = {
    id: nanoid(),
    type: 'Logo',
    url: options.logoUrl ?? '',
    width: 120,
  }
  const footerBlock: EmailBlock = {
    id: nanoid(),
    type: 'Footer',
    companyName: options.companyName ?? '',
    address: '',
    unsubscribeUrl: '',
  }

  switch (type) {
    case 'promotion':
      return [
        logoBlock,
        {
          id: nanoid(),
          type: 'Text',
          content: '지금만 누릴 수 있는 특별 혜택',
          level: 'h1',
        },
        { id: nanoid(), type: 'Image', url: '', alt: '프로모션 이미지' },
        {
          id: nanoid(),
          type: 'Text',
          content: '혜택 내용을 여기에 입력하세요.',
          level: 'body',
        },
        {
          id: nanoid(),
          type: 'Button',
          content: '지금 확인하기',
          url: 'https://',
        },
        footerBlock,
      ]
    case 'newsletter':
      return [
        logoBlock,
        { id: nanoid(), type: 'Text', content: '이번 주 소식', level: 'h1' },
        { id: nanoid(), type: 'Hr' },
        {
          id: nanoid(),
          type: 'Text',
          content: '안녕하세요! 이번 주 준비된 콘텐츠를 소개합니다.',
          level: 'body',
        },
        { id: nanoid(), type: 'Hr' },
        footerBlock,
      ]
    case 'onboarding':
      return [
        logoBlock,
        { id: nanoid(), type: 'Text', content: '환영합니다! 🎉', level: 'h1' },
        {
          id: nanoid(),
          type: 'Text',
          content: '가입해 주셔서 감사합니다. 지금부터 함께 시작해봐요!',
          level: 'body',
        },
        { id: nanoid(), type: 'Button', content: '시작하기', url: 'https://' },
        footerBlock,
      ]
  }
}
