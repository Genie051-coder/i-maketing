import type React from 'react'
import type { ValidationResult } from './_shared/types'

// Node display components
import { EmailNode } from './email-create/EmailNode'
import { CampaignPurposeNode } from './email-campaign-purpose/CampaignPurposeNode'
import { AddressBookNode } from './email-address-book/AddressBookNode'
import { SendSettingsNode } from './email-send-settings/SendSettingsNode'
import { ConfirmSendNode } from './email-confirm-send/ConfirmSendNode'
import { NewsSourceNode } from './news-source/NewsSourceNode'
import { FbUrlInputNode } from './fb-url-input/FbUrlInputNode'
import { FbSummaryNode } from './fb-summary/FbSummaryNode'
import { FbPreviewNode } from './fb-preview/FbPreviewNode'
import { FbPublishNode } from './fb-publish/FbPublishNode'

// Node config components
import { EmailConfig } from './email-create/EmailConfig'
import { CampaignPurposeConfig } from './email-campaign-purpose/CampaignPurposeConfig'
import { AddressBookConfig } from './email-address-book/AddressBookConfig'
import { SendSettingsConfig } from './email-send-settings/SendSettingsConfig'
import { ConfirmSendConfig } from './email-confirm-send/ConfirmSendConfig'
// Validation
import { validateEmailNode } from './email-create/validation'

export type NodeType =
  | 'email'
  | 'campaign-purpose'
  | 'address-book'
  | 'send-settings'
  | 'confirm-send'
  | 'news-source'
  | 'fb-url-input'
  | 'fb-summary'
  | 'fb-preview'
  | 'fb-publish'

export type NodeDisplayProps = {
  nodeId?: string
  data?: Record<string, unknown>
  validationErrors?: string[]
  validationWarnings?: string[]
  executionResult?: {
    status: 'running' | 'success' | 'failed'
    message?: string
  }
}

export type NodeConfigProps = {
  nodeId?: string
}

export type NodeRegistryEntry = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Node: React.ComponentType<any>
  Config: React.ComponentType<NodeConfigProps> | null
  validate: (data: Record<string, unknown> | undefined) => ValidationResult
  meta: {
    label: string
    description: string
    category: string
    /** 이 노드가 표시되려면 선행 노드에 어떤 필드가 있어야 하는지 */
    prereq?: { depType: NodeType; depField: string }
  }
}

const pass = (): ValidationResult => ({ errors: [], warnings: [], valid: true })

export const nodeRegistry: Record<NodeType, NodeRegistryEntry> = {
  email: {
    Node: EmailNode,
    Config: EmailConfig,
    validate: (data) => validateEmailNode(data as Parameters<typeof validateEmailNode>[0]),
    meta: {
      label: '이메일',
      description: '이메일 콘텐츠를 작성하고 설정합니다.',
      category: '콘텐츠',
    },
  },
  'campaign-purpose': {
    Node: CampaignPurposeNode,
    Config: CampaignPurposeConfig,
    validate: pass,
    meta: {
      label: '캠페인 목적',
      description: '캠페인의 목적과 타입을 설정합니다.',
      category: '기획',
    },
  },
  'address-book': {
    Node: AddressBookNode,
    Config: AddressBookConfig,
    validate: pass,
    meta: {
      label: '주소록',
      description: '수신자 주소록을 연결합니다.',
      category: '수신자',
    },
  },
  'send-settings': {
    Node: SendSettingsNode,
    Config: SendSettingsConfig,
    validate: pass,
    meta: {
      label: '발송 설정',
      description: '발송 시점과 방식을 설정합니다.',
      category: '발송',
    },
  },
  'confirm-send': {
    Node: ConfirmSendNode,
    Config: ConfirmSendConfig,
    validate: pass,
    meta: {
      label: '발송 확인',
      description: '최종 발송 전 내용을 확인합니다.',
      category: '발송',
    },
  },
  'news-source': {
    Node: NewsSourceNode,
    Config: null,
    validate: pass,
    meta: {
      label: '기사 선택',
      description: 'Google RSS에서 뉴스 기사를 선택합니다.',
      category: '페이스북',
    },
  },
  'fb-url-input': {
    Node: FbUrlInputNode,
    Config: null,
    validate: pass,
    meta: {
      label: '링크 입력',
      description: '기사 URL을 직접 입력합니다.',
      category: '페이스북',
      prereq: { depType: 'news-source', depField: 'selectedTitle' },
    },
  },
  'fb-summary': {
    Node: FbSummaryNode,
    Config: null,
    validate: pass,
    meta: {
      label: 'AI 콘텐츠 생성',
      description: 'AI와 콘텐츠를 생성합니다.',
      category: '페이스북',
      prereq: { depType: 'fb-url-input', depField: 'articleUrl' },
    },
  },
  'fb-preview': {
    Node: FbPreviewNode,
    Config: null,
    validate: pass,
    meta: {
      label: '콘텐츠 검증',
      description: '페이스북 포스팅을 미리보고 검증합니다.',
      category: '페이스북',
      prereq: { depType: 'fb-summary', depField: 'summary' },
    },
  },
  'fb-publish': {
    Node: FbPublishNode,
    Config: null,
    validate: pass,
    meta: {
      label: '배포',
      description: '페이스북에 포스팅을 게시합니다.',
      category: '페이스북',
      prereq: { depType: 'fb-preview', depField: 'approved' },
    },
  },
}
