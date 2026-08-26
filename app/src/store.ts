import { create } from 'zustand'
import type { GraphData, GraphNodeData, NodeType } from '@/types/graph'

export interface Filters {
  /** 选中的标签（OR 逻辑；空数组 = 不过滤） */
  tags: string[]
  /** 关闭的类型集合 */
  typesOff: NodeType[]
  hideWeakEdges: boolean
  hideGhost: boolean
}

export interface LocalMode {
  /** 起点节点 id */
  rootId: string
  /** 邻域深度（层数） */
  depth: number
}

export interface GhostToast {
  nodeId: string
  title: string
}

/** localStorage 读写已读记录（postId → 首次读完时间戳） */
const READ_KEY = 'mansheng.read'
function loadReadMap(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(READ_KEY) ?? '{}') as Record<string, number>
  } catch {
    return {}
  }
}
function saveReadMap(map: Record<string, number>) {
  try {
    localStorage.setItem(READ_KEY, JSON.stringify(map))
  } catch {
    /* 配额满 / 隐私模式：内存态仍有效 */
  }
}

interface GraphState {
  graph: GraphData | null
  loading: boolean
  error: string | null
  /** 递增计数：变更触发 useGraph 重新 fetch（错误重试用） */
  reloadNonce: number
  /** 已读文章（持久化到 localStorage） */
  readMap: Record<string, number>

  filters: Filters
  /** 聚焦节点 id（P1 聚焦模式） */
  focusId: string | null
  /** 时间轴：选中日期（ISO 字符串）；null = 全部 */
  timelineDate: string | null
  timelinePlaying: boolean
  /** 局部展开模式（P3） */
  localMode: LocalMode | null
  /** 搜索命中的短暂高亮节点 */
  highlightId: string | null
  hoverId: string | null
  ghostToast: GhostToast | null

  setGraph: (g: GraphData) => void
  setLoading: (v: boolean) => void
  setError: (e: string | null) => void
  /** 清除错误并触发重新加载 */
  reload: () => void
  markRead: (id: string) => void

  toggleTag: (t: string) => void
  clearTags: () => void
  toggleType: (t: NodeType) => void
  setHideWeakEdges: (v: boolean) => void
  setHideGhost: (v: boolean) => void
  setFilters: (f: Partial<Filters>) => void

  setFocus: (id: string | null) => void
  setTimelineDate: (d: string | null) => void
  setTimelinePlaying: (v: boolean) => void
  setLocalMode: (m: LocalMode | null) => void
  setHighlight: (id: string | null) => void
  setHover: (id: string | null) => void
  setGhostToast: (t: GhostToast | null) => void
}

export const useGraphStore = create<GraphState>((set) => ({
  graph: null,
  loading: false,
  error: null,
  reloadNonce: 0,
  readMap: loadReadMap(),

  filters: { tags: [], typesOff: [], hideWeakEdges: false, hideGhost: false },
  focusId: null,
  timelineDate: null,
  timelinePlaying: false,
  localMode: null,
  highlightId: null,
  hoverId: null,
  ghostToast: null,

  setGraph: (graph) => set({ graph }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  reload: () => set((s) => ({ error: null, loading: false, reloadNonce: s.reloadNonce + 1 })),
  markRead: (id) =>
    set((s) => {
      if (s.readMap[id]) return s
      const next = { ...s.readMap, [id]: Date.now() }
      saveReadMap(next)
      return { readMap: next }
    }),

  toggleTag: (t) =>
    set((s) => ({
      filters: {
        ...s.filters,
        tags: s.filters.tags.includes(t)
          ? s.filters.tags.filter((x) => x !== t)
          : [...s.filters.tags, t],
      },
    })),
  clearTags: () => set((s) => ({ filters: { ...s.filters, tags: [] } })),
  toggleType: (t) =>
    set((s) => ({
      filters: {
        ...s.filters,
        typesOff: s.filters.typesOff.includes(t)
          ? s.filters.typesOff.filter((x) => x !== t)
          : [...s.filters.typesOff, t],
      },
    })),
  setHideWeakEdges: (v) => set((s) => ({ filters: { ...s.filters, hideWeakEdges: v } })),
  setHideGhost: (v) => set((s) => ({ filters: { ...s.filters, hideGhost: v } })),
  setFilters: (f) => set((s) => ({ filters: { ...s.filters, ...f } })),

  setFocus: (focusId) => set({ focusId }),
  setTimelineDate: (timelineDate) => set({ timelineDate }),
  setTimelinePlaying: (timelinePlaying) => set({ timelinePlaying }),
  setLocalMode: (localMode) => set({ localMode }),
  setHighlight: (highlightId) => set({ highlightId }),
  setHover: (hoverId) => set({ hoverId }),
  setGhostToast: (ghostToast) => set({ ghostToast }),
}))

/** 邻接表（按当前 graph 构建） */
export function buildAdjacency(graph: GraphData): Map<string, Set<string>> {
  const adj = new Map<string, Set<string>>()
  for (const n of graph.nodes) adj.set(n.id, new Set())
  for (const e of graph.edges) {
    adj.get(e.source)?.add(e.target)
    adj.get(e.target)?.add(e.source)
  }
  return adj
}

/** BFS 求 root 起 depth 层内节点集合 */
export function bfsWithin(adj: Map<string, Set<string>>, rootId: string, depth: number): Set<string> {
  const seen = new Set<string>([rootId])
  let frontier = [rootId]
  for (let d = 0; d < depth; d++) {
    const next: string[] = []
    for (const id of frontier) {
      for (const nb of adj.get(id) ?? []) {
        if (!seen.has(nb)) {
          seen.add(nb)
          next.push(nb)
        }
      }
    }
    frontier = next
  }
  return seen
}

/** 节点是否通过当前过滤器（不含 focus/local/timeline 部分） */
export function nodePassesFilters(n: GraphNodeData, f: Filters): boolean {
  if (!n.exists && f.hideGhost) return false
  if (f.typesOff.includes(n.type)) return false
  if (f.tags.length > 0 && !n.tags.some((t) => f.tags.includes(t))) return false
  return true
}
