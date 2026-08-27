import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Sprout } from 'lucide-react'
import { MiniGraph } from '@/components/MiniGraph'
import { C } from '@/lib/ui'
import { nodeColor } from '@/lib/colors'
import type { GraphData, Post } from '@/lib/content'

const EASE: [number, number, number, number] = [0.22, 0.8, 0.32, 1]

/* ---------------- Links Panel ---------------- */

export function LinksPanel({
  post, graph, onGhost,
}: {
  post: Post
  graph: GraphData | null

  onGhost: (title: string) => void
}) {
  const navigate = useNavigate()

  // 一跳邻域小图
  const mini = useMemo(() => {
    if (!graph) return { nodes: [], edges: [] as [string, string][] }
    const self = graph.nodes.find((n) => n.id === post.id)
    if (!self) return { nodes: [], edges: [] as [string, string][] }
    const neighborIds = new Set<string>()
    const edges: [string, string][] = []
    for (const e of graph.edges) {
      if (e.source === post.id) { neighborIds.add(e.target); edges.push([e.source, e.target]) }
      else if (e.target === post.id) { neighborIds.add(e.source); edges.push([e.source, e.target]) }
    }
    const nodes = graph.nodes
      .filter((n) => n.id === post.id || neighborIds.has(n.id))
      .map((n) => ({
        id: n.id, x: n.x, y: n.y,
        color: nodeColor(n),
        ghost: !n.exists,
        isSelf: n.id === post.id,
      }))
    return { nodes, edges }
  }, [graph, post.id])

  return (
    <div className="space-y-8">
      {/* (a) 在图中的位置 */}
      <section>
        <div
          className="mb-2 uppercase"
          style={{ fontSize: '0.75rem', letterSpacing: '0.08em', color: C.ink3 }}
        >
          在图中的位置
        </div>
        <div
          className="cursor-pointer overflow-hidden rounded-[10px]"
          style={{ background: C.paper2, border: `1px solid ${C.line}` }}
          onClick={() => navigate(`/graph#focus=${encodeURIComponent(post.id)}`)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && navigate(`/graph#focus=${encodeURIComponent(post.id)}`)}
        >
          <MiniGraph nodes={mini.nodes} edges={mini.edges} width={272} height={192} />
        </div>
      </section>

      {/* (b) 链接到 */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-[1.125rem] font-semibold" style={{ color: C.ink }}>
          链接到 →
          <span
            className="rounded-full px-1.5 py-0.5 text-[0.7rem]"
            style={{ background: C.paper3, color: C.ink2 }}
          >
            {post.outgoing.length}
          </span>
        </h2>
        <ul className="space-y-1">
          {post.outgoing.map((o) => (
            <motion.li key={o.id} whileHover={{ x: 4 }} transition={{ duration: 0.18 }}>
              {o.exists ? (
                <Link
                  to={`/p/${encodeURIComponent(o.id)}`}
                  className="flex items-start gap-2 rounded-md px-1 py-1.5 text-sm"
                  style={{ color: C.ink }}
                >
                  <span
                    className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: C.accent }}
                  />
                  <span className="line-clamp-2 hover:text-[#A45A3C]">{o.title}</span>
                </Link>
              ) : (
                <button
                  type="button"
                  className="flex w-full cursor-help items-start gap-2 rounded-md border border-dashed px-1 py-1.5 text-left text-sm"
                  style={{ color: C.ink3, borderColor: 'transparent' }}
                  title="此节点待写"
                  onClick={() => onGhost(o.title)}
                >
                  <span
                    className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full border border-dashed"
                    style={{ borderColor: C.ink3 }}
                  />
                  <span className="line-clamp-2 flex-1">{o.title}</span>
                  <span className="inline-flex items-center gap-0.5 text-[0.7rem]">
                    <Sprout size={11} /> 待写
                  </span>
                </button>
              )}
            </motion.li>
          ))}
        </ul>
      </section>

      {/* (c) 被引用 */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-[1.125rem] font-semibold" style={{ color: C.ink }}>
          被引用 ←
          <span
            className="rounded-full px-1.5 py-0.5 text-[0.7rem]"
            style={{ background: C.paper3, color: C.ink2 }}
          >
            {post.backlinks.length}
          </span>
        </h2>
        {post.backlinks.length === 0 ? (
          <p className="text-sm" style={{ color: C.ink3 }}>
            还没有文章引用这里 —— 静待连接生长 🌱
          </p>
        ) : (
          <div className="space-y-3">
            {post.backlinks.map((b, i) => (
              <motion.div
                key={b.id}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: i * 0.07, ease: EASE }}
                className="rounded-lg p-3"
                style={{ background: C.paper2, border: `1px solid ${C.line}` }}
              >
                <Link
                  to={`/p/${encodeURIComponent(b.id)}`}
                  className="text-sm font-semibold hover:text-[#A45A3C]"
                  style={{ color: C.ink }}
                >
                  {b.title}
                </Link>
                {b.context && (
                  <p
                    className="mt-1.5 line-clamp-2"
                    style={{ fontSize: '0.75rem', lineHeight: 1.5, color: C.ink2 }}
                  >
                    <HighlightContext context={b.context} title={post.title} id={post.id} />
                  </p>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* 在图中查看 */}
      <Link
        to={`/graph#focus=${encodeURIComponent(post.id)}`}
        className="inline-flex items-center gap-1 text-sm"
        style={{ color: C.accent }}
      >
        在图中查看 ↗
      </Link>
    </div>
  )
}

/** backlink context 片段：高亮被引文章标题/id 出现处 */
function HighlightContext({ context, title, id }: { context: string; title: string; id: string }) {
  const key = title || id
  const idx = context.indexOf(key)
  if (idx < 0) return <>…{context}…</>
  return (
    <>
      …{context.slice(0, idx)}
      <mark style={{ background: C.accentSoft, color: C.ink, borderRadius: 3, padding: '0 2px' }}>
        {key}
      </mark>
      {context.slice(idx + key.length)}…
    </>
  )
}

