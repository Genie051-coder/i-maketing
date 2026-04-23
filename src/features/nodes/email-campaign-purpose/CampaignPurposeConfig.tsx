'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { useFlowStore } from '@/features/flow/store/useFlowStore'
import { CAMPAIGN_TYPES, type CampaignType, type CampaignTypeOption } from './constants'
import { cn } from '@/shared/libs/utils'

type CampaignPurposeConfigProps = {
  nodeId?: string
}

function CampaignCard({
  option,
  selected,
  onSelect,
}: {
  option: CampaignTypeOption
  selected: boolean
  onSelect: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const Icon = option.icon

  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        'relative flex flex-col items-start rounded-xl border-2 p-4 text-left transition-all duration-200',
        selected
          ? 'border-indigo-500 bg-indigo-50/60 shadow-md'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
      )}
    >
      {selected && (
        <span className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500">
          <Check className="h-3 w-3 text-white" strokeWidth={3} />
        </span>
      )}

      <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', option.iconBg)}>
        <Icon className={cn('h-5 w-5', option.iconColor)} />
      </div>

      <span className="mt-3 text-sm font-semibold text-gray-900">{option.label}</span>
      <span className="mt-0.5 text-xs text-gray-500">{option.description}</span>

      <div
        className={cn(
          'mt-2 w-full overflow-hidden transition-all duration-200',
          hovered || selected ? 'max-h-24 opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="border-t border-gray-100 pt-2">
          <p className="mb-1 text-[10px] font-medium tracking-wide text-gray-400 uppercase">
            이런 상황에 써요
          </p>
          <ul className="space-y-0.5">
            {option.examples.map((ex) => (
              <li key={ex} className="text-xs text-gray-600">
                • {ex}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </button>
  )
}

export function CampaignPurposeConfig({ nodeId }: CampaignPurposeConfigProps) {
  const getNode = useFlowStore((s) => s.getNode)
  const saveNodeConfig = useFlowStore((s) => s.saveNodeConfig)
  const closeConfig = useFlowStore((s) => s.closeConfig)

  const existingData = nodeId ? getNode(nodeId)?.data : undefined
  const initial = existingData as { campaignType?: CampaignType } | undefined

  const [selectedType, setSelectedType] = useState<CampaignType | null>(
    initial?.campaignType ?? null
  )

  const handleSelect = async (type: CampaignType) => {
    setSelectedType(type)
    if (!nodeId) return
    await saveNodeConfig(nodeId, { campaignType: type })
    closeConfig()
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 items-center justify-center overflow-y-auto">
        <div className="w-full max-w-[680px] px-6 py-10">
          <div className="mb-8 text-center">
            <h2 className="text-xl font-bold text-gray-900">어떤 이메일을 보낼 건가요?</h2>
            <p className="mt-1.5 text-sm text-gray-500">
              유형을 선택하면 맞춤 템플릿과 AI 설정이 자동으로 준비돼요
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {CAMPAIGN_TYPES.map((opt) => (
              <CampaignCard
                key={opt.id}
                option={opt}
                selected={selectedType === opt.id}
                onSelect={() => handleSelect(opt.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
