'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import type { FlowNode } from '../types'
import { NODE_BODY_WIDTH, NODE_GAP } from '../constants'
import { Node } from '@/features/nodes/Node'
import { DynamicModal } from '@/shared/ui/components/DynamicModal'
import { NodeConfig, type NodeConfigType } from '@/features/nodes/NodeConfig'
import { useFlowStore } from '../store/useFlowStore'
import {
  useFlowCanvasPanZoom,
  useSmoothPanToNode,
  type FlowCanvasNodeBackgroundTap,
} from '../hooks'

const INLINE_NODE_TYPES = ['news-source', 'fb-url-input', 'fb-summary', 'fb-preview', 'fb-publish']

interface NodeCardProps {
  node: FlowNode
  adjustedPos: { x: number; y: number }
  onOpenConfig: (nodeId: string, position: { x: number; y: number }) => void
  onWidthChange: (nodeId: string, width: number) => void
}

function NodeCard({ node, adjustedPos, onOpenConfig, onWidthChange }: NodeCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = cardRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.borderBoxSize?.[0]?.inlineSize ?? entries[0]?.contentRect.width
      if (width) onWidthChange(node.id, width)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [node.id, onWidthChange])

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (INLINE_NODE_TYPES.includes(node.type)) return
      const target = e.target as HTMLElement
      if (
        target.closest('button') ||
        target.closest('input') ||
        target.closest('[data-interactive]')
      )
        return
      if (!cardRef.current) return
      const rect = cardRef.current.getBoundingClientRect()
      onOpenConfig(node.id, {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      })
    },
    [node.id, node.type, onOpenConfig]
  )

  return (
    <div
      ref={cardRef}
      data-node="true"
      data-node-id={node.id}
      data-node-type={node.type}
      className="group absolute select-none"
      style={{
        left: adjustedPos.x,
        top: adjustedPos.y,
      }}
      onPointerUp={handlePointerUp}
    >
      <Node
        nodeId={node.id}
        type={node.type as Parameters<typeof Node>[0]['type']}
        data={node.data}
      />
    </div>
  )
}

