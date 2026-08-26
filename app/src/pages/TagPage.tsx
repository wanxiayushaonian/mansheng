/**
 * /tag/:name —— 标签聚合页
 * 标签头部 + 迷你星座图 + 清单⇄小图双视图 + 全部标签云。
 */
import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { List, Waypoints, ChevronDown, Sprout } from 'lucide-react'
import {
  C, MiniGraph, PageChrome, TagChip, fetchGraph, fetchTags, nodeColor, tagColor,
  useLenis,
} from './chrome'
import type { GraphData, GraphNode, TagInfo } from './chrome'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { useEffect } from 'react'

const EASE: [number, number, number, number] = [0.22, 0.8, 0.32, 1]
type SortKey = 'new' | 'old' | 'degree'
type ViewMode = 'list' | 'map'

export default function TagPage() {
  const { name = '' } = useParams()
  const tagName = decodeURIComponent(name)
  const navigate = useNavigate()
  useLenis()

  const [graph, setGraph] = useState<GraphData | null>(null)
  const [tags, setTags] = useState<TagInfo[] | null>(null)
  const [view, setView] = useState<ViewMode>('list')
  const [sort, setSort] = useState<SortKey>('new')

  useDocumentMeta({
    title: `${tagName} · 标签`,
    description: `标签「${tagName}」下的全部笔记与连接`,
  })

  useEffect(() => {
    let alive = true
    fetchGraph().then((g) => alive && setGraph(g)).catch(() => {})
    fetchTags().then((t) => alive && setTags(t)).catch(() => {})
    return () => { alive = false }
  }, [])

  const color = tagColor(tagName)
  const info = (tags ?? []).find((t) => t.name === tagName)

  const isAll = tagName === '全部' || tagName === ''

  const nodes = useMemo(() => {
    if (!graph) return []
    if (isAll) return graph.nodes
    return graph.nodes.filter((n) => n.tags.includes(tagName))
  }, [graph, tagName, isAll])

  const sorted = useMemo(() => {
    const arr = [...nodes]
    if (sort === 'new') arr.sort((a, b) => b.date.localeCompare(a.date))
    else if (sort === 'old') arr.sort((a, b) => a.date.localeCompare(b.date))
    else arr.sort((a, b) => b.degree - a.degree)
    return arr
  }, [nodes, sort])

  const seeds = nodes.filter((n) => !n.exists).length
  const latest = nodes.reduce((m, n) => (n.date > m ? n.date : m), '')

  // 星座图 / 小图视图数据（含 tag 弱边与 link 边中属于该标签子图的部分）
  const sub = useMemo(() => {
    if (!graph) return { nodes: [], edges: [] as [string, string][] }
    const idset = new Set(nodes.map((n) => n.id))
    const edges = graph.edges
      .filter((e) => idset.has(e.source) && idset.has(e.target))
      .map((e) => [e.source, e.target] as [string, string])
    return {
      nodes: nodes.map((n) => ({
        id: n.id, x: n.x, y: n.y, color: nodeColor(n), ghost: !n.exists,
        r: 3 + Math.min(n.degree, 12) * 0.5,
      })),
      edges,
    }
  }, [graph, nodes])

  const maxCount = Math.max(1, ...(tags ?? []).map((t) => t.count))
  const chipSize = (count: number) => {
    const r = count / maxCount
    const steps = [0.75, 0.875, 0.9375, 1, 1.125]
    return `${steps[Math.min(4, Math.floor(r * 5))]}rem`
  }

  return (
    <PageChrome>
      <div className="mx-auto max-w-[72rem] px-6 pb-24 pt-12">
        {/* 面包屑 */}
        <motion.div
          className="flex items-center justify-between"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2, delay: 0.08 }}
        >
          <div className="text-sm" style={{ color: C.ink2 }}>
            <a href="#all-tags" className="hover:text-[#A45A3C]">标签</a>
            <span className="mx-1.5" style={{ color: C.ink3 }}>/</span>
            <span style={{ color: C.ink }}>{tagName}</span>
          </div>
          <Link
            to={`/graph#tags=${encodeURIComponent(tagName)}`}
            className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm"
            style={{ color: C.accent, border: `1px solid ${C.accent}` }}
            onMouseEnter={(e) => (e.currentTarget.style.background = C.accentSoft)}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            在图中查看 ↗
          </Link>
        </motion.div>

        {/* 标签头部 */}
        <header className="mt-10">
          <div className="flex items-center gap-4">
            <motion.span
              className="inline-block rounded-full"
              style={{ width: 18, height: 18, background: color }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.35, type: 'spring', bounce: 0.4 }}
            />
            <motion.h1
              className="text-[1.875rem] md:text-[2.5rem]"
              style={{
                fontFamily: '"Noto Serif SC","Source Serif 4",Georgia,serif',
                fontWeight: 700, lineHeight: 1.25, letterSpacing: '0.01em', color: C.ink,
              }}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: EASE }}
            >
              {tagName}
            </motion.h1>
          </div>
          <motion.p
            className="mt-3 text-sm"
            style={{ color: C.ink2 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {info?.description && <span>{info.description} · </span>}
            {nodes.filter((n) => n.exists).length} 篇笔记
            {seeds > 0 && ` · ${seeds} 枚待写种子`}
            {latest && ` · 最近更新 ${latest}`}
          </motion.p>

          {/* 迷你星座图（装饰，<768px 隐藏） */}
          {sub.nodes.length > 1 && (
            <div
              className="mt-6 hidden overflow-hidden rounded-[10px] md:block"
              style={{ background: C.paper2, border: `1px solid ${C.line}` }}
            >
              <MiniGraph
                nodes={sub.nodes}
                edges={sub.edges}
                width={1152}
                height={160}
                onNodeClick={(id) => {
                  const n = nodes.find((x) => x.id === id)
                  if (n?.exists) navigate(`/p/${encodeURIComponent(id)}`)
                }}
              />
            </div>
          )}
        </header>

        {/* 视图控制条 */}
        <motion.div
          className="mt-10 flex items-center justify-between"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div
            className="relative flex rounded-full p-0.5"
            style={{ background: C.paper2, border: `1px solid ${C.line}` }}
          >
            {(['list', 'map'] as ViewMode[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className="relative flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm transition-colors"
                style={{ color: view === v ? C.ink : C.ink3, fontWeight: view === v ? 600 : 400 }}
              >
                {view === v && (
                  <motion.span
                    layoutId="tag-view-pill"
                    className="absolute inset-0 rounded-full"
                    style={{ background: C.accentSoft }}
                    transition={{ duration: 0.2 }}
                  />
                )}
                <span className="relative flex items-center gap-1.5">
                  {v === 'list' ? <List size={14} /> : <Waypoints size={14} />}
                  {v === 'list' ? '清单' : '小图'}
                </span>
              </button>
            ))}
          </div>

          <label
            className="relative inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm"
            style={{ background: C.paper2, border: `1px solid ${C.line}`, color: C.ink2 }}
          >
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="cursor-pointer appearance-none bg-transparent pr-4 outline-none"
              aria-label="排序"
            >
              <option value="new">最新</option>
              <option value="old">最早</option>
              <option value="degree">最多连接</option>
            </select>
            <ChevronDown size={13} className="pointer-events-none absolute right-2.5" />
          </label>
        </motion.div>

        {/* 内容区 */}
        {sorted.length === 0 ? (
          <div className="mt-20 text-center">
            <p className="text-sm" style={{ color: C.ink2 }}>这个标签下还没有内容</p>
            <Link to="/graph" className="mt-3 inline-block text-sm" style={{ color: C.accent }}>
              回到图谱 →
            </Link>
          </div>
        ) : view === 'list' ? (
          <div className="mt-8 grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
            {sorted.map((n, i) => (
              <PostCard key={n.id} node={n} index={i} currentTag={tagName} />
            ))}
          </div>
        ) : (
          <motion.div
            className="mt-8 overflow-hidden rounded-[10px]"
            style={{ background: C.paper2, border: `1px solid ${C.line}` }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
          >
            <MiniGraph
              nodes={sub.nodes}
              edges={sub.edges}
              width={1152}
              height={480}
              onNodeClick={(id) => {
                const n = nodes.find((x) => x.id === id)
                if (n?.exists) navigate(`/p/${encodeURIComponent(id)}`)
              }}
            />
          </motion.div>
        )}

        {/* 全部标签索引 */}
        <section id="all-tags" className="mt-24 scroll-mt-24">
          <div className="mb-6 flex items-center gap-4">
            <div className="h-px flex-1" style={{ background: C.line }} />
            <h2 className="text-[1.125rem] font-semibold" style={{ color: C.ink }}>全部标签</h2>
            <div className="h-px flex-1" style={{ background: C.line }} />
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            {(tags ?? []).map((t, i) => (
              <motion.span
                key={t.name}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.22, delay: i * 0.02 }}
                whileHover={{ y: -2 }}
              >
                <TagChip
                  name={`${t.name} ${t.count}`}
                  color={tagColor(t.name)}
                  active={t.name === tagName}
                  fontSize={chipSize(t.count)}
                />
              </motion.span>
            ))}
          </div>
        </section>
      </div>
    </PageChrome>
  )
}

