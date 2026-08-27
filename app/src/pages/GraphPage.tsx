import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  useViewport,
} from '@xyflow/react'
import type { Edge, Node } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { AnimatePresence, motion } from 'framer-motion'
import { Dices, X } from 'lucide-react'

import { useGraph } from '@/hooks/useGraph'
import {
  bfsPath, bfsWithin, buildAdjacency, nodePassesFilters, useGraphStore,
} from '@/store'
import { getNodeColor } from '@/lib/colors'
import type { GraphNodeData } from '@/types/graph'
import GardenNode from '@/components/graph/GardenNode'
import { nodeSize } from '@/components/graph/nodeSize'
import type { GardenNodeRFData } from '@/components/graph/GardenNode'
import FilterPanel from '@/components/graph/FilterPanel'
import SearchBox from '@/components/graph/SearchBox'
import Timeline from '@/components/graph/Timeline'
import WelcomeCard from '@/components/graph/WelcomeCard'
import TopBar from '@/components/TopBar'
import GhostHint from '@/components/GhostHint'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'

const nodeTypes = { garden: GardenNode }

/** 弱边（标签共现）只在放大后显示：总览时只看 wikilink 实线，避免长虚线横穿全图 */
const WEAK_EDGE_ZOOM = 1.2

/** hover 邻域：BFS 深度（1 = 直接邻居）与轻压暗不透明度 */
const HOVER_DEPTH = 1
const HOVER_DIM = 0.25
const FOCUS_DIM = 0.08

const LINK_STYLE = { stroke: '#B09B7E', strokeWidth: 1.5, opacity: 0.65 }
const TAG_STYLE = { stroke: '#B9AE99', strokeWidth: 1, opacity: 0.35, strokeDasharray: '2 5' }
const FOCUS_STYLE = { stroke: 'var(--accent-color)', strokeWidth: 2, opacity: 0.9 }
const DIM_STYLE = { opacity: 0.08 }

/* ---------- URL hash 编解码 ---------- */
interface HashState {
  x?: number
  y?: number
  z?: number
  focus?: string
  tags?: string[]
  hideWeak?: boolean
  hideGhost?: boolean
  tl?: string
  mode?: string
}

