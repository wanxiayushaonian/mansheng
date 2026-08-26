/** graph.json / posts / tags 类型定义 */

export type NodeType = 'post' | 'essay' | 'note'

export interface GraphNodeData {
  id: string
  title: string
  type: NodeType
  tags: string[]
  degree: number
  date: string | null
  x: number
  y: number
  exists: boolean
  summary: string
}

export interface GraphEdgeData {
  source: string
  target: string
  kind: 'link' | 'tag'
}

export interface TagInfo {
  name: string
  count: number
  description?: string
}

export interface GraphData {
  nodes: GraphNodeData[]
  edges: GraphEdgeData[]
  tags: TagInfo[]
}

export interface PostData {
  id: string
  title: string
  type: NodeType
  tags: string[]
  date: string | null
  html: string
  links: { id: string; title: string; exists: boolean }[]
  backlinks: { id: string; title: string; context: string }[]
}
