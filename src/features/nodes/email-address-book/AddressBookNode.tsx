import { BookUser } from 'lucide-react'
import { NodeShell } from '../_shared/NodeShell'

interface AddressBookNodeProps {
  data?: Record<string, unknown>
  validationErrors?: string[]
  validationWarnings?: string[]
  executionResult?: {
    status: 'running' | 'success' | 'failed'
    message?: string
  }
}

export function AddressBookNode({
  data,
  validationErrors,
  validationWarnings,
  executionResult,
}: AddressBookNodeProps) {
  return (
    <NodeShell
      icon={<BookUser className="h-[18px] w-[18px]" />}
      title="주소록"
      description={
        typeof data?.recipientEmail === 'string' && data.recipientEmail
          ? data.recipientEmail
          : '주소록 미연결'
      }
      isConfigured={
        !!(typeof data?.recipientEmail === 'string' && data.recipientEmail?.includes('@'))
      }
      validationErrors={validationErrors}
      validationWarnings={validationWarnings}
      executionResult={executionResult}
    />
  )
}
