/** graph.json / posts / tags 类型定义（全站唯一类型源，lib/content 转发引用） */

export type NodeType = 'post' | 'essay' | 'note'

export interface GraphNodeData {
  id: string
  title: string
  type: NodeType
  tags: string[]
  degree: number
  /** ISO 日期；种子节点为空串 */
  date: string
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
  date: string
  html: string
  /** 文章目录（构建期从 h2/h3 提取） */
  toc?: { id: string; text: string; level: number }[]
  outgoing: { id: string; title: string; exists: boolean }[]
  backlinks: { id: string; title: string; context: string }[]
}

/* ---- 简短别名（内容页历史命名） ---- */
export type GraphNode = GraphNodeData
export type GraphEdge = GraphEdgeData
export type Post = PostData
