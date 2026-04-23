'use client'

import type { ReactNode } from 'react'
import { useRef, useState, useCallback } from 'react'
import { NODE_BODY_WIDTH } from '@/features/flow/constants'

interface NodeShellProps {
  icon?: ReactNode
  title: string
  description?: string
  badgeLabel?: string
  isConfigured?: boolean
  validationErrors?: string[]
  validationWarnings?: string[]
  executionResult?: {
    status: 'running' | 'success' | 'failed'
    message?: string
  }
  children?: ReactNode
  /** true면 우하단에 resize 핸들 표시 */
  resizable?: boolean
}

const MIN_W = NODE_BODY_WIDTH
const MAX_W = NODE_BODY_WIDTH * 2

export function NodeShell({
  icon,
  title,
  description,
  badgeLabel,
  isConfigured = false,
  validationErrors = [],
  validationWarnings: _validationWarnings = [],
  executionResult,
  children,
  resizable = false,
}: NodeShellProps) {
  const hasError = validationErrors.length > 0
  const status = executionResult?.status

  const containerRef = useRef<HTMLDivElement>(null)
  const [widthPx, setWidthPx] = useState(MIN_W)
  const [heightPx, setHeightPx] = useState<number | null>(null) // null = auto
  // 드래그 시작 시점의 크기·초기 최대 높이를 저장
  const dragOrigin = useRef<{
    startX: number
    startY: number
    startW: number
    startH: number
    maxH: number
  } | null>(null)

  const onResizePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation()
      e.preventDefault()
      const el = containerRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      // 최초 드래그 시 실제 높이를 기준으로 최대치 산정
      dragOrigin.current = {
        startX: e.clientX,
        startY: e.clientY,
        startW: rect.width,
        startH: rect.height,
        maxH: rect.height * 2,
      }

      const onMove = (ev: PointerEvent) => {
        if (!dragOrigin.current) return
        const { startX, startY, startW, startH, maxH } = dragOrigin.current
        const newW = Math.min(MAX_W, Math.max(MIN_W, startW + ev.clientX - startX))
        const newH = Math.min(maxH, Math.max(startH, startH + ev.clientY - startY))
        setWidthPx(newW)
        setHeightPx(newH)
      }

      const onUp = () => {
        dragOrigin.current = null
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
      }

      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    },
    [],
  )

  const borderStyle =
    hasError || status === 'failed'
      ? '1.5px solid #ef4444'
      : status === 'success'
        ? '1px solid #1D9E75'
        : status === 'running'
          ? '1.5px solid #378ADD'
          : isConfigured
            ? '1px solid #1D9E75'
            : '0.5px solid rgba(0,0,0,0.1)'

  const iconBg =
    hasError || status === 'failed'
      ? '#FEE2E2'
      : status === 'success'
        ? '#E1F5EE'
        : status === 'running'
          ? '#E6F1FB'
          : isConfigured
            ? '#E1F5EE'
            : '#f0f0ec'

  const iconColor =
    hasError || status === 'failed'
      ? '#ef4444'
      : status === 'success'
        ? '#1D9E75'
        : status === 'running'
          ? '#378ADD'
          : isConfigured
            ? '#1D9E75'
            : '#888'

  const badgeText =
    badgeLabel ??
    (status === 'success'
      ? '완료'
      : status === 'running'
        ? '실행 중'
        : status === 'failed'
          ? '실패'
          : isConfigured
            ? '설정 완료'
            : '대기')

  const badgeBg =
    hasError || status === 'failed'
      ? '#FEE2E2'
      : status === 'success'
        ? '#E1F5EE'
        : status === 'running'
          ? '#E6F1FB'
          : isConfigured
            ? '#E1F5EE'
            : '#f0f0ec'

  const badgeColor =
    hasError || status === 'failed'
      ? '#ef4444'
      : status === 'success'
        ? '#085041'
        : status === 'running'
          ? '#185FA5'
          : isConfigured
            ? '#085041'
            : '#888'

  return (
    <div
      ref={containerRef}
      data-node-content
      style={{
        position: 'relative',
        background: '#fff',
        borderRadius: 14,
        border: borderStyle,
        width: widthPx,
        ...(heightPx != null ? { height: heightPx, overflow: 'hidden' } : { minHeight: 100, overflow: 'visible' }),
        transition: 'border 0.2s',
      }}
    >
      {/* Badge */}
      <span
        style={{
          position: 'absolute',
          top: 10,
          right: 14,
          zIndex: 1,
          fontSize: 10,
          padding: '2px 7px',
          borderRadius: 20,
          background: badgeBg,
          color: badgeColor,
          whiteSpace: 'nowrap',
          transition: 'background 0.2s, color 0.2s',
        }}
      >
        {badgeText}
      </span>

      <div style={{ borderRadius: 14, overflow: 'hidden', height: '100%' }}>
        {/* Header */}
        <div
          style={{
            padding: '10px 14px',
            paddingRight: 70,
            borderBottom: '0.5px solid rgba(0,0,0,0.06)',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            {icon && (
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  background: iconBg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  color: iconColor,
                  transition: 'background 0.2s, color 0.2s',
                }}
              >
                {icon}
              </div>
            )}
            <span style={{ fontSize: 12, fontWeight: 500, color: '#1a1a1a', lineHeight: 1.4 }}>
              {title}
            </span>
          </div>
        </div>

        {/* Body */}
        <div
          style={{
            padding: '10px 14px',
            ...(heightPx != null ? { overflowY: 'auto', height: 'calc(100% - 43px)' } : {}),
          }}
        >
          {description && (
            <p
              style={{
                fontSize: 11,
                color: '#666',
                lineHeight: 1.6,
                marginBottom: children ? 8 : 0,
              }}
            >
              {description}
            </p>
          )}

          {children}

          {hasError && (
            <ul style={{ marginTop: 6 }}>
              {validationErrors.map((e, i) => (
                <li key={i} style={{ fontSize: 11, fontWeight: 500, color: '#ef4444' }}>
                  {e}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Resize 핸들 — 우하단 */}
      {resizable && (
        <div
          data-interactive="true"
          onPointerDown={onResizePointerDown}
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: 18,
            height: 18,
            cursor: 'nwse-resize',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'flex-end',
            padding: 3,
            borderRadius: '0 0 14px 0',
          }}
        >
          {/* 세 줄 핸들 아이콘 */}
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <line x1="10" y1="3" x2="3" y2="10" stroke="rgba(0,0,0,0.25)" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="10" y1="6" x2="6" y2="10" stroke="rgba(0,0,0,0.25)" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="10" y1="9" x2="9" y2="10" stroke="rgba(0,0,0,0.25)" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </div>
      )}
    </div>
  )
}
