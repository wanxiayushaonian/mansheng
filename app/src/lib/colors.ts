import type { GraphNodeData, NodeType, TagInfo } from '@/types/graph'

/**
 * 配色单一来源。
 * - getTagColor / getNodeColor：返回具体 hex —— 用于 SVG 属性与画布填充（不支持 var()）
 * - tagColor / nodeColor / typeColor：同源取色，兜底用 CSS 变量 —— 仅用于 style 样式
 * 两者共用同一 6 色盘与 hash 规则，观感一致。
 */

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

/** hex 版标签色（画布安全） */
export function getTagColor(name: string): string {
  return tagColorMap?.get(name) ?? TAG_PALETTE[hashTag(name) % TAG_PALETTE.length]
}

/** hex 版节点主色（画布安全）：优先主标签，无标签按 type */
export function getNodeColor(node: GraphNodeData): string {
  if (node.tags.length > 0 && tagColorMap?.has(node.tags[0])) {
    return tagColorMap.get(node.tags[0])!
  }
  return TYPE_COLORS[node.type] ?? '#8B8E7A'
}

/* ---- 以下为样式版（兜底引用 CSS token，暗色模式自动适配） ---- */

/** 按类型取色 */
export function typeColor(type: string): string {
  return TYPE_COLORS[type as NodeType] ?? 'var(--slate)'
}

/** 按标签名取色 */
export function tagColor(name: string): string {
  return TAG_PALETTE[hashTag(name) % TAG_PALETTE.length]
}

/** 节点主色：优先 tags[0]，无标签按 type（接受结构子集） */
export function nodeColor(node: { type: string; tags: string[] }): string {
  const t = node.tags[0]
  if (t) return tagColor(t)
  return typeColor(node.type)
}
