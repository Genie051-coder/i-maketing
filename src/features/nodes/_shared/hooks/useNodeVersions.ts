'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { nanoid } from 'nanoid'

/** 노드 버전 하나 (탭 저장용, Flow types와 동일한 구조) */
export type NodeVersionPayload = {
  id: string
  label: string
  data: Record<string, unknown>
  createdAt?: string
}

/** 훅에서 사용하는 노드 형태 (data + versions만 필요) */
export type NodeWithVersions = {
  data?: unknown
  versions?: Array<{ label: string; data: Record<string, unknown> }>
}

export type UseNodeVersionsOptions<T extends object> = {
  /** 기본 데이터 (탭 A 초기값 등) */
  defaultData: T
  /** 최대 버전(탭) 개수. 기본 3 (A,B,C) */
  maxVersions?: number
  /** 레거시: node.data만 있을 때 파싱. null 반환 시 무시 */
  parseFromNodeData?: (data: unknown) => Partial<T> | null
  /** node.versions[i] → 해당 탭 데이터 T */
  parseFromVersionData: (v: { label: string; data: Record<string, unknown> }) => T
}

/**
 * 노드별 버전(탭) 상태 + 로드/저장 공통 로직.
 * EmailCreateConfig, GmailConfig, ValidateConfig 등에서 재사용.
 */
export function useNodeVersions<T extends object>(
  nodeId: string | undefined,
  node: NodeWithVersions | undefined,
  options: UseNodeVersionsOptions<T>
) {
  const { defaultData, maxVersions = 3 } = options
  const optsRef = useRef(options)
  optsRef.current = options
  const nodeRef = useRef(node)
  nodeRef.current = node

  const [activeVersion, setActiveVersion] = useState('A')
  const [versions, setVersions] = useState<Record<string, T>>({
    A: { ...defaultData } as T,
  })

  // node의 실제 로드 데이터만 직렬화해 의존성으로 사용 (참조 변경만으로 effect 재실행 방지)
  const loadKey =
    nodeId && node
      ? `${nodeId}:${Array.isArray(node.versions) && node.versions.length > 0 ? 'v' + node.versions.length : 'd'}:${JSON.stringify(node.data)}`
      : null

  // 노드 설정 불러오기: node.versions 우선, 없으면 node.data(레거시)
  // options·node는 ref로 참조해 의존성에서 제외 → 무한 루프 방지
  useEffect(() => {
    if (!loadKey) return
    const n = nodeRef.current
    if (!n) return
    const {
      defaultData: def,
      parseFromNodeData: parseNode,
      parseFromVersionData: parseVer,
    } = optsRef.current
    if (Array.isArray(n.versions) && n.versions.length > 0) {
      const fromVersions = n.versions.reduce<Record<string, T>>(
        (acc, v) => {
          acc[v.label] = parseVer(v)
          return acc
        },
        {} as Record<string, T>
      )
      setVersions(fromVersions)
      setActiveVersion(n.versions[0].label)
    } else if (parseNode && n.data != null) {
      const parsed = parseNode(n.data)
      if (parsed) {
        setVersions((prev) => ({
          ...prev,
          A: { ...def, ...parsed } as T,
        }))
      }
    }
  }, [loadKey])

  const activeData = (versions[activeVersion] ?? defaultData) as T

  const updateActive = useCallback(
    (updates: Partial<T>) => {
      setVersions((prev) => ({
        ...prev,
        [activeVersion]: { ...prev[activeVersion], ...updates } as T,
      }))
    },
    [activeVersion]
  )

  const handleAddVersion = useCallback(() => {
    const nextLabel = String.fromCharCode(activeVersion.charCodeAt(0) + 1)
    const maxLabel = String.fromCharCode('A'.charCodeAt(0) + maxVersions - 1)
    if (nextLabel > maxLabel) return
    setVersions((prev) => ({
      ...prev,
      [nextLabel]: { ...prev[activeVersion] } as T,
    }))
    setActiveVersion(nextLabel)
  }, [activeVersion, maxVersions])

  const versionKeys = Object.keys(versions)

  /** saveNodeConfig(nodeId, buildSavePayload()) 형태로 사용 */
  const buildSavePayload = useCallback(
    (payloadData: T): T & { versions: NodeVersionPayload[] } => {
      const versionsArray: NodeVersionPayload[] = Object.entries(versions).map(([label, data]) => ({
        id: nanoid(),
        label,
        data: data as Record<string, unknown>,
      }))
      return { ...payloadData, versions: versionsArray } as T & {
        versions: NodeVersionPayload[]
      }
    },
    [versions]
  )

  return {
    activeVersion,
    setActiveVersion,
    versions,
    setVersions,
    activeData,
    updateActive,
    handleAddVersion,
    versionKeys,
    buildSavePayload,
  }
}
