'use client'

import * as React from 'react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { cn } from '@/shared/libs/utils'

const VIEWPORT_PAD = 24
const OPEN_MS = 280
const CLOSE_MS = 240

type DynamicModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  children?: React.ReactNode
  className?: string
  contentWidth?: number
  contentHeight?: number
  targetRef?: React.RefObject<HTMLElement | null>
  openFromPosition?: { x: number; y: number } | null
  onOpeningAnimationEnd?: () => void
}

export function DynamicModal({
  open,
  onOpenChange,
  children,
  className,
  contentWidth,
  contentHeight,
  targetRef,
  openFromPosition,
  onOpeningAnimationEnd,
}: DynamicModalProps) {
  const [closingTarget, setClosingTarget] = React.useState<{ x: number; y: number } | null>(null)
  const originRef = React.useRef<{ x: number; y: number } | null>(null)
  const didEmitCloseRef = React.useRef(false)
  const openingAnimationDoneRef = React.useRef(false)
  const contentRef = React.useRef<HTMLDivElement>(null)

  const isOpeningFromNode = Boolean(open && openFromPosition)
  const waitingOpenPosition = Boolean(
    open && targetRef && !openFromPosition && !closingTarget && !openingAnimationDoneRef.current
  )

  React.useEffect(() => {
    if (open) {
      didEmitCloseRef.current = false
      openingAnimationDoneRef.current = false
      if (openFromPosition) {
        originRef.current = openFromPosition
      }
    } else {
      setClosingTarget(null)
    }
  }, [open, openFromPosition])

  const runCloseAnimation = React.useCallback(() => {
    if (closingTarget) return
    const target = targetRef?.current
    if (target) {
      didEmitCloseRef.current = false
      const rect = target.getBoundingClientRect()
      setClosingTarget({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
      return
    }
    if (originRef.current) {
      didEmitCloseRef.current = false
      setClosingTarget(originRef.current)
      return
    }
    onOpenChange(false)
  }, [targetRef, onOpenChange, closingTarget])

  const handleAnimationEnd = React.useCallback(
    (e: React.AnimationEvent) => {
      if (e.animationName === 'modal-open-from-node') {
        openingAnimationDoneRef.current = true
        onOpeningAnimationEnd?.()
        return
      }
      if (e.animationName !== 'modal-close-to-node' || !closingTarget) return
      if (didEmitCloseRef.current) return
      didEmitCloseRef.current = true
      onOpenChange(false)
    },
    [closingTarget, onOpenChange, onOpeningAnimationEnd]
  )

  // Radix onOpenChange는 건드리지 않고, 자체 클릭 캐처로 닫기 처리
  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      if (!next && closingTarget) return
      if (!next) {
        runCloseAnimation()
        return
      }
      onOpenChange(next)
    },
    [closingTarget, onOpenChange, runCloseAnimation]
  )

  // 백드롭 클릭 직접 감지: Content 밖 pointerdown → 닫기
  React.useEffect(() => {
    if (!open || closingTarget) return
    const onPointerDown = (e: PointerEvent) => {
      const content = contentRef.current
      if (!content) return
      if (!content.contains(e.target as Node)) {
        runCloseAnimation()
      }
    }
    window.addEventListener('pointerdown', onPointerDown, true)
    return () => window.removeEventListener('pointerdown', onPointerDown, true)
  }, [open, closingTarget, runCloseAnimation])

  const pad = VIEWPORT_PAD * 2
  const maxW = `calc(100vw - ${pad}px)`
  const maxH = `calc(100dvh - ${pad}px)`
  const widthVal = contentWidth ? `min(${contentWidth}px, ${maxW})` : maxW
  const heightVal = contentHeight ? `min(${contentHeight}px, ${maxH})` : maxH

  const closeAnimStyle: React.CSSProperties | undefined = closingTarget
    ? ({
        '--target-x': `${closingTarget.x}px`,
        '--target-y': `${closingTarget.y}px`,
        animation: `modal-close-to-node ${CLOSE_MS}ms ease-in forwards`,
      } as React.CSSProperties)
    : undefined

  const openAnimStyle: React.CSSProperties | undefined =
    isOpeningFromNode && openFromPosition
      ? ({
          '--target-x': `${openFromPosition.x}px`,
          '--target-y': `${openFromPosition.y}px`,
          animation: `modal-open-from-node ${OPEN_MS}ms ease-out forwards`,
        } as React.CSSProperties)
      : undefined

  return (
    <>
      <style>{`
        @keyframes modal-close-to-node {
          to {
            transform: translate(
              calc(var(--target-x) - 50vw),
              calc(var(--target-y) - 50vh)
            ) scale(0);
            opacity: 0;
          }
        }
        @keyframes modal-open-from-node {
          from {
            transform: translate(
              calc(var(--target-x) - 50vw),
              calc(var(--target-y) - 50vh)
            ) scale(0);
            opacity: 0;
          }
          to {
            transform: translate(0, 0) scale(1);
            opacity: 1;
          }
        }
      `}</style>
      <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50" />
          <DialogPrimitive.Content
            ref={contentRef}
            className={cn(
              'fixed top-[50%] left-[50%] z-50 translate-x-[-50%] translate-y-[-50%] overflow-hidden outline-none',
              'duration-200'
            )}
            style={{
              width: widthVal,
              maxWidth: widthVal,
              height: heightVal,
              maxHeight: heightVal,
            }}
            onPointerDownOutside={(e) => e.preventDefault()}
            onInteractOutside={(e) => e.preventDefault()}
            onEscapeKeyDown={(e) => {
              e.preventDefault()
              runCloseAnimation()
            }}
          >
            <DialogPrimitive.Title className="sr-only">모달</DialogPrimitive.Title>
            <div
              className={cn(
                'flex h-full min-h-0 w-full origin-center flex-col overflow-y-auto rounded-[28px] p-2 sm:rounded-[32px] sm:p-4',
                'border border-gray-200 bg-white',
                waitingOpenPosition && 'opacity-0',
                className
              )}
              style={closingTarget ? closeAnimStyle : openAnimStyle}
              onAnimationEnd={handleAnimationEnd}
            >
              {children}
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  )
}
