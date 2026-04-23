'use client'

import { MoreVertical, Pencil, Trash2, Stone } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/shared/ui/basic/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/basic/dropdown-menu'

interface FlowHeaderProps {
  flowId?: string
}

export function FlowHeader({ flowId }: FlowHeaderProps) {
  const { data } = useQuery<{ title: string }>({
    queryKey: ['flow', flowId],
    queryFn: async () => {
      const res = await fetch(`/api/flow/${flowId}`)
      if (!res.ok) throw new Error('failed')
      return res.json()
    },
    enabled: !!flowId,
  })

  return (
    <header className="bg-background relative flex h-12 items-center border-b px-4">
      {/* 왼쪽 */}
      <div className="flex flex-1 items-center justify-start">
        <Stone />
      </div>

      {/* 중앙 */}
      <div className="flex flex-1 items-center justify-center">
        <span className="text-foreground text-sm font-medium">{data?.title ?? ''}</span>
      </div>

      {/* 오른쪽 */}
      <div className="flex flex-1 items-center justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm">
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Pencil />
              이름 변경
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive">
              <Trash2 />
              플로우 삭제
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
