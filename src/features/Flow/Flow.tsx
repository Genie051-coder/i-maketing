'use client'

import { useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { Maximize2, Share2, ChevronRight, ChevronLeft } from 'lucide-react'
import { FlowCanvas, FlowStep } from './ui'

const FlowHeader = dynamic(() => import('./ui/FlowHeader').then((m) => m.FlowHeader), {
  ssr: false,
})
import { useFlowStore } from './store/useFlowStore'
import { Button } from '@/shared/ui/basic/button'
import { BottomToolbar } from '@/shared/ui/components/BottomToolbar'
import { canReachStep, getOrderedSteps } from './utils/flowSteps'
import type { FlowDefinition } from './types'

type FlowProps = {
  flowId?: string
}

export function Flow({ flowId }: FlowProps) {
  const initFromDefinition = useFlowStore((s) => s.initFromDefinition)
  const nodes = useFlowStore((s) => s.nodes)
  const stepStates = useFlowStore((s) => s.stepStates)
  const currentStepNodeId = useFlowStore((s) => s.currentStepNodeId)
  const requestPanToNode = useFlowStore((s) => s.requestPanToNode)

  const { prevNodeId, prevDisabled, nextNodeId, nextDisabled } = useMemo(() => {
    const steps = getOrderedSteps(nodes)
    if (steps.length === 0) {
      return { prevNodeId: null, prevDisabled: true, nextNodeId: null, nextDisabled: true }
    }

    const idxFromCurrent = currentStepNodeId
      ? steps.findIndex((s) => s.id === currentStepNodeId)
      : -1

    // currentStepNodeId가 없거나 못 찾는 경우: “도달 가능한 가장 뒤”를 current로 간주
    const currentIdx =
      idxFromCurrent >= 0
        ? idxFromCurrent
        : (() => {
            let lastReachable = 0
            for (let i = 0; i < steps.length; i++) {
              if (!canReachStep(nodes, i, stepStates)) break
              lastReachable = i
            }
            return lastReachable
          })()

    const prevIdx = currentIdx - 1
    const nextIdx = currentIdx + 1

    const prevNodeId = prevIdx >= 0 ? (steps[prevIdx]?.id ?? null) : null
    const nextNodeId = nextIdx < steps.length ? (steps[nextIdx]?.id ?? null) : null

    const prevDisabled = !prevNodeId
    const nextDisabled = !nextNodeId || !canReachStep(nodes, nextIdx, stepStates)

    return { prevNodeId, prevDisabled, nextNodeId, nextDisabled }
  }, [nodes, stepStates, currentStepNodeId])

  useEffect(() => {
    if (!flowId) return
    async function load() {
      const res = await fetch(`/api/flow/${flowId}`)
      if (!res.ok) return
      const flow = (await res.json()) as { definition?: FlowDefinition }
      if (flow.definition) {
        initFromDefinition(flowId!, flow.definition)
      }
    }
    load()
  }, [flowId, initFromDefinition])

  const handleNext = () => {
    if (nextNodeId && !nextDisabled) requestPanToNode(nextNodeId)
  }
  const handlePrev = () => {
    if (prevNodeId && !prevDisabled) requestPanToNode(prevNodeId)
  }

  const hasSteps = useMemo(() => getOrderedSteps(nodes).length > 0, [nodes])

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden">
      {/* Header */}
      <FlowHeader flowId={flowId} />

      {/* Main canvas area — 패딩으로 캔버스를 배경에서 띄워 입체감 부여 */}
      <div className="min-h-0 flex-1 px-3 pt-2 pb-3">
        <div
          className="relative flex h-full flex-col overflow-hidden rounded-[18px] border border-black/[0.07]"
          style={{
            background: '#F5F5F5',
            boxShadow:
              'inset 0 2px 6px rgba(0,0,0,0.07), inset 0 1px 2px rgba(0,0,0,0.04), 0 1px 0 rgba(255,255,255,0.6)',
          }}
        >
          <div className="min-h-0 flex-1">
            <FlowCanvas />
          </div>

          {/* Bottom toolbar */}
          <div className="flex items-center justify-center py-2.5">
            <BottomToolbar>
              <BottomToolbar.Left>
                <Button variant="ghost" size="icon-sm" title="전체 보기">
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </BottomToolbar.Left>

              <BottomToolbar.Separator />

              <BottomToolbar.Center>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={handlePrev}
                  disabled={prevDisabled}
                  title="이전 단계로"
                  className="gap-1 rounded-full px-2.5"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  이전
                </Button>

                {hasSteps && (
                  <>
                    <BottomToolbar.Separator />
                    <FlowStep />
                    <BottomToolbar.Separator />
                  </>
                )}

                <Button
                  variant="ghost"
                  size="xs"
                  onClick={handleNext}
                  disabled={nextDisabled}
                  title="다음 단계로"
                  className="gap-1 rounded-full px-2.5"
                >
                  다음
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </BottomToolbar.Center>

              <BottomToolbar.Separator />

              <BottomToolbar.Right>
                <Button variant="ghost" size="icon-sm" title="공유">
                  <Share2 className="h-4 w-4" />
                </Button>
              </BottomToolbar.Right>
            </BottomToolbar>
          </div>
        </div>
      </div>
    </div>
  )
}
