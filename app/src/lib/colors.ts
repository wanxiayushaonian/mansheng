import type { GraphNodeData, NodeType, TagInfo } from '@/types/graph'

/** 6 色轮换盘（design.md §2.2） */
export const TAG_PALETTE = ['#7D8B6A', '#B07D5C', '#C2A24C', '#B98A7E', '#8B8E7A', '#9A7B8F']

/** 无标签时按 type 着色 */
export const TYPE_COLORS: Record<NodeType, string> = {
  post: '#7D8B6A',
  essay: '#B07D5C',
  note: '#C2A24C',
}

/** FNV-1a 32 位 hash：标签名 → 稳定色（不随标签频率变化洗牌） */
export function hashTag(name: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

let tagColorMap: Map<string, string> | null = null

/** 按标签名稳定分配颜色（hash 取模 6 色盘） */
export function buildTagColors(tags: TagInfo[]): Map<string, string> {
  tagColorMap = new Map(tags.map((t) => [t.name, TAG_PALETTE[hashTag(t.name) % TAG_PALETTE.length]]))
  return tagColorMap
}

export function getTagColor(name: string): string {
  return tagColorMap?.get(name) ?? TAG_PALETTE[hashTag(name) % TAG_PALETTE.length]
}

/** 节点主色：优先主标签，无标签按 type */
export function getNodeColor(node: GraphNodeData): string {
  if (node.tags.length > 0 && tagColorMap?.has(node.tags[0])) {
    return tagColorMap.get(node.tags[0])!
  }
  return TYPE_COLORS[node.type] ?? '#8B8E7A'
}
