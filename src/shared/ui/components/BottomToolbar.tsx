'use client'

import * as React from 'react'
import { cn } from '@/shared/libs/utils'

/**
 * Figma 스타일 플로팅 하단 툴바.
 * - 하단 중앙 플로팅 (둥근 모서리, 그림자)
 * - Left / Center / Right 슬롯으로 영역 분리
 */
const BottomToolbarRoot = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      role="toolbar"
      aria-label="하단 도구 모음"
      className={cn(
        'flex items-center justify-between gap-1',
        'border-border/80 bg-background/95 rounded-2xl border px-2 py-1.5 shadow-lg shadow-black/5 backdrop-blur-md',
        'safe-area-inset-bottom mb-[max(12px,env(safe-area-inset-bottom))]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
)

BottomToolbarRoot.displayName = 'BottomToolbar'

function BottomToolbarLeft({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-center justify-start gap-0.5', className)} {...props} />
}

function BottomToolbarCenter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex shrink-0 items-center justify-center gap-0.5', className)}
      {...props}
    />
  )
}

function BottomToolbarRight({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-center justify-end gap-0.5', className)} {...props} />
}

function BottomToolbarSeparator({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="separator"
      className={cn('bg-border/60 mx-1 h-5 w-px shrink-0', className)}
      {...props}
    />
  )
}

export const BottomToolbar = Object.assign(BottomToolbarRoot, {
  Left: BottomToolbarLeft,
  Center: BottomToolbarCenter,
  Right: BottomToolbarRight,
  Separator: BottomToolbarSeparator,
})
