'use client'

import { nodeRegistry, type NodeType } from './_registry'
import { FbGhostNode } from './_shared/FbGhostNode'
import { useFlowStore } from '@/features/flow/store/useFlowStore'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '@/shared/libs/utils'
import type { EmailNodeData } from '@/features/flow/types'

type NodeProps = {
  nodeId?: string
  type: NodeType
  data?: EmailNodeData | Record<string, unknown>
}

export function Node({ nodeId, type, data }: NodeProps) {
  const nodeStatuses = useFlowStore((s) => s.nodeStatuses)
  const nodes = useFlowStore((s) => s.nodes)
  const statusKey = nodeId ?? type
  const execution = nodeStatuses[statusKey]
  const status = execution?.status
  const message = execution?.message

  const entry = nodeRegistry[type]
  if (!entry) return null

  // 선행 노드 체크 (prereq)
  const prereq = entry.meta.prereq
  if (prereq && nodeId) {
    const depNode = nodes.find((n) => n.type === prereq.depType)
    const depData = depNode?.data as Record<string, unknown> | undefined
    const depValue =
      prereq.depType === 'news-source' && depData?.selections
        ? ((depData.selections as Record<string, { selectedTitle?: string }>)?.[nodeId]
            ?.selectedTitle ?? depData?.[prereq.depField])
        : prereq.depType !== 'news-source'
          ? (() => {
              const chainDep = nodes.find(
                (n) => n.type === prereq.depType && n.nextNodeId === nodeId
              )
              return (chainDep?.data as Record<string, unknown> | undefined)?.[prereq.depField]
            })()
          : depData?.[prereq.depField]
    if (!depValue) {
      return (
        <div className="relative flex flex-col items-center justify-center">
          <FbGhostNode
            type={
              type as 'news-source' | 'fb-url-input' | 'fb-summary' | 'fb-preview' | 'fb-publish'
            }
          />
        </div>
      )
    }
  }

  const validation = entry.validate(data as Record<string, unknown> | undefined)
  const executionResult =
    status && status !== 'idle'
      ? ({ status, message } as {
          status: 'running' | 'success' | 'failed'
          message?: string
        })
      : undefined

  const NodeComponent = entry.Node

  return (
    <div className="relative flex flex-col items-center justify-center">
      <NodeComponent
        nodeId={nodeId}
        data={data as Record<string, unknown>}
        validationErrors={validation.errors}
        validationWarnings={validation.warnings}
        executionResult={executionResult}
      />
      {status && status !== 'idle' && (
        <span
          // className={cn(
          //   'absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white shadow',
          //   status === 'running' && 'bg-amber-500 text-white',
          //   status === 'success' && 'bg-emerald-500 text-white',
          //   status === 'failed' && 'bg-red-500 text-white'
          // )}
          title={
            message ?? (status === 'running' ? '실행 중' : status === 'success' ? '완료' : '실패')
          }
        >
          {/* {status === 'running' ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : status === 'success' ? (
            <CheckCircle2 className="h-3 w-3" />
          ) : (
            <XCircle className="h-3 w-3" />
          )} */}
        </span>
      )}
    </div>
  )
}