export function FlowCanvas() {
  const nodes = useFlowStore((s) => s.nodes)
  const stepStates = useFlowStore((s) => s.stepStates)
  const editingNodeId = useFlowStore((s) => s.editingNodeId)
  const panTargetNodeId = useFlowStore((s) => s.panTargetNodeId)
  const clearPanTarget = useFlowStore((s) => s.clearPanTarget)
  const openConfig = useFlowStore((s) => s.openConfig)
  const closeConfig = useFlowStore((s) => s.closeConfig)

  const [nodeWidths, setNodeWidths] = useState<Record<string, number>>({})

  const handleWidthChange = useCallback((nodeId: string, width: number) => {
    setNodeWidths((prev) => (prev[nodeId] === width ? prev : { ...prev, [nodeId]: width }))
  }, [])

  const getNodeWidth = useCallback(
    (nodeId: string) => nodeWidths[nodeId] ?? NODE_BODY_WIDTH,
    [nodeWidths]
  )

  /** 실측 너비 기반으로 겹치지 않도록 렌더 x 좌표를 동적으로 보정 */
  const adjustedPositions = useMemo(() => {
    const result: Record<string, { x: number; y: number }> = {}
    const MIN_GAP = NODE_GAP

    const incomingMap: Record<string, string[]> = {}
    for (const node of nodes) {
      if (node.nextNodeId) {
        incomingMap[node.nextNodeId] = [...(incomingMap[node.nextNodeId] ?? []), node.id]
      }
      for (const branchId of node.branchIds ?? []) {
        incomingMap[branchId] = [...(incomingMap[branchId] ?? []), node.id]
      }
    }

    const visited = new Set<string>()
    const visit = (nodeId: string) => {
      if (visited.has(nodeId)) return
      const node = nodes.find((n) => n.id === nodeId)
      if (!node) return
      visited.add(nodeId)

      const incoming = incomingMap[nodeId] ?? []
      for (const inId of incoming) {
        if (!visited.has(inId)) visit(inId)
      }

      let adjustedX = node.position.x
      for (const inId of incoming) {
        const inPos = result[inId]
        if (inPos) {
          const minX = inPos.x + getNodeWidth(inId) + MIN_GAP
          adjustedX = Math.max(adjustedX, minX)
        }
      }
      result[nodeId] = { x: adjustedX, y: node.position.y }

      if (node.nextNodeId) visit(node.nextNodeId)
      for (const branchId of node.branchIds ?? []) visit(branchId)
    }

    for (const node of nodes) {
      if (!incomingMap[node.id]?.length) visit(node.id)
    }
    for (const node of nodes) {
      if (!result[node.id]) result[node.id] = { x: node.position.x, y: node.position.y }
    }

    return result
  }, [nodes, getNodeWidth])

  const adjustedPositionsRef = useRef<Record<string, { x: number; y: number }>>({})
  adjustedPositionsRef.current = adjustedPositions

  const [configOpen, setConfigOpen] = useState(false)
  const [openFromPosition, setOpenFromPosition] = useState<{
    x: number
    y: number
  } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const editingNodeRef = useRef<HTMLElement | null>(null)

  const handleOpenConfig = useCallback(
    (nodeId: string, position: { x: number; y: number }) => {
      setOpenFromPosition(position)
      openConfig(nodeId)
    },
    [openConfig]
  )

  const { panRef, zoomRef, layerRef, zoomIndicatorRef, updateTransform, pointerHandlers } =
    useFlowCanvasPanZoom({
      containerRef,
      inlineNodeTypes: INLINE_NODE_TYPES,
      onNodeBackgroundTap: useCallback<FlowCanvasNodeBackgroundTap>(
        ({ nodeId, position }) => handleOpenConfig(nodeId, position),
        [handleOpenConfig]
      ),
    })

  useSmoothPanToNode({
    panTargetNodeId,
    nodes,
    containerRef,
    getNodeWidth,
    adjustedPositionsRef,
    panRef,
    zoomRef,
    updateTransform,
    clearPanTarget,
  })

  useEffect(() => {
    setConfigOpen(!!editingNodeId)
  }, [editingNodeId])

  const handleCloseConfig = useCallback(() => {
    closeConfig()
    setOpenFromPosition(null)
  }, [closeConfig])

  const editingNode = useMemo(
    () => nodes.find((n) => n.id === editingNodeId),
    [nodes, editingNodeId]
  )

  const edges = useMemo(() => {
    const result: {
      sourceId: string
      targetId: string
      x1: number
      y1: number
      x2: number
      y2: number
      curvature: number
      sourceStepStatus: string | undefined
      isBranch: boolean
    }[] = []

    for (const node of nodes) {
      const sourceWidth = getNodeWidth(node.id)
      const srcPos = adjustedPositions[node.id] ?? node.position

      if (node.nextNodeId) {
        const next = nodes.find((n) => n.id === node.nextNodeId)
        if (next) {
          const dstPos = adjustedPositions[next.id] ?? next.position
          const x1 = srcPos.x + sourceWidth
          const y1 = srcPos.y + 32
          const x2 = dstPos.x
          const y2 = dstPos.y + 32
          result.push({
            sourceId: node.id,
            targetId: next.id,
            x1,
            y1,
            x2,
            y2,
            curvature: Math.abs(x2 - x1) * 0.45,
            sourceStepStatus: stepStates[node.id]?.status,
            isBranch: false,
          })
        }
      }

      for (const branchId of node.branchIds ?? []) {
        const target = nodes.find((n) => n.id === branchId)
        if (!target) continue
        const tgtPos = adjustedPositions[target.id] ?? target.position
        const x1 = srcPos.x + sourceWidth
        const y1 = srcPos.y + 32
        const x2 = tgtPos.x
        const y2 = tgtPos.y + 32
        result.push({
          sourceId: node.id,
          targetId: branchId,
          x1,
          y1,
          x2,
          y2,
          curvature: Math.abs(x2 - x1) * 0.45,
          sourceStepStatus: stepStates[node.id]?.status,
          isBranch: true,
        })
      }
    }

    return result
  }, [nodes, stepStates, getNodeWidth, adjustedPositions])

  const svgWidth = useMemo(() => {
    if (nodes.length === 0) return 4000
    return Math.max(
      4000,
      Math.max(
        ...nodes.map((n) => (adjustedPositions[n.id]?.x ?? n.position.x) + getNodeWidth(n.id))
      ) + 600
    )
  }, [nodes, getNodeWidth, adjustedPositions])

  const svgHeight = useMemo(() => {
    if (nodes.length === 0) return 3000
    return Math.max(3000, (nodes.length ? Math.max(...nodes.map((n) => n.position.y)) : 0) + 400)
  }, [nodes])

  return (
    <>
      <div
        ref={containerRef}
        className="relative h-full w-full cursor-grab overflow-hidden active:cursor-grabbing"
        onPointerDownCapture={pointerHandlers.onPointerDownCapture}
        onPointerMove={pointerHandlers.onPointerMove}
        onPointerUp={pointerHandlers.onPointerUp}
      >
        {/* Transform layer — will-change로 GPU 레이어 분리 */}
        <div
          ref={layerRef}
          className="absolute origin-top-left will-change-transform"
          style={{
            transform: `translate(${panRef.current.x}px, ${panRef.current.y}px) scale(${zoomRef.current})`,
          }}
        >
          {/* SVG edges */}
          <svg
            className="absolute"
            style={{ left: 0, top: 0, pointerEvents: 'none' }}
            width={svgWidth}
            height={svgHeight}
          >
            <defs>
              <marker
                id="arrow-green"
                viewBox="0 0 8 8"
                refX="7"
                refY="4"
                markerWidth="5"
                markerHeight="5"
                orient="auto-start-reverse"
              >
                <path
                  d="M1 1.5L6.5 4L1 6.5"
                  fill="none"
                  stroke="#1D9E75"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
              </marker>
              <marker
                id="arrow-blue"
                viewBox="0 0 8 8"
                refX="7"
                refY="4"
                markerWidth="5"
                markerHeight="5"
                orient="auto-start-reverse"
              >
                <path
                  d="M1 1.5L6.5 4L1 6.5"
                  fill="none"
                  stroke="#378ADD"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
              </marker>
              <marker
                id="arrow-red"
                viewBox="0 0 8 8"
                refX="7"
                refY="4"
                markerWidth="5"
                markerHeight="5"
                orient="auto-start-reverse"
              >
                <path
                  d="M1 1.5L6.5 4L1 6.5"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
              </marker>
              <marker
                id="arrow-default"
                viewBox="0 0 8 8"
                refX="7"
                refY="4"
                markerWidth="5"
                markerHeight="5"
                orient="auto-start-reverse"
              >
                <path
                  d="M1 1.5L6.5 4L1 6.5"
                  fill="none"
                  stroke="rgba(0,0,0,0.2)"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
              </marker>
              <marker
                id="arrow-indigo"
                viewBox="0 0 8 8"
                refX="7"
                refY="4"
                markerWidth="5"
                markerHeight="5"
                orient="auto-start-reverse"
              >
                <path
                  d="M1 1.5L6.5 4L1 6.5"
                  fill="none"
                  stroke="rgba(99,102,241,0.7)"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
              </marker>
            </defs>

            {edges.map((edge) => {
              const d = `M ${edge.x1} ${edge.y1} C ${edge.x1 + edge.curvature} ${edge.y1}, ${edge.x2 - edge.curvature} ${edge.y2}, ${edge.x2} ${edge.y2}`
              const legacyStatus =
                edge.sourceStepStatus === 'done'
                  ? 'success'
                  : edge.sourceStepStatus === 'editing'
                    ? 'running'
                    : edge.sourceStepStatus === 'blocked'
                      ? 'failed'
                      : undefined
              const edgeColor =
                edge.sourceStepStatus === 'done'
                  ? 'rgba(0,0,0,0.35)'
                  : edge.sourceStepStatus === 'editing'
                    ? 'rgba(55,138,221,0.55)'
                    : edge.sourceStepStatus === 'blocked'
                      ? 'rgba(0,0,0,0.12)'
                      : edge.isBranch
                        ? 'rgba(99,102,241,0.45)'
                        : 'rgba(0,0,0,0.16)'
              const isDashed = edge.sourceStepStatus !== 'done'
              const markerId =
                legacyStatus === 'success'
                  ? 'arrow-green'
                  : legacyStatus === 'running'
                    ? 'arrow-blue'
                    : legacyStatus === 'failed'
                      ? 'arrow-red'
                      : edge.isBranch
                        ? 'arrow-indigo'
                        : 'arrow-default'

              return (
                <g key={`${edge.sourceId}-${edge.targetId}`}>
                  <path
                    d={d}
                    fill="none"
                    stroke={edgeColor}
                    strokeWidth={edge.isBranch ? 1.5 : 1.2}
                    strokeLinecap="round"
                    strokeDasharray={isDashed ? '4 3' : undefined}
                    markerEnd={`url(#${markerId})`}
                    style={{ pointerEvents: 'none', transition: 'stroke 0.2s' }}
                  />
                </g>
              )
            })}
          </svg>

          {/* Nodes */}
          {nodes.map((node) => (
            <NodeCard
              key={node.id}
              node={node}
              adjustedPos={adjustedPositions[node.id] ?? node.position}
              onOpenConfig={handleOpenConfig}
              onWidthChange={handleWidthChange}
            />
          ))}
        </div>

        {/* Zoom indicator — 항상 렌더링, display는 updateTransform이 직접 제어 */}
        <div
          ref={zoomIndicatorRef}
          className="pointer-events-none absolute right-4 bottom-4 rounded-full border border-slate-200/60 bg-white/80 px-2.5 py-1 text-xs font-medium text-slate-500 shadow-sm backdrop-blur-sm"
          style={{ display: 'none' }}
        />
      </div>

      {/* Config modal */}
      <DynamicModal
        open={configOpen}
        onOpenChange={(open) => {
          if (!open) handleCloseConfig()
        }}
        contentWidth={1400}
        contentHeight={900}
        openFromPosition={openFromPosition}
        onOpeningAnimationEnd={() => setOpenFromPosition(null)}
        targetRef={editingNodeRef}
      >
        {editingNode && (
          <NodeConfig type={editingNode.type as NodeConfigType} nodeId={editingNode.id} />
        )}
      </DynamicModal>
    </>
  )
}
