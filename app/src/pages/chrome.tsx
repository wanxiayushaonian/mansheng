/**
 * 页面共享布局与工具：TopBar / Footer 包装、数据获取、标签配色、TagChip、
 * Lenis 平滑滚动、迷你图 SVG、骨架屏等。仅供 PostPage / TagPage / AboutPage 使用。
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Lenis from 'lenis'
import { motion } from 'framer-motion'
import { Sprout } from 'lucide-react'
import TopBar from '@/components/TopBar'
import Footer from '@/components/Footer'
import { TAG_PALETTE, TYPE_COLORS, hashTag } from '@/lib/colors'
import type { NodeType } from '@/types/graph'

/* ---------------- 类型 ---------------- */

export interface Post {
  id: string
  title: string
  type: string
  tags: string[]
  date: string
  html: string
  outgoing: { id: string; title: string; exists: boolean }[]
  backlinks: { id: string; title: string; context: string }[]
}

export interface GraphNode {
  id: string
  title: string
  type: string
  tags: string[]
  degree: number
  date: string
  x: number
  y: number
  exists: boolean
  summary: string
}

export interface GraphEdge {
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
  nodes: GraphNode[]
  edges: GraphEdge[]
  tags: TagInfo[]
}

/* ---------------- 配色 ---------------- */

export const C = {
  paper: '#F7F3EC',
  paper2: '#F1EBE0',
  paper3: '#EAE2D3',
  ink: '#2E2A24',
  ink2: '#6B6255',
  ink3: '#A39A8A',
  line: '#DCD3C2',
  lineStrong: '#C4B9A4',
  moss: '#7D8B6A',
  clay: '#B07D5C',
  ochre: '#C2A24C',
  rose: '#B98A7E',
  slate: '#8B8E7A',
  plum: '#9A7B8F',
  accent: '#A45A3C',
  accentSoft: '#EBD9C8',
}

/** 按标签名稳定取色（hash，不随标签频率变化洗牌） */
export function typeColor(type: string): string {
  return TYPE_COLORS[type as NodeType] ?? C.slate
}

/** 节点主色：优先 tags[0] 映射色，无标签按 type */
export function nodeColor(node: { type: string; tags: string[] }): string {
  const t = node.tags[0]
  if (t) return tagColor(t)
  return typeColor(node.type)
}

export function tagColor(name: string): string {
  return TAG_PALETTE[hashTag(name) % TAG_PALETTE.length]
}

/* ---------------- 数据获取（模块级缓存） ---------------- */

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

export function useGraph() {
  const [graph, setGraph] = useState<GraphData | null>(null)
  useEffect(() => {
    let alive = true
    fetchGraph()
      .then((g) => alive && setGraph(g))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])
  return graph
}

/* ---------------- Lenis 平滑滚动 ---------------- */

export function useLenis() {
  useEffect(() => {
    // 尊重系统「减少动态效果」设置
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const lenis = new Lenis({ lerp: 0.1 })
    let raf = 0
    const loop = (t: number) => {
      lenis.raf(t)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      lenis.destroy()
    }
  }, [])
}

/* ---------------- 布局包装 ---------------- */

export function PageChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] flex-col" style={{ background: C.paper, color: C.ink }}>
      <TopBar />
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  )
}

/* ---------------- TagChip ---------------- */

export function TagChip({
  name,
  color,
  active,
  fontSize,
  onClick,
}: {
  name: string
  color: string
  active?: boolean
  fontSize?: string
  onClick?: () => void
}) {
  const inner = (
    <>
      <span
        className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ background: color }}
      />
      <span>{name}</span>
    </>
  )
  const style: React.CSSProperties = {
    fontSize: fontSize ?? '0.75rem',
    letterSpacing: '0.04em',
    fontWeight: 500,
    background: active ? C.accentSoft : C.paper2,
    border: active ? `1px solid ${C.accent}` : `1px solid transparent`,
    color: active ? C.ink : C.ink2,
  }
  const cls =
    'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 transition-colors duration-150 hover:bg-[#EBD9C8] hover:text-[#2E2A24]'
  if (onClick) {
    return (
      <button type="button" className={cls} style={style} onClick={onClick}>
        {inner}
      </button>
    )
  }
  return (
    <Link to={`/tag/${encodeURIComponent(name)}`} className={cls} style={style}>
      {inner}
    </Link>
  )
}

/* ---------------- 菱形分隔线 ---------------- */

export function DiamondDivider({ className = '' }: { className?: string }) {
  return (
    <motion.div
      className={`relative flex items-center justify-center ${className}`}
      initial={{ scaleX: 0 }}
      animate={{ scaleX: 1 }}
      transition={{ duration: 0.5, delay: 0.45, ease: [0.22, 0.8, 0.32, 1] }}
      style={{ transformOrigin: 'center' }}
    >
      <div className="h-px w-full" style={{ background: C.line }} />
      <div
        className="absolute h-1.5 w-1.5 rotate-45"
        style={{ background: C.ochre }}
      />
    </motion.div>
  )
}

/* ---------------- GhostHint 轻提示 ---------------- */

export function GhostHint({ title, onDone }: { title: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000)
    return () => clearTimeout(t)
  }, [onDone])
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.18 }}
      className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2"
      style={{
        background: C.paper2,
        border: `1px solid ${C.line}`,
        borderRadius: 10,
        boxShadow: '0 1px 2px rgba(46,42,36,0.05), 0 6px 20px rgba(46,42,36,0.07)',
      }}
    >
      <div className="flex items-center gap-2 px-4 py-2.5 text-sm" style={{ color: C.ink }}>
        <Sprout size={15} style={{ color: C.moss }} />
        <span>
          『{title}』还是一粒种子 —— 此节点待写。
        </span>
      </div>
    </motion.div>
  )
}

