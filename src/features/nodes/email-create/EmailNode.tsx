import { Mail } from 'lucide-react'
import type { EmailNodeData } from '@/features/flow/types'
import { NodeShell } from '../_shared/NodeShell'

interface EmailNodeProps {
  data?: EmailNodeData
  validationErrors?: string[]
  validationWarnings?: string[]
  executionResult?: {
    status: 'running' | 'success' | 'failed'
    message?: string
  }
}

export function EmailNode({
  data,
  validationErrors,
  validationWarnings,
  executionResult,
}: EmailNodeProps) {
  const blocks = data?.blocks as unknown[] | undefined
  const hasContent = (blocks?.length ?? 0) > 0 || !!data?.subject
  return (
    <NodeShell
      icon={<Mail className="h-[18px] w-[18px]" />}
      title="이메일"
      description={data?.subject || '제목 미설정'}
      isConfigured={!!hasContent}
      validationErrors={validationErrors}
      validationWarnings={validationWarnings}
      executionResult={executionResult}
    />
  )
}
