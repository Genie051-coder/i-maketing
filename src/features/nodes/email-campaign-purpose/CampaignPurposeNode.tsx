import { LayoutGrid } from 'lucide-react'
import { NodeShell } from '../_shared/NodeShell'

interface CampaignPurposeNodeProps {
  data?: Record<string, unknown>
  validationErrors?: string[]
  validationWarnings?: string[]
  executionResult?: {
    status: 'running' | 'success' | 'failed'
    message?: string
  }
}

export function CampaignPurposeNode({
  data,
  validationErrors,
  validationWarnings,
  executionResult,
}: CampaignPurposeNodeProps) {
  return (
    <NodeShell
      icon={<LayoutGrid className="h-[18px] w-[18px]" />}
      title="캠페인 목적"
      description={typeof data?.campaignType === 'string' ? data.campaignType : '목적 미설정'}
      isConfigured={!!data?.campaignType}
      validationErrors={validationErrors}
      validationWarnings={validationWarnings}
      executionResult={executionResult}
    />
  )
}
