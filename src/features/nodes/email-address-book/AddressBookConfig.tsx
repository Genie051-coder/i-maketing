'use client'

import { useState } from 'react'
import { BookUser } from 'lucide-react'
import { Input } from '@/shared/ui/basic/input'
import { Button } from '@/shared/ui/basic/button'
import { Label } from '@/shared/ui/basic/label'
import { useFlowStore } from '@/features/flow/store/useFlowStore'

type AddressBookConfigProps = {
  nodeId?: string
}

export function AddressBookConfig({ nodeId }: AddressBookConfigProps) {
  const getNode = useFlowStore((s) => s.getNode)
  const saveNodeConfig = useFlowStore((s) => s.saveNodeConfig)
  const closeConfig = useFlowStore((s) => s.closeConfig)

  const existing = nodeId
    ? (getNode(nodeId)?.data as { recipientEmail?: string } | undefined)
    : undefined

  const [email, setEmail] = useState(existing?.recipientEmail ?? '')

  const handleSave = async () => {
    if (!nodeId || !email.trim()) return
    await saveNodeConfig(nodeId, { recipientEmail: email.trim() })
    closeConfig()
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 items-center justify-center overflow-y-auto">
        <div className="w-full max-w-[440px] px-6 py-10">
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50">
              <BookUser className="h-6 w-6 text-emerald-500" />
            </div>
            <h2 className="mt-4 text-xl font-bold text-gray-900">받는 사람</h2>
            <p className="mt-1 text-sm text-gray-500">누구에게 보낼지 입력해주세요</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="recipient-email">수신자 이메일</Label>
            <Input
              id="recipient-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave()
              }}
            />
          </div>

          <Button onClick={handleSave} disabled={!email.trim()} className="mt-6 w-full">
            저장
          </Button>
        </div>
      </div>
    </div>
  )
}
