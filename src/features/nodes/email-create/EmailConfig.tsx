'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { useQuery } from '@tanstack/react-query'
import { DynamicModalHeader } from '@/shared/ui/components/DynamicModalHeader'
import { useRouter } from '@/i18n/navigation'
import { nanoid } from 'nanoid'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { getAvailablePlatforms, getDefaultSelectedModel } from '@/shared/ui/chat/constants'

import { EmailDropZone } from './ui/EmailDropZone'
import { RightPanel } from './ui/RightPanel'
import { EmailFormData, EmailBlock } from './types'
import { CAMPAIGN_TYPES, type CampaignType } from '../email-campaign-purpose/constants'
import { generateEmailTemplateBlocks } from '@/shared/ui/email/emailTemplateBlocks'

type BrandKit = {
  logoUrl?: string | null
  primaryColor?: string | null
  senderName?: string | null
  tone?: string | null
  feeling?: string | null
}
import { saveFlowState } from '@/features/flow/types'
import type { UpdateEmailConfigInput } from '@/app/api/email/agent/route'
import { useFlowStore } from '@/features/flow/store/useFlowStore'
import { useNodeVersions } from '../_shared/hooks/useNodeVersions'

const defaultVersionA: EmailFormData = {
  fromName: '',
  subject: '',
  previewText: '',
  brandColor: '',
  logoUrl: '',
  blocks: [],
}

type EmailConfigProps = { nodeId?: string }

