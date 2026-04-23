'use client'

import { useRef, useCallback, useEffect, type RefObject } from 'react'
import {
  CANVAS_MAX_ZOOM,
  CANVAS_MIN_ZOOM,
  WHEEL_ZOOM_FACTOR_MAX,
  WHEEL_ZOOM_FACTOR_MIN,
  WHEEL_ZOOM_SENSITIVITY,
} from '../constants/flowCanvasViewConstants'

export type FlowCanvasNodeBackgroundTap = (args: {
  nodeId: string
  nodeType: string
  position: { x: number; y: number }
}) => void

export interface UseFlowCanvasPanZoomOptions {
  containerRef: RefObject<HTMLElement | null>
  /** 배경(노드 콘텐츠 영역) 짧은 탭 시 설정 열기 등 — 인라인 노드 타입은 제외 */
  onNodeBackgroundTap?: FlowCanvasNodeBackgroundTap
  inlineNodeTypes?: readonly string[]
}

/**
 * 패닝·커서 기준 휠 줌·transform 레이어 DOM 직접 갱신
 */
export function useFlowCanvasPanZoom({
  containerRef,
  onNodeBackgroundTap,
  inlineNodeTypes = [],
}: UseFlowCanvasPanZoomOptions) {
  const panRef = useRef({ x: 120, y: 120 })
  const zoomRef = useRef(1)
  const layerRef = useRef<HTMLDivElement>(null)
  const zoomIndicatorRef = useRef<HTMLDivElement>(null)

  const panState = useRef<{
    startX: number
    startY: number
    panX: number
    panY: number
    targetNodeId?: string
    targetNodeType?: string
    targetRect?: DOMRect
    targetHasContent?: boolean
  } | null>(null)

  const updateTransform = useCallback((newPan: { x: number; y: number }, newZoom: number) => {
    panRef.current = newPan
    zoomRef.current = newZoom
    if (layerRef.current) {
      layerRef.current.style.transform = `translate(${newPan.x}px, ${newPan.y}px) scale(${newZoom})`
    }
    if (zoomIndicatorRef.current) {
      const pct = Math.round(newZoom * 100)
      zoomIndicatorRef.current.textContent = `${pct}%`
      zoomIndicatorRef.current.style.display = pct === 100 ? 'none' : 'block'
    }
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      const currentZoom = zoomRef.current
      let dy = e.deltaY
      if (e.deltaMode === WheelEvent.DOM_DELTA_LINE) dy *= 32
      else if (e.deltaMode === WheelEvent.DOM_DELTA_PAGE) dy *= 320
      const rawFactor = Math.exp(-dy * WHEEL_ZOOM_SENSITIVITY)
      const zoomFactor = Math.max(WHEEL_ZOOM_FACTOR_MIN, Math.min(WHEEL_ZOOM_FACTOR_MAX, rawFactor))
      const newZoom = Math.min(CANVAS_MAX_ZOOM, Math.max(CANVAS_MIN_ZOOM, currentZoom * zoomFactor))
      const p = panRef.current

      updateTransform(
        {
          x: mouseX - (mouseX - p.x) * (newZoom / currentZoom),
          y: mouseY - (mouseY - p.y) * (newZoom / currentZoom),
        },
        newZoom
      )
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [containerRef, updateTransform])

  const handlePointerDownCapture = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement
    if (target.closest('button') || target.closest('input') || target.closest('[data-interactive]'))
      return
    const nodeEl = target.closest('[data-node]') as HTMLElement | null
    e.currentTarget.setPointerCapture(e.pointerId)
    panState.current = {
      startX: e.clientX,
      startY: e.clientY,
      panX: panRef.current.x,
      panY: panRef.current.y,
      targetNodeId: nodeEl?.getAttribute('data-node-id') ?? undefined,
      targetNodeType: nodeEl?.getAttribute('data-node-type') ?? undefined,
      targetRect: nodeEl?.getBoundingClientRect(),
      targetHasContent: !!target.closest('[data-node-content]'),
    }
  }, [])

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!panState.current) return
      const dx = e.clientX - panState.current.startX
      const dy = e.clientY - panState.current.startY
      updateTransform(
        { x: panState.current.panX + dx, y: panState.current.panY + dy },
        zoomRef.current
      )
    },
    [updateTransform]
  )

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const state = panState.current
      panState.current = null
      if (!state || !onNodeBackgroundTap) return
      const dx = e.clientX - state.startX
      const dy = e.clientY - state.startY
      const moved = Math.sqrt(dx * dx + dy * dy)
      if (
        moved < 5 &&
        state.targetNodeId &&
        state.targetNodeType &&
        state.targetHasContent &&
        !inlineNodeTypes.includes(state.targetNodeType)
      ) {
        const rect = state.targetRect
        onNodeBackgroundTap({
          nodeId: state.targetNodeId,
          nodeType: state.targetNodeType,
          position: {
            x: rect ? rect.left + rect.width / 2 : e.clientX,
            y: rect ? rect.top + rect.height / 2 : e.clientY,
          },
        })
      }
    },
    [inlineNodeTypes, onNodeBackgroundTap]
  )

  return {
    panRef,
    zoomRef,
    layerRef,
    zoomIndicatorRef,
    updateTransform,
    pointerHandlers: {
      onPointerDownCapture: handlePointerDownCapture,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
    },
  }
}