/* ---------------- 迷你图（静态 SVG 点线预览） ---------------- */

export interface MiniMapNode {
  id: string
  x: number
  y: number
  color: string
  ghost?: boolean
  isSelf?: boolean
  r?: number
}

export function MiniGraph({
  nodes,
  edges,
  width = 272,
  height = 192,
  onNodeClick,
  onClick,
  className = '',
}: {
  nodes: MiniMapNode[]
  edges: [string, string][]
  width?: number
  height?: number
  onNodeClick?: (id: string) => void
  onClick?: () => void
  className?: string
}) {
  // 归一化坐标
  const pad = 22
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const n of nodes) {
    minX = Math.min(minX, n.x); maxX = Math.max(maxX, n.x)
    minY = Math.min(minY, n.y); maxY = Math.max(maxY, n.y)
  }
  const spanX = Math.max(maxX - minX, 1)
  const spanY = Math.max(maxY - minY, 1)
  const scale = Math.min((width - pad * 2) / spanX, (height - pad * 2) / spanY)
  const px = (n: MiniMapNode) => pad + (n.x - minX) * scale + (width - pad * 2 - spanX * scale) / 2
  const py = (n: MiniMapNode) => pad + (n.y - minY) * scale + (height - pad * 2 - spanY * scale) / 2
  const byId = new Map(nodes.map((n) => [n.id, n]))

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      style={{ display: 'block', width: '100%', height: 'auto', cursor: onClick ? 'pointer' : undefined }}
      onClick={onClick}
      role="img"
      aria-label="迷你图预览"
    >
      {edges.map(([s, t], i) => {
        const a = byId.get(s), b = byId.get(t)
        if (!a || !b) return null
        return (
          <motion.line
            key={i}
            x1={px(a)} y1={py(a)} x2={px(b)} y2={py(b)}
            stroke="#B09B7E"
            strokeWidth={1.2}
            opacity={0.6}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, delay: 0.1 + i * 0.04 }}
          />
        )
      })}
      {nodes.map((n, i) =>
        n.ghost ? (
          <motion.circle
            key={n.id}
            cx={px(n)} cy={py(n)} r={n.r ?? 4}
            fill="transparent"
            stroke={C.ink3}
            strokeWidth={1.2}
            strokeDasharray="2 2.5"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.15 + i * 0.05, type: 'spring', bounce: 0.4 }}
            style={{ transformOrigin: `${px(n)}px ${py(n)}px`, cursor: onNodeClick ? 'pointer' : undefined }}
            onClick={onNodeClick ? (e) => { e.stopPropagation(); onNodeClick(n.id) } : undefined}
          />
        ) : (
          <motion.circle
            key={n.id}
            cx={px(n)} cy={py(n)} r={n.r ?? (n.isSelf ? 7 : 4.5)}
            fill={n.color}
            stroke={n.isSelf ? C.accent : 'transparent'}
            strokeWidth={n.isSelf ? 2 : 0}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.15 + i * 0.05, type: 'spring', bounce: 0.4 }}
            style={{ transformOrigin: `${px(n)}px ${py(n)}px`, cursor: onNodeClick ? 'pointer' : undefined }}
            onClick={onNodeClick ? (e) => { e.stopPropagation(); onNodeClick(n.id) } : undefined}
          >
            {onNodeClick ? <title>{n.id}</title> : null}
          </motion.circle>
        ),
      )}
    </svg>
  )
}

/* ---------------- 骨架屏 ---------------- */

export function useDelayedFlag(ready: boolean, ms = 200) {
  const [show, setShow] = useState(false)
  useEffect(() => {
    if (ready) return
    const t = setTimeout(() => setShow(true), ms)
    return () => clearTimeout(t)
  }, [ready, ms])
  return !ready && show
}

export function PostSkeleton() {
  const bar = {
    background: C.paper2,
    borderRadius: 6,
    animation: 'pg-pulse 1.2s ease-in-out infinite',
  } as React.CSSProperties
  return (
    <div className="mx-auto w-full max-w-[42rem] px-6 pt-10">
      <style>{`@keyframes pg-pulse{0%,100%{opacity:1}50%{opacity:.45}}`}</style>
      <div style={{ ...bar, width: '42%', height: 28, marginBottom: 20 }} />
      <div style={{ ...bar, width: '30%', height: 12, marginBottom: 48 }} />
      {[92, 100, 96, 60].map((w, i) => (
        <div key={i} style={{ ...bar, width: `${w}%`, height: 14, marginBottom: 16 }} />
      ))}
      <div style={{ height: 32 }} />
      {[100, 88, 95].map((w, i) => (
        <div key={`b${i}`} style={{ ...bar, width: `${w}%`, height: 14, marginBottom: 16 }} />
      ))}
    </div>
  )
}

/* ---------------- 阅读进度条 ---------------- */

export function ReadingProgress() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const onScroll = () => {
      const el = ref.current
      if (!el) return
      const h = document.documentElement
      const max = h.scrollHeight - h.clientHeight
      const p = max > 0 ? h.scrollTop / max : 0
      el.style.transform = `scaleX(${p})`
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return (
    <div
      ref={ref}
      className="fixed left-0 top-0 z-[60] h-0.5 w-full"
      style={{ background: C.accent, transformOrigin: 'left', transform: 'scaleX(0)' }}
    />
  )
}

/* ---------------- 其他 ---------------- */

export function useGhostHint() {
  const [hint, setHint] = useState<string | null>(null)
  const show = useCallback((title: string) => setHint(title), [])
  const hide = useCallback(() => setHint(null), [])
  return { hint, show, hide }
}

export function formatDate(d: string) {
  return d || ''
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

export { useNavigate }
