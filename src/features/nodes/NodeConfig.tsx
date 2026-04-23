'use client'

import { nodeRegistry, type NodeType } from './_registry'

export type NodeConfigType = NodeType

type NodeConfigProps = {
  type: NodeConfigType
  nodeId?: string
}

export function NodeConfig({ type, nodeId }: NodeConfigProps) {
  const entry = nodeRegistry[type]
  if (!entry?.Config) return null
  const ConfigComponent = entry.Config
  return <ConfigComponent nodeId={nodeId} />
}