export function EmailConfig({ nodeId }: EmailConfigProps) {
  const t = useTranslations()
  const router = useRouter()
  const node = useFlowStore((s) => s.nodes.find((n) => n.id === nodeId))
  const saveNodeConfig = useFlowStore((s) => s.saveNodeConfig)
  const closeConfig = useFlowStore((s) => s.closeConfig)

  // 캠페인 목적 노드에서 타입 읽기
  const campaignType = useFlowStore((s) => {
    const purposeNode = s.nodes.find((n) => n.type === 'campaign-purpose')
    return (purposeNode?.data as { campaignType?: CampaignType } | undefined)?.campaignType ?? null
  })
  const campaignInfo = campaignType
    ? (CAMPAIGN_TYPES.find((t) => t.id === campaignType) ?? null)
    : null

  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)

  const {
    activeVersion,
    setActiveVersion,
    versions,
    setVersions,
    activeData: emailForm,
    updateActive: handleFormChange,
    versionKeys,
    buildSavePayload,
  } = useNodeVersions<EmailFormData & Record<string, unknown>>(nodeId, node, {
    defaultData: defaultVersionA as EmailFormData & Record<string, unknown>,
    maxVersions: 3,
    parseFromNodeData: (data) => {
      if (!data || typeof data !== 'object' || !('subject' in data)) return null
      const d = data as {
        fromName?: string
        subject?: string
        previewText?: string
        brandColor?: string
        logoUrl?: string
        blocks?: unknown[]
      }
      const blocks = Array.isArray(d.blocks) ? (d.blocks as EmailBlock[]) : undefined
      return {
        fromName: typeof d.fromName === 'string' ? d.fromName : undefined,
        subject: typeof d.subject === 'string' ? d.subject : undefined,
        previewText: typeof d.previewText === 'string' ? d.previewText : undefined,
        brandColor: typeof d.brandColor === 'string' ? d.brandColor : undefined,
        logoUrl: typeof d.logoUrl === 'string' ? d.logoUrl : undefined,
        ...(blocks ? { blocks } : {}),
      }
    },
    parseFromVersionData: (v) =>
      ({
        ...defaultVersionA,
        ...(v.data as Partial<EmailFormData>),
      }) as EmailFormData & Record<string, unknown>,
  })

  const handleAddVersion = useCallback(() => {
    const nextLabel = String.fromCharCode(activeVersion.charCodeAt(0) + 1)
    if (nextLabel > 'C') {
      alert(t('emailCampaign.maxVersionsAlert'))
      return
    }
    const current = versions[activeVersion]
    setVersions((prev) => ({
      ...prev,
      [nextLabel]: {
        ...current,
        subject: `[시안 ${nextLabel}] ${current?.subject ?? ''}`,
      } as EmailFormData & Record<string, unknown>,
    }))
    setActiveVersion(nextLabel)
  }, [activeVersion, versions, setVersions, setActiveVersion, t])

  const { data: brandKit } = useQuery<BrandKit | null>({
    queryKey: ['my-page', 'brand-kit'],
    queryFn: async () => {
      const res = await fetch('/api/user/brand-kit')
      if (!res.ok) return null
      return res.json()
    },
  })

  // 신규 이메일(nodeId 없음)에서 브랜드 키트 최초 로드 시 자동 반영
  const brandKitAutoApplied = useRef(false)
  useEffect(() => {
    if (nodeId || !brandKit || brandKitAutoApplied.current) return
    brandKitAutoApplied.current = true
    const updates: Partial<EmailFormData> = {}
    if (brandKit.primaryColor) updates.brandColor = brandKit.primaryColor
    if (brandKit.logoUrl) updates.logoUrl = brandKit.logoUrl
    if (brandKit.senderName) updates.fromName = brandKit.senderName
    if (Object.keys(updates).length > 0) handleFormChange(updates)
  }, [brandKit, nodeId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleApplyTemplate = useCallback(() => {
    if (!campaignType) return
    handleFormChange({
      blocks: generateEmailTemplateBlocks(campaignType, {
        logoUrl: brandKit?.logoUrl,
        companyName: brandKit?.senderName,
      }),
    })
  }, [campaignType, brandKit, handleFormChange])

  const handleApplyBrandKit = useCallback(() => {
    if (!brandKit) return
    handleFormChange({
      ...(brandKit.primaryColor ? { brandColor: brandKit.primaryColor } : {}),
      ...(brandKit.logoUrl ? { logoUrl: brandKit.logoUrl } : {}),
      ...(brandKit.senderName ? { fromName: brandKit.senderName } : {}),
    })
  }, [brandKit, handleFormChange])

  const { data: aiKeys = [] } = useQuery<{ id: string; provider: string }[]>({
    queryKey: ['my-page', 'ai-keys'],
    queryFn: async () => {
      const res = await fetch('/api/user/ai-keys')
      if (!res.ok) return []
      return res.json()
    },
  })
  const availablePlatforms = useMemo(() => getAvailablePlatforms(aiKeys), [aiKeys])
  const [selectedModel, setSelectedModel] = useState('')
  useEffect(() => {
    if (availablePlatforms.length > 0 && !selectedModel) {
      setSelectedModel(getDefaultSelectedModel(availablePlatforms))
    }
  }, [availablePlatforms, selectedModel])

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/email/agent',
      body: {
        emailForm,
        selectedModel,
        brandVoice: brandKit ? { tone: brandKit.tone, feeling: brandKit.feeling } : null,
        brandKitLogoUrl: brandKit?.logoUrl ?? null,
        campaignType,
      },
    }),
    onFinish: ({ messages: finishedMessages }) => {
      const last = finishedMessages[finishedMessages.length - 1]
      if (last?.role !== 'assistant' || !last.parts) return
      for (const part of last.parts) {
        if (
          part.type === 'tool-updateEmailConfig' &&
          'input' in part &&
          part.input &&
          typeof part.input === 'object'
        ) {
          const input = part.input as UpdateEmailConfigInput
          handleFormChange({
            subject: input.subject ?? emailForm.subject,
            previewText: input.previewText ?? emailForm.previewText,
            ...(input.fromName != null && { fromName: input.fromName }),
            ...(input.brandColor != null && { brandColor: input.brandColor }),
            ...(input.logoUrl != null && { logoUrl: input.logoUrl }),
            blocks: Array.isArray(input.content) ? input.content : emailForm.blocks,
          })
          break
        }
      }
    },
  })

  const handleAiSend = (text: string) => {
    sendMessage(
      { text },
      {
        body: {
          emailForm,
          selectedModel,
          brandVoice: brandKit ? { tone: brandKit.tone, feeling: brandKit.feeling } : null,
          brandKitLogoUrl: brandKit?.logoUrl ?? null,
          campaignType,
        },
      }
    )
  }

  const handleAddBlock = useCallback(
    (type: string) => {
      const newId = Date.now().toString()
      let newBlock: EmailBlock

      switch (type) {
        case 'Logo':
          newBlock = {
            id: newId,
            type: 'Logo',
            url: brandKit?.logoUrl ?? '',
            width: 120,
          }
          break
        case 'Text':
          newBlock = { id: newId, type: 'Text', content: '', level: 'body' }
          break
        case 'Image':
          newBlock = { id: newId, type: 'Image', url: '', alt: '' }
          break
        case 'Button':
          newBlock = {
            id: newId,
            type: 'Button',
            content: '지금 확인하기',
            url: 'https://',
          }
          break
        case 'List':
          newBlock = { id: newId, type: 'List', items: [''], style: 'bullet' }
          break
        case 'Hr':
          newBlock = { id: newId, type: 'Hr' }
          break
        case 'TwoColumn':
          newBlock = {
            id: newId,
            type: 'TwoColumn',
            leftContent: '',
            rightContent: '',
          }
          break
        case 'SnsShare':
          newBlock = {
            id: newId,
            type: 'SnsShare',
            platforms: ['twitter', 'facebook', 'instagram'],
          }
          break
        case 'SnsLinks':
          newBlock = {
            id: newId,
            type: 'SnsLinks',
            links: [{ platform: 'instagram', url: '' }],
          }
          break
        case 'VideoPreview':
          newBlock = { id: newId, type: 'VideoPreview', videoUrl: '' }
          break
        case 'Html':
          newBlock = { id: newId, type: 'Html', code: '' }
          break
        case 'Footer':
          newBlock = {
            id: newId,
            type: 'Footer',
            companyName: emailForm.fromName || '',
            address: '',
            unsubscribeUrl: '',
          }
          break
        case 'Spacer':
          newBlock = { id: newId, type: 'Spacer', height: 32 }
          break
        default:
          newBlock = { id: newId, type: 'Hr' }
      }

      handleFormChange({ blocks: [...(emailForm.blocks || []), newBlock] })
      setSelectedBlockId(newId)
    },
    [emailForm, handleFormChange, brandKit]
  )

  const handleUpdateBlock = useCallback(
    (index: number, newBlock: EmailBlock) => {
      const newBlocks = [...(emailForm.blocks || [])]
      newBlocks[index] = newBlock
      handleFormChange({ blocks: newBlocks })
    },
    [emailForm.blocks, handleFormChange]
  )

  const handleDeleteBlock = useCallback(
    (id: string) => {
      handleFormChange({
        blocks: (emailForm.blocks || []).filter((b) => b.id !== id),
      })
      if (selectedBlockId === id) setSelectedBlockId(null)
    },
    [emailForm.blocks, handleFormChange, selectedBlockId]
  )

  const handleSave = async () => {
    if (nodeId) {
      const payload = buildSavePayload(emailForm)
      const ok = await saveNodeConfig(nodeId, payload)
      if (ok) closeConfig()
      return
    }
    const flowId = nanoid()
    const newNodeId = nanoid()
    saveFlowState(flowId, {
      nodes: [
        {
          id: newNodeId,
          type: 'email',
          position: { x: 120, y: 80 },
          data: {
            subject: emailForm.subject,
            fromName: emailForm.fromName,
          },
        },
      ],
    })
    router.push(`/flow/${flowId}`)
  }

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
      <DynamicModalHeader
        activeVersion={activeVersion}
        onActiveVersionChange={setActiveVersion}
        versionKeys={versionKeys}
        onAddVersion={handleAddVersion}
        versionLabelPrefix={t('emailCampaign.version')}
        onSave={handleSave}
      />

      {/* 60 / 40 split */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Left 60%: visual preview + DnD */}
        <div className="min-h-0 flex-6 overflow-hidden">
          <EmailDropZone
            emailForm={emailForm}
            selectedBlockId={selectedBlockId}
            onSelectBlock={setSelectedBlockId}
            onUpdateBlocks={(blocks) => handleFormChange({ blocks })}
            onDeleteBlock={handleDeleteBlock}
          />
        </div>

        {/* Right 40%: edit panel or AI chat */}
        <div className="min-h-0 w-[400px] shrink-0 overflow-hidden">
          <RightPanel
            emailForm={emailForm}
            onFormChange={handleFormChange}
            selectedBlockId={selectedBlockId}
            onSelectBlock={setSelectedBlockId}
            onAddBlock={handleAddBlock}
            onUpdateBlock={handleUpdateBlock}
            onDeleteBlock={handleDeleteBlock}
            brandKit={brandKit ?? null}
            onApplyBrandKit={handleApplyBrandKit}
            campaignType={campaignType}
            campaignInfo={campaignInfo}
            onApplyTemplate={handleApplyTemplate}
            messages={messages}
            aiStatus={status}
            aiError={error}
            onAiSend={handleAiSend}
            availablePlatforms={availablePlatforms}
            selectedModel={selectedModel}
            onSelectedModelChange={setSelectedModel}
          />
        </div>
      </div>
    </div>
  )
}
