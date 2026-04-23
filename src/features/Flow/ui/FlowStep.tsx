'use client'

import { ChevronRight } from 'lucide-react'
import { useFlowStore } from '../store/useFlowStore'
import {
  getOrderedSteps,
  getStageNode,
  getStepLabel,
  isStepComplete,
  canReachStep,
} from '../utils/flowSteps'
import { cn } from '@/shared/libs/utils'
import { Button } from '@/shared/ui/basic/button'
import { Badge } from '@/shared/ui/basic/badge'

export interface FlowStepProps {
  onStepClick?: (nodeId: string) => void
}

export function FlowStep({ onStepClick }: FlowStepProps) {
  const nodes = useFlowStore((s) => s.nodes)
  const stepStates = useFlowStore((s) => s.stepStates)
  const requestPanToNode = useFlowStore((s) => s.requestPanToNode)

  const steps = getOrderedSteps(nodes)

  const handleStepClick = (stepIndex: number) => {
    const node = getStageNode(nodes, stepIndex)
    if (!node || !canReachStep(nodes, stepIndex, stepStates)) return
    requestPanToNode(node.id)
    onStepClick?.(node.id)
  }

  return (
    <div className="flex items-center gap-0.5" role="navigation" aria-label="진행 단계">
      {steps.map((node, i) => {
        const completed = isStepComplete(nodes, stepStates, i)
        const reachable = canReachStep(nodes, i, stepStates)
        const disabled = !reachable

        return (
          <div key={node.id} className="flex items-center">
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => handleStepClick(i)}
              disabled={disabled}
              className={cn(
                'gap-1.5 rounded-full px-2',
                disabled && 'opacity-40'
              )}
            >
              <Badge
                variant={completed ? 'secondary' : disabled ? 'secondary' : 'outline'}
                className={cn(
                  'h-4 w-4 rounded-full p-0 text-[10px]',
                  !disabled && !completed && 'border-primary/50 text-primary'
                )}
              >
                {completed ? '✓' : i + 1}
              </Badge>
              <span className="text-xs">{getStepLabel(node)}</span>
            </Button>

            {i < steps.length - 1 && (
              <ChevronRight
                className={cn(
                  'mx-0.5 h-3 w-3 shrink-0',
                  reachable && canReachStep(nodes, i + 1, stepStates)
                    ? 'text-muted-foreground/60'
                    : 'text-muted-foreground/30'
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
