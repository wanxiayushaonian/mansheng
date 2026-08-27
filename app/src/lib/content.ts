/**
 * 内容层：构建产物取数（模块级 Promise 缓存，全站唯一数据入口）。
 * 类型定义统一在 @/types/graph，此处仅转发别名。
 */
import type { GraphData, GraphNode, GraphEdge, Post, TagInfo } from '@/types/graph'

export type { GraphData, GraphNode, GraphEdge, Post, TagInfo }

let graphCache: Promise<GraphData> | null = null
export function fetchGraph(): Promise<GraphData> {
  if (!graphCache) {
    graphCache = fetch(`${import.meta.env.BASE_URL}data/graph.json`).then((r) => {
      if (!r.ok) throw new Error('graph.json 加载失败')
      return r.json()
    })
  }
  return graphCache
}

let tagsCache: Promise<TagInfo[]> | null = null
export function fetchTags(): Promise<TagInfo[]> {
  if (!tagsCache) {
    tagsCache = fetch(`${import.meta.env.BASE_URL}data/tags.json`).then((r) => {
      if (!r.ok) throw new Error('tags.json 加载失败')
      return r.json()
    })
  }
  return tagsCache
}

export async function fetchPost(id: string): Promise<Post> {
  const r = await fetch(`${import.meta.env.BASE_URL}data/posts/${encodeURIComponent(id)}.json`)
  if (!r.ok) throw new Error('not-found')
  return r.json()
}

/** html → 纯文本：去标签 + 常见实体解码（摘要 / meta description / og 卡共用） */
export function htmlToText(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