function parseHash(): HashState {
  const raw = window.location.hash.replace(/^#/, '')
  if (!raw) return {}
  const out: HashState = {}
  const params = new URLSearchParams(raw.includes('=') ? raw : `focus=${raw}`)
  const x = params.get('x')
  const y = params.get('y')
  const z = params.get('z')
  if (x) out.x = Number(x)
  if (y) out.y = Number(y)
  if (z) out.z = Number(z)
  const focus = params.get('focus')
  if (focus) out.focus = decodeURIComponent(focus)
  const tags = params.get('tags')
  if (tags) out.tags = tags.split(',').map(decodeURIComponent).filter(Boolean)
  if (params.get('hideWeak') === '1') out.hideWeak = true
  if (params.get('hideGhost') === '1') out.hideGhost = true
  const tl = params.get('tl')
  if (tl) out.tl = tl
  const mode = params.get('mode')
  if (mode) out.mode = decodeURIComponent(mode)
  return out
}

function writeHash(h: HashState) {
  const p = new URLSearchParams()
  if (h.x !== undefined) p.set('x', h.x.toFixed(1))
  if (h.y !== undefined) p.set('y', h.y.toFixed(1))
  if (h.z !== undefined) p.set('z', h.z.toFixed(2))
  if (h.focus) p.set('focus', encodeURIComponent(h.focus))
  if (h.tags && h.tags.length) p.set('tags', h.tags.map(encodeURIComponent).join(','))
  if (h.hideWeak) p.set('hideWeak', '1')
  if (h.hideGhost) p.set('hideGhost', '1')
  if (h.tl) p.set('tl', h.tl)
  if (h.mode) p.set('mode', encodeURIComponent(h.mode))
  const s = p.toString()
  history.replaceState(null, '', s ? `#${s}` : window.location.pathname)
}

/* ---------- 画布 ---------- */

/** ReactFlow 内部组件：把 zoom 同步到外部状态（含初始 fitView） */
function ViewportWatcher({ onZoom }: { onZoom: (z: number) => void }) {
  const { zoom } = useViewport()
  useEffect(() => onZoom(zoom), [zoom, onZoom])
  return null
}

function GraphCanvas({ graph }: { graph: NonNullable<ReturnType<typeof useGraph>['graph']> }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { setCenter, fitView, getViewport } = useReactFlow()
  const store = useGraphStore()
  const {
    filters,
    focusId,
    hoverId,
    timelineDate,
    timelinePlaying,
    localMode,
    pathMode,
    highlightId,
    readMap,
    theme,
    setFocus,
    setLocalMode,
    setPathMode,
    setHighlight,
    setGhostToast,
    setFilters,
    setTimelineDate,
  } = store

  const [sheetNode, setSheetNode] = useState<GraphNodeData | null>(null)
  const [zoom, setZoom] = useState(1)
  const restored = useRef(false)
  const hashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const adj = useMemo(() => buildAdjacency(graph), [graph])
  const byId = useMemo(() => new Map(graph.nodes.map((n) => [n.id, n])), [graph])

  const focusSet = useMemo(
    () => (focusId ? bfsWithin(adj, focusId, 1) : null),
    [adj, focusId],
  )
  const hoverSet = useMemo(
    () => (hoverId ? bfsWithin(adj, hoverId, HOVER_DEPTH) : null),
    [adj, hoverId],
  )
  const localSet = useMemo(
    () => (localMode ? bfsWithin(adj, localMode.rootId, localMode.depth) : null),
    [adj, localMode],
  )
  // 最短路径：节点集合 + 无向边键集合（"a|b" 取排序对）
  const pathResult = useMemo(() => {
    if (!pathMode?.from || !pathMode?.to) return null
    const p = bfsPath(adj, pathMode.from, pathMode.to)
    if (!p) return { ids: new Set<string>(), edges: new Set<string>(), found: false as const }
    return {
      ids: new Set(p),
      edges: new Set(p.slice(1).map((n, i) => [p[i], n].sort().join('|'))),
      found: true as const,
    }
  }, [adj, pathMode])

  const isVisible = useCallback(
    (n: GraphNodeData) => {
      if (!nodePassesFilters(n, filters)) return false
      if (timelineDate && n.date && n.date > timelineDate) return false
      if (localSet && !localSet.has(n.id)) return false
      return true
    },
    [filters, timelineDate, localSet],
  )

  const rfNodes: Node<GardenNodeRFData, 'garden'>[] = useMemo(
    () =>
      graph.nodes.filter(isVisible).map((n) => ({
        id: n.id,
        type: 'garden' as const,
        position: { x: n.x, y: n.y },
        width: nodeSize(n.degree),
        height: nodeSize(n.degree),
        draggable: false,
        data: {
          node: n,
          // 寻路 > hover 邻域 > 聚焦模式（上层模式瞬态接管）
          dimmed: pathResult
            ? pathResult.ids.has(n.id)
              ? 0
              : FOCUS_DIM
            : hoverSet
              ? hoverSet.has(n.id)
                ? 0
                : HOVER_DIM
              : focusSet && !focusSet.has(n.id)
                ? FOCUS_DIM
                : 0,
          highlighted: highlightId === n.id,
          focused: focusId === n.id,
          read: !!readMap[n.id],
          inPath: pathResult?.ids.has(n.id) ?? false,
          growing: timelinePlaying,
        },
      })),
    [graph, isVisible, pathResult, hoverSet, focusSet, highlightId, focusId, readMap, timelinePlaying],
  )

  const visibleIds = useMemo(() => new Set(rfNodes.map((n) => n.id)), [rfNodes])

  const rfEdges: Edge[] = useMemo(
    () =>
      graph.edges
        .filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target))
        // 弱边按 zoom 渐进显示；但寻路模式下路径边始终可见（否则路径有线无图）
        .filter((e) => {
          if (e.kind !== 'tag') return true
          if (filters.hideWeakEdges) return false
          if (zoom >= WEAK_EDGE_ZOOM) return true
          return pathResult?.edges.has([e.source, e.target].sort().join('|')) ?? false
        })
        .map((e) => {
          const inFocus = focusSet && focusSet.has(e.source) && focusSet.has(e.target)
          const inHover = hoverSet && hoverSet.has(e.source) && hoverSet.has(e.target)
          const isPathEdge =
            pathResult?.found && pathResult.edges.has([e.source, e.target].sort().join('|'))
          const emphasized = pathResult ? isPathEdge : hoverSet ? !!inHover : !!inFocus
          const dimmed = pathResult
            ? !isPathEdge
            : hoverSet
              ? !inHover
              : !!focusSet && !inFocus
          const base = e.kind === 'link' ? LINK_STYLE : TAG_STYLE
          return {
            id: `${e.kind}:${e.source}:${e.target}`,
            source: e.source,
            target: e.target,
            type: 'straight',
            style: emphasized
              ? { ...FOCUS_STYLE, stroke: '#A45A3C' }
              : dimmed
                ? { ...base, ...DIM_STYLE }
                : base,
            interactionWidth: 0,
          }
        }),
    [graph, visibleIds, filters.hideWeakEdges, pathResult, focusSet, hoverSet, zoom],
  )

  /* 初次从 hash / query 还原视图状态 */
  useEffect(() => {
    if (restored.current) return
    restored.current = true
    const h = parseHash()
    const qFocus = searchParams.get('focus')
    if (h.tags) setFilters({ tags: h.tags })
    if (h.hideWeak) setFilters({ hideWeakEdges: true })
    if (h.hideGhost) setFilters({ hideGhost: true })
    if (h.tl) setTimelineDate(h.tl)
    if (h.mode?.startsWith('local:')) {
      const [, id, d] = h.mode.split(':')
      if (byId.has(id)) setLocalMode({ rootId: id, depth: Number(d) || 1 })
    }
    const focus = qFocus ?? h.focus
    if (h.x !== undefined && h.y !== undefined && h.z !== undefined) {
      setCenter(h.x, h.y, { zoom: h.z, duration: 0 })
    } else if (!focus) {
      fitView({ padding: 0.15, duration: 900 })
    }
    if (focus && byId.has(focus)) {
      const n = byId.get(focus)!
      setFocus(focus)
      setCenter(n.x, n.y, { zoom: 1.1, duration: 800 })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph])

  /* viewport / 状态 → hash（防抖 300ms） */
  const scheduleHash = useCallback(() => {
    if (hashTimer.current) clearTimeout(hashTimer.current)
    hashTimer.current = setTimeout(() => {
      const v = getViewport()
      const s = useGraphStore.getState()
      writeHash({
        x: v.x,
        y: v.y,
        z: v.zoom,
        focus: s.focusId ?? undefined,
        tags: s.filters.tags,
        hideWeak: s.filters.hideWeakEdges,
        hideGhost: s.filters.hideGhost,
        tl: s.timelineDate ?? undefined,
        mode: s.localMode ? `local:${s.localMode.rootId}:${s.localMode.depth}` : undefined,
      })
    }, 300)
  }, [getViewport])

  useEffect(() => {
    scheduleHash()
  }, [filters, focusId, timelineDate, localMode, scheduleHash])

  /* Esc 退出寻路 / 聚焦 / 局部模式 */
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const s = useGraphStore.getState()
        if (s.pathMode) setPathMode(null)
        else if (s.focusId) setFocus(null)
        else if (s.localMode) setLocalMode(null)
      }
    }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [setFocus, setLocalMode, setPathMode])

  const flyTo = useCallback(
    (n: GraphNodeData, zoom = 1.15) => {
      setCenter(n.x, n.y, { zoom, duration: 800 })
      setHighlight(n.id)
      setTimeout(() => setHighlight(null), 2500)
      if (!n.exists) setGhostToast({ nodeId: n.id, title: n.title })
    },
    [setCenter, setHighlight, setGhostToast],
  )

  /** 随机漫游：飞到一个随机节点 */
  const roam = useCallback(() => {
    const pool = rfNodes.filter((n) => byId.get(n.id)?.exists && n.id !== focusId)
    if (!pool.length) return
    const pick = byId.get(pool[Math.floor(Math.random() * pool.length)].id)
    if (pick) flyTo(pick, 1.3)
  }, [rfNodes, byId, focusId, flyTo])

  const onNodeClick = useCallback(
    (_: unknown, rfNode: Node) => {
      const n = byId.get(rfNode.id)
      if (!n) return
      // 寻路模式：依次点选起点 / 终点（种子节点也允许，它们在图上是真实节点）
      if (pathMode) {
        if (!pathMode.from) setPathMode({ from: n.id, to: null })
        else if (n.id !== pathMode.from) setPathMode({ from: pathMode.from, to: n.id })
        return
      }
      if (!n.exists) {
        setGhostToast({ nodeId: n.id, title: n.title })
        return
      }
      if (window.innerWidth < 768) {
        setSheetNode(n)
        return
      }
      navigate(`/p/${encodeURIComponent(n.id)}`)
    },
    [byId, navigate, setGhostToast, pathMode, setPathMode],
  )

  const onNodeDoubleClick = useCallback(
    (_: unknown, rfNode: Node) => {
      setFocus(null)
      setLocalMode({ rootId: rfNode.id, depth: 1 })
      const n = byId.get(rfNode.id)
      if (n) setCenter(n.x, n.y, { zoom: 1.1, duration: 800 })
    },
    [byId, setCenter, setFocus, setLocalMode],
  )

  const localRoot = localMode ? byId.get(localMode.rootId) : null

  return (
    <div className="absolute inset-0">
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        minZoom={0.05}
        maxZoom={2.5}
        nodesConnectable={false}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onPaneClick={() => {
          setFocus(null)
          setPathMode(null)
          setSheetNode(null)
        }}
        onMoveEnd={scheduleHash}
        proOptions={{ hideAttribution: true }}
      >
        <ViewportWatcher onZoom={setZoom} />
        <Background
          variant={BackgroundVariant.Dots}
          gap={28}
          size={1.2}
          color={theme === 'dark' ? '#3b342b' : '#E0D7C6'}
        />
        <Controls position="bottom-left" showInteractive={false} />
        {/* 随机漫游 */}
        <motion.button
          whileTap={{ rotate: 180 }}
          className="float-panel absolute left-4 bottom-[132px] flex h-7 w-7 items-center justify-center text-ink-2 hover:text-accentc"
          style={{ zIndex: 20 }}
          onClick={roam}
          aria-label="随机漫游"
          title="随机漫游"
        >
          <Dices size={13} />
        </motion.button>
        <MiniMap
          position="bottom-right"
          pannable
          zoomable
          className="hidden md:block"
          style={{
            width: 176,
            height: 120,
            background: theme === 'dark' ? '#26211c' : '#F1EBE0',
          }}
          maskColor={theme === 'dark' ? 'rgba(234,227,212,0.08)' : 'rgba(46,42,36,0.06)'}
          maskStrokeColor={theme === 'dark' ? '#4C4437' : '#C4B9A4'}
          nodeColor={(n) => {
            const gn = byId.get(n.id)
            return gn ? (gn.exists ? getNodeColor(gn) : '#A39A8A') : '#A39A8A'
          }}
        />
      </ReactFlow>

      {/* 左上 TopBar 胶囊 */}
      <div className="absolute left-4 top-4" style={{ zIndex: 20 }}>
        <TopBar variant="floating" />
      </div>

      <SearchBox onPick={(n) => flyTo(n)} />
      <FilterPanel visibleCount={rfNodes.length} visibleEdgeCount={rfEdges.length} />
      <Timeline />
      <WelcomeCard />
      <GhostHint />

      {/* 聚焦退出胶囊 */}
      <AnimatePresence>
        {focusId && (
          <motion.button
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="float-panel absolute right-4 top-4 flex items-center gap-1.5 px-3 py-1.5 text-xs text-ink-2 hover:text-accentc"
            style={{ zIndex: 20 }}
            onClick={() => setFocus(null)}
          >
            聚焦：{byId.get(focusId)?.title ?? focusId} <X size={12} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* 寻路模式面包屑 */}
      <AnimatePresence>
        {pathMode && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="float-panel absolute left-1/2 top-[76px] -translate-x-1/2 flex items-center gap-2 px-4 py-2 text-xs text-ink-2"
            style={{ zIndex: 20 }}
          >
            {!pathMode.from ? (
              <span>寻路：请点选起点节点</span>
            ) : !pathMode.to ? (
              <span>
                寻路：起点 <b className="text-ink">{byId.get(pathMode.from)?.title ?? pathMode.from}</b>
                {' · '}请点选终点
              </span>
            ) : pathResult?.found ? (
              <span>
                路径：<b className="text-ink">{byId.get(pathMode.from)?.title}</b> ⇄{' '}
                <b className="text-ink">{byId.get(pathMode.to)?.title}</b> · {pathResult.ids.size - 1} 跳
              </span>
            ) : (
              <span>
                『{byId.get(pathMode.from)?.title}』与『{byId.get(pathMode.to)?.title}』不连通
              </span>
            )}
            <button
              className="rounded-full border border-line px-2 py-0.5 hover:bg-paper-3"
              onClick={() => setPathMode(null)}
            >
              退出
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 局部探索面包屑 */}
      <AnimatePresence>
        {localMode && localRoot && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="float-panel absolute left-1/2 top-[76px] -translate-x-1/2 flex items-center gap-2 px-4 py-2 text-xs text-ink-2"
            style={{ zIndex: 20 }}
          >
            <span>
              局部探索 · 起点：<b className="text-ink">{localRoot.title}</b> · 深度 {localMode.depth}
            </span>
            <button
              className="rounded-full border border-line px-2 py-0.5 text-accentc hover:bg-accentc-soft"
              onClick={() => setLocalMode({ ...localMode, depth: localMode.depth + 1 })}
            >
              + 展开一层
            </button>
            <button
              className="rounded-full border border-line px-2 py-0.5 hover:bg-paper-3"
              onClick={() => setLocalMode(null)}
            >
              退出
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 移动端底部 sheet */}
      <AnimatePresence>
        {sheetNode && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.25, ease: [0.22, 0.8, 0.32, 1] }}
            className="float-panel fixed inset-x-3 bottom-3 p-4 md:hidden"
            style={{ zIndex: 30, borderRadius: 14 }}
          >
            <div className="font-serif-sc text-lg font-semibold text-ink">{sheetNode.title}</div>
            <div className="mt-1 text-xs font-mono-jb text-ink-2">
              {sheetNode.type.toUpperCase()} · {sheetNode.date ?? ''}
            </div>
            <p className="mt-2 text-sm text-ink-2 clamp-3">{sheetNode.summary}</p>
            <div className="mt-3 flex gap-2">
              <button
                className="flex-1 rounded-lg bg-accentc px-3 py-2 text-sm text-white"
                onClick={() => navigate(`/p/${encodeURIComponent(sheetNode.id)}`)}
              >
                阅读全文 →
              </button>
              <button
                className="rounded-lg border border-line px-3 py-2 text-sm text-ink-2"
                onClick={() => setSheetNode(null)}
              >
                关闭
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ---------- 页面壳：加载 / 错误态 ---------- */
export default function GraphPage() {
  const { graph, loading, error } = useGraph()
  const reload = useGraphStore((s) => s.reload)

  useDocumentMeta({
    description: '一座数字花园：文章是节点，链接是边。在图上漫游，在文里阅读。',
  })

  if (loading || (!graph && !error)) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-4">
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="w-3 h-3 rounded-full"
              style={{ background: 'var(--moss)' }}
              animate={{ scale: [1, 1.4, 1] }}
              transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
        <p className="text-sm text-ink-2">正在展开花园…</p>
      </div>
    )
  }

  if (error || !graph) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <div className="float-panel p-8 text-center">
          <p className="font-serif-sc text-lg text-ink">图数据加载失败</p>
          <p className="mt-1 text-sm text-ink-2">{error}</p>
          <button
            className="mt-4 rounded-lg border border-accentc px-4 py-1.5 text-sm text-accentc hover:bg-accentc-soft"
            onClick={() => reload()}
          >
            重试
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0" style={{ height: '100dvh' }}>
      <ReactFlowProvider>
        <GraphCanvas graph={graph} />
      </ReactFlowProvider>
    </div>
  )
}