/* ---------------- 文章卡 ---------------- */

function PostCard({
  node, index, currentTag,
}: {
  node: GraphNode
  index: number
  currentTag: string
}) {
  const navigate = useNavigate()
  const barH = 8 + Math.min(node.degree * 3, 28)
  const barColor = nodeColor(node)

  if (!node.exists) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38, delay: (index % 6) * 0.06, ease: EASE }}
        className="flex flex-col rounded-[10px] border border-dashed p-5"
        style={{ borderColor: C.lineStrong, background: 'transparent', cursor: 'help' }}
        title="此节点待写"
      >
        <div className="text-xs" style={{ color: C.ink3 }}>连接 {node.degree}</div>
        <div className="mt-2 line-clamp-2 font-semibold" style={{ fontFamily: '"Noto Serif SC",serif', color: C.ink3 }}>
          {node.title}
        </div>
        <div className="mt-auto flex items-center gap-1 pt-4 text-xs" style={{ color: C.ink3 }}>
          <Sprout size={12} /> 待写的种子
        </div>
      </motion.div>
    )
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, delay: (index % 6) * 0.06, ease: EASE }}
      whileHover={{ y: -3 }}
      className="relative cursor-pointer rounded-[10px] p-5 transition-shadow hover:shadow-[0_6px_20px_rgba(46,42,36,0.09)]"
      style={{ background: C.paper2, border: `1px solid ${C.line}` }}
      onClick={() => navigate(`/p/${encodeURIComponent(node.id)}`)}
    >
      {/* degree 竖条 */}
      <span
        className="absolute left-0 top-5 w-[3px] rounded-r"
        style={{ height: barH, background: barColor }}
      />
      <div className="flex items-center justify-between text-xs" style={{ color: C.ink3 }}>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: barColor }} />
          <span className="font-mono uppercase">{node.type}</span> · {node.date}
        </span>
        <span title="连接数">⬡ {node.degree}</span>
      </div>
      <h3
        className="mt-2 line-clamp-2 text-[1.125rem] font-semibold leading-snug hover:text-[#A45A3C]"
        style={{ fontFamily: '"Noto Serif SC",serif', color: C.ink }}
      >
        {node.title}
      </h3>
      <p className="mt-2 line-clamp-2 text-sm" style={{ color: C.ink2 }}>
        {node.summary}
      </p>
      <div className="mt-3 flex gap-2">
        {node.tags.filter((t) => t !== currentTag).slice(0, 2).map((t) => (
          <span key={t} onClick={(e) => e.stopPropagation()}>
            <TagChip name={t} color={tagColor(t)} />
          </span>
        ))}
      </div>
    </motion.article>
  )
}
