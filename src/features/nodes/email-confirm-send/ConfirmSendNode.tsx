import { CheckCircle } from 'lucide-react'
import { NodeShell } from '../_shared/NodeShell'

interface ConfirmSendNodeProps {
  validationErrors?: string[]
  validationWarnings?: string[]
  executionResult?: {
    status: 'running' | 'success' | 'failed'
    message?: string
  }
}

export function ConfirmSendNode({
  validationErrors,
  validationWarnings,
  executionResult,
}: ConfirmSendNodeProps) {
  return (
    <NodeShell
      icon={<CheckCircle className="h-[18px] w-[18px]" />}
      title="발송 확인"
      description="최종 발송 전 검토"
      validationErrors={validationErrors}
      validationWarnings={validationWarnings}
      executionResult={executionResult}
    />
  )
}
