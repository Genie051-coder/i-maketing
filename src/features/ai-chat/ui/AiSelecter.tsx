import { useState, useEffect } from 'react'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/shared/ui/basic/select'
import { AgentInfo } from '@/shared/types/agent'

interface AiSelecterProps {
  value?: string
  onValueChange?: (agentId: string) => void
}

export function AiSelecter({ value, onValueChange }: AiSelecterProps) {
  const [agents, setAgents] = useState<AgentInfo[]>([])

  useEffect(() => {
    fetch('/api/agents')
      .then((res) => res.json())
      .then(setAgents)
  }, [])

  return (
    <div className="relative">
      <Select value={value} onValueChange={onValueChange}>
        {/* 🔑 props 연결 */}
        <SelectTrigger className="border-none shadow-none">
          <SelectValue placeholder="Model" />
        </SelectTrigger>
        <SelectContent>
          {agents.map((agent) => (
            <SelectItem key={agent.id} value={agent.id}>
              {agent.displayName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
