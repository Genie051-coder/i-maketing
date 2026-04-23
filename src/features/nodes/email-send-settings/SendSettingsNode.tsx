import { Settings } from 'lucide-react'
import { NodeShell } from '../_shared/NodeShell'

interface SendSettingsNodeProps {
  data?: Record<string, unknown>
  validationErrors?: string[]
  validationWarnings?: string[]
  executionResult?: {
    status: 'running' | 'success' | 'failed'
    message?: string
  }
}

export function SendSettingsNode({
  data,
  validationErrors,
  validationWarnings,
  executionResult,
}: SendSettingsNodeProps) {
  const subject = typeof data?.subject === 'string' ? data.subject : ''
  return (
    <NodeShell
      icon={<Settings className="h-[18px] w-[18px]" />}
      title="발송 설정"
      description={subject ? `제목: ${subject}` : '발송 설정 미완료'}
      isConfigured={!!subject.trim()}
      validationErrors={validationErrors}
      validationWarnings={validationWarnings}
      executionResult={executionResult}
    />
  )
}
