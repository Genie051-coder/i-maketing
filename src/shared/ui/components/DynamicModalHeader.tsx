'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsList, TabsTrigger } from '@/shared/ui/basic/tabs'
import { Plus, Save } from 'lucide-react'
import { Button } from '@/shared/ui/basic/button'

export interface DynamicModalHeaderProps {
  activeVersion: string
  onActiveVersionChange: (value: string) => void
  versionKeys: string[]
  onAddVersion?: () => void
  maxVersions?: number
  versionLabelPrefix: string
  onSave: () => void
}

export function DynamicModalHeader({
  activeVersion,
  onActiveVersionChange,
  versionKeys,
  onAddVersion,
  maxVersions = 3,
  versionLabelPrefix,
  onSave,
}: DynamicModalHeaderProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <div className="flex items-center justify-between py-2 pr-4">
      <div className="flex items-center gap-4">
        {mounted ? (
          <Tabs value={activeVersion} onValueChange={onActiveVersionChange}>
            <TabsList className="grid h-9 w-[300px] grid-cols-4">
              {versionKeys.map((v: string) => (
                <TabsTrigger
                  key={v}
                  value={v}
                  className="text-xs font-bold tracking-wider uppercase"
                >
                  {versionLabelPrefix} {v}
                </TabsTrigger>
              ))}
              {versionKeys.length < maxVersions && onAddVersion && (
                <button
                  type="button"
                  onClick={onAddVersion}
                  className="flex items-center justify-center rounded-sm px-3 hover:bg-slate-100"
                >
                  <Plus className="h-4 w-4 text-slate-400" />
                </button>
              )}
            </TabsList>
          </Tabs>
        ) : (
          <div className="bg-muted grid h-9 w-[300px] grid-cols-4 rounded-lg p-[3px]" aria-hidden>
            <div className="bg-background rounded-md" />
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex -space-x-2">
          <div className="h-6 w-6 rounded-full border-2 border-white bg-slate-200 ring-1 ring-slate-100" />
          <div className="h-6 w-6 rounded-full border-2 border-white bg-slate-300 ring-1 ring-slate-100" />
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-2 border-slate-200 text-xs font-medium"
          onClick={onSave}
        >
          <Save className="h-3.5 w-3.5" />
          노드 저장
        </Button>
      </div>
    </div>
  )
}
