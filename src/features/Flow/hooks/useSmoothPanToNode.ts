'use client'

import { useEffect, type RefObject } from 'react'
import type { FlowNode } from '../types'
import {
  CANVAS_MAX_ZOOM,
  CANVAS_MIN_ZOOM,
  NODE_FIT_PADDING,
  PAN_DURATION_MS,
  easeInOutCubic,
} from '../constants/flowCanvasViewConstants'

export interface UseSmoothPanToNodeParams {
  panTargetNodeId: string | null
  nodes: FlowNode[]
  containerRef: RefObject<HTMLElement | null>
  getNodeWidth: (nodeId: string) => number
  adjustedPositionsRef: RefObject<Record<string, { x: number; y: number }>>
  panRef: RefObject<{ x: number; y: number }>
  zoomRef: RefObject<number>
  updateTransform: (pan: { x: number; y: number }, zoom: number) => void
  clearPanTarget: () => void
}

/**
 * 스토어의 panTargetNodeId 변경 시 해당 노드를 뷰포트 중앙에 맞추는 페이징 애니메이션
 */
export function useSmoothPanToNode({
  panTargetNodeId,
  nodes,
  containerRef,
  getNodeWidth,
  adjustedPositionsRef,
  panRef,
  zoomRef,
  updateTransform,
  clearPanTarget,
}: UseSmoothPanToNodeParams) {
  useEffect(() => {
    if (!panTargetNodeId || !containerRef.current) return
    const node = nodes.find((n) => n.id === panTargetNodeId)
    if (!node) {
      clearPanTarget()
      return
    }

    const runPan = () => {
      const el = containerRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const nodeEl = el.querySelector(`[data-node-id="${panTargetNodeId}"]`) as HTMLElement | null
      const nodeRect = nodeEl?.getBoundingClientRect()
      const z = zoomRef.current ?? 1
      const nodeHeight = nodeRect && nodeRect.height > 0 ? nodeRect.height / z : 0

      const padding = NODE_FIT_PADDING * 2
      const nodeW = getNodeWidth(panTargetNodeId)
      const nodeH = nodeHeight > 0 ? nodeHeight : 300

      const fitZoomX = (rect.width - padding) / nodeW
      const fitZoomY = (rect.height - padding) / nodeH
      const fitZoom = Math.min(fitZoomX, fitZoomY)
      const targetZoom = Math.min(CANVAS_MAX_ZOOM, Math.max(CANVAS_MIN_ZOOM, Math.min(fitZoom, z)))

      const adjPos = adjustedPositionsRef.current?.[panTargetNodeId] ?? node.position
      const nodeCx = adjPos.x + nodeW / 2
      const nodeCy = adjPos.y + nodeH / 2
      const targetPanX = rect.width / 2 - nodeCx * targetZoom
      const targetPanY = rect.height / 2 - nodeCy * targetZoom

      const p = panRef.current ?? { x: 0, y: 0 }
      const startPan = { ...p }
      const startZoom = zoomRef.current ?? 1
      const startTime = performance.now()

      const tick = (now: number) => {
        const elapsed = now - startTime
        const t = Math.min(elapsed / PAN_DURATION_MS, 1)
        const eased = easeInOutCubic(t)
        updateTransform(
          {
            x: startPan.x + (targetPanX - startPan.x) * eased,
            y: startPan.y + (targetPanY - startPan.y) * eased,
          },
          startZoom + (targetZoom - startZoom) * eased
        )
        if (t < 1) requestAnimationFrame(tick)
        else clearPanTarget()
      }
      requestAnimationFrame(tick)
    }

    requestAnimationFrame(runPan)
  }, [panTargetNodeId]) // eslint-disable-line react-hooks/exhaustive-deps
}
