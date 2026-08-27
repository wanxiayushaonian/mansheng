import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  useReactFlow,
  useViewport,
} from '@xyflow/react'
import type { Edge, Node } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { motion } from 'framer-motion'
import { Dices } from 'lucide-react'

import {
  bfsPath, bfsWithin, buildAdjacency, nodePassesFilters, useGraphStore,
} from '@/store'
import { parseHash, writeHash } from './viewHash'
import { LINK_STYLE, TAG_STYLE, FOCUS_STYLE, DIM_STYLE } from './styles'
import { GraphOverlays, type PathResultInfo } from './GraphOverlays'
import { getNodeColor } from '@/lib/colors'
import type { GraphData } from '@/lib/content'
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

const nodeTypes = { garden: GardenNode }

/** 弱边（标签共现）只在放大后显示：总览时只看 wikilink 实线，避免长虚线横穿全图 */
const WEAK_EDGE_ZOOM = 1.2

/** hover 邻域：BFS 深度（1 = 直接邻居）与轻压暗不透明度 */
const HOVER_DEPTH = 1
const HOVER_DIM = 0.25
const FOCUS_DIM = 0.08


/* ---------- 画布 ---------- */

/** ReactFlow 内部组件：把 zoom 同步到外部状态（含初始 fitView） */
function ViewportWatcher({ onZoom }: { onZoom: (z: number) => void }) {
  const { zoom } = useViewport()
  useEffect(() => onZoom(zoom), [zoom, onZoom])
  return null
}

export function GraphCanvas({ graph }: { graph: GraphData }) {
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
  const pathResult = useMemo<PathResultInfo | null>(() => {
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
      <GraphOverlays
        byId={byId}
        focusId={focusId}
        setFocus={setFocus}
        pathMode={pathMode}
        pathResult={pathResult}
        setPathMode={setPathMode}
        localMode={localMode}
        localRoot={localRoot ?? null}
        setLocalMode={setLocalMode}
        sheetNode={sheetNode}
        setSheetNode={setSheetNode}
      />
    </div>
  )
}

