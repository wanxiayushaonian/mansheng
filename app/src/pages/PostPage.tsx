/**
 * /p/:id —— 文章阅读页
 * 居中正文栏 42rem + ≥1200px 右侧 sticky links-panel + ghost 种子落地页。
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Sprout, Network } from 'lucide-react'
import {
  C, DiamondDivider, GhostHint, MiniGraph, PageChrome, PostSkeleton,
  ReadingProgress, TagChip, fetchGraph, fetchPost, htmlToText, nodeColor, tagColor,
  useDelayedFlag, useGhostHint, useLenis,
} from './chrome'
import type { GraphData, Post } from './chrome'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { useGraphStore } from '@/store'

const EASE: [number, number, number, number] = [0.22, 0.8, 0.32, 1]

/* 正文 + 代码块暖色系样式（作用域 .post-body） */
const ARTICLE_CSS = `
.post-body { font-family: "Noto Serif SC","Source Serif 4",Georgia,serif; font-size: 1rem; line-height: 1.85; color: ${C.ink}; }
.post-body p { margin: 0 0 1.2em; }
.post-body h2 { font-size: 1.5rem; font-weight: 700; line-height: 1.35; margin: 64px 0 24px; }
.post-body h2::before { content: "— "; color: ${C.lineStrong}; }
.post-body h3 { font-size: 1.125rem; font-weight: 600; line-height: 1.45; margin: 48px 0 16px; }
.post-body a { color: ${C.accent}; text-decoration: none; border-bottom: 1px solid ${C.accentSoft}; transition: border-color .18s; }
.post-body a:hover { border-bottom-color: ${C.accent}; }
.post-body a.wikilink--ghost { color: ${C.ink3}; border-bottom: 1px dashed ${C.ink3}; cursor: help; }
.post-body a[href^="http"]::after { content: " ↗"; font-size: .8em; }
.post-body code:not(pre code) { font-family: "JetBrains Mono",ui-monospace,monospace; font-size: .85em; background: ${C.paper2}; border-radius: 4px; padding: 2px 6px; }
.post-body pre { position: relative; background: #EFE8DB; border: 1px solid ${C.line}; border-radius: 10px; padding: 16px 18px; overflow-x: auto; margin: 0 0 1.2em; }
.post-body pre code { font-family: "JetBrains Mono",ui-monospace,monospace; font-size: .85rem; line-height: 1.7; background: transparent; padding: 0; }
.post-body .hljs-keyword, .post-body .hljs-selector-tag { color: ${C.clay}; }
.post-body .hljs-string, .post-body .hljs-attr { color: ${C.moss}; }
.post-body .hljs-comment, .post-body .hljs-quote { color: ${C.ink3}; font-style: italic; }
.post-body .hljs-title, .post-body .hljs-title.function_ { color: ${C.accent}; }
.post-body .hljs-number, .post-body .hljs-literal { color: ${C.ochre}; }
.post-body .hljs-property, .post-body .hljs-variable { color: ${C.ink}; }
.post-body .hljs-built_in { color: ${C.plum}; }
.post-body blockquote { border-left: 3px solid ${C.ochre}; background: ${C.paper2}; color: ${C.ink2}; padding: 12px 18px; border-radius: 0 10px 10px 0; margin: 0 0 1.2em; }
.post-body blockquote p { margin: 0; }
.post-body img { border-radius: 10px; max-width: 100%; margin: 0 auto; display: block; }
.post-body ul, .post-body ol { margin: 0 0 1.2em; padding-left: 1.4em; }
.post-body li { margin-bottom: .4em; }
.post-body ul > li::marker { color: ${C.clay}; }
.post-body hr { border: none; border-top: 1px solid ${C.line}; margin: 48px 0; }
.post-body .code-copy { position: absolute; top: 8px; right: 8px; font-family: "Noto Sans SC",sans-serif; font-size: .7rem; color: ${C.ink3}; background: ${C.paper}; border: 1px solid ${C.line}; border-radius: 6px; padding: 2px 8px; opacity: 0; transition: opacity .15s; cursor: pointer; }
.post-body pre:hover .code-copy { opacity: 1; }
`

export default function PostPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  useLenis()

  const [post, setPost] = useState<Post | null>(null)
  const [graph, setGraph] = useState<GraphData | null>(null)
  const [notFound, setNotFound] = useState(false)
  const { hint, show: showHint, hide: hideHint } = useGhostHint()
  const bodyRef = useRef<HTMLDivElement>(null)

  useDocumentMeta({
    title: post ? post.title : notFound ? `${id}（待写）` : undefined,
    description: post
      ? htmlToText(post.html).replace(/\s+/g, ' ').trim().slice(0, 110)
      : undefined,
    image: post ? `og/${encodeURIComponent(post.id)}.png` : undefined,
  })

  const markRead = useGraphStore((s) => s.markRead)

  // 驻留 5s 或滚动超过 60% 记为已读（点开就走不算）
  useEffect(() => {
    if (!post) return
    let done = false
    const onScroll = () => {
      const el = document.documentElement
      const max = el.scrollHeight - el.clientHeight
      if (max <= 0 || el.scrollTop / max >= 0.6) mark()
    }
    const mark = () => {
      if (done) return
      done = true
      markRead(post.id)
      clearTimeout(timer)
      window.removeEventListener('scroll', onScroll)
    }
    const timer = setTimeout(mark, 5000)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      clearTimeout(timer)
      window.removeEventListener('scroll', onScroll)
    }
  }, [post, markRead])

  const showSkeleton = useDelayedFlag(!!post || notFound)

  useEffect(() => {
    let alive = true
    setPost(null)
    setNotFound(false)
    window.scrollTo(0, 0)
    fetchPost(id)
      .then((p) => alive && setPost(p))
      .catch(() => alive && setNotFound(true))
    fetchGraph().then((g) => alive && setGraph(g)).catch(() => {})
    return () => { alive = false }
  }, [id])


  // wikilink 事件委托 + 代码块复制按钮
  useEffect(() => {
    const el = bodyRef.current
    if (!el || !post) return
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const copy = target.closest('.code-copy') as HTMLElement | null
      if (copy) {
        const pre = copy.parentElement
        const code = pre?.querySelector('code')
        if (code) navigator.clipboard?.writeText(code.textContent ?? '').catch(() => {})
        copy.textContent = '已复制'
        setTimeout(() => { copy.textContent = '复制' }, 1500)
        return
      }
      const a = target.closest('a.wikilink') as HTMLAnchorElement | null
      if (!a) return
      e.preventDefault()
      const t = a.dataset.target ?? ''
      if (a.classList.contains('wikilink--ghost')) {
        showHint(t)
      } else if (t) {
        navigate(`/p/${encodeURIComponent(t)}`)
      }
    }
    el.addEventListener('click', onClick)
    // 注入复制按钮
    el.querySelectorAll('pre').forEach((pre) => {
      if (pre.querySelector('.code-copy')) return
      const btn = document.createElement('button')
      btn.className = 'code-copy'
      btn.type = 'button'
      btn.textContent = '复制'
      pre.appendChild(btn)
    })
    return () => el.removeEventListener('click', onClick)
  }, [post, navigate, showHint])

  // 上一篇 / 下一篇（同类型按 date 相邻）
  const prevNext = useMemo(() => {
    if (!graph || !post) return { prev: null, next: null }
    const same = graph.nodes
      .filter((n) => n.exists && n.type === post.type)
      .sort((a, b) => a.date.localeCompare(b.date))
    const i = same.findIndex((n) => n.id === post.id)
    return {
      prev: i > 0 ? same[i - 1] : null,
      next: i >= 0 && i < same.length - 1 ? same[i + 1] : null,
    }
  }, [graph, post])

  // ghost 落地页：从 edges 反查引用者
  const referrers = useMemo(() => {
    if (!graph || !notFound) return []
    const ids = new Set(
      graph.edges.filter((e) => e.target === id && e.kind === 'link').map((e) => e.source),
    )
    return graph.nodes.filter((n) => ids.has(n.id))
  }, [graph, notFound, id])

  return (
    <PageChrome>
      <style>{ARTICLE_CSS}</style>
      <ReadingProgress />
      <AnimatePresence>{hint && <GhostHint title={hint} onDone={hideHint} />}</AnimatePresence>

      {showSkeleton && <PostSkeleton />}

      {notFound && (
        <SeedLanding id={id} referrers={referrers} />
      )}

      {post && (
        <div className="mx-auto max-w-[80rem] px-6">
          {/* 面包屑条 */}
          <motion.div
            className="mx-auto flex max-w-[42rem] items-center justify-between pt-10 min-[1200px]:max-w-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2, delay: 0.1 }}
          >
            <Link
              to="/graph"
              className="inline-flex items-center gap-1.5 text-sm transition-colors"
              style={{ color: C.ink2 }}
            >
              <ArrowLeft size={14} /> 返回图谱
            </Link>
            <Link
              to={`/graph#focus=${encodeURIComponent(post.id)}`}
              className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm transition-colors"
              style={{ color: C.accent, border: `1px solid ${C.accent}` }}
              onMouseEnter={(e) => (e.currentTarget.style.background = C.accentSoft)}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              在图中查看 ↗
            </Link>
          </motion.div>

          {/* 三栏栅格 */}
          <div
            className="grid grid-cols-[minmax(0,42rem)] justify-center gap-10 pb-16 min-[1200px]:grid-cols-[1fr_minmax(0,42rem)_17rem_1fr]"
          >
            <div className="min-[1200px]:col-start-2">
              {/* 文章头部 */}
              <header className="pt-8">
                <motion.h1
                  className="text-[1.875rem] md:text-[2.5rem]"
                  style={{
                    fontFamily: '"Noto Serif SC","Source Serif 4",Georgia,serif',
                    fontWeight: 700, lineHeight: 1.25, letterSpacing: '0.01em', color: C.ink,
                  }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: EASE }}
                >
                  {post.title}
                </motion.h1>
                <motion.div
                  className="mt-4 flex flex-wrap items-center gap-3"
                  style={{ fontSize: '0.75rem', letterSpacing: '0.04em', color: C.ink2 }}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: 0.35 }}
                >
                  <span className="inline-flex items-center gap-1.5 font-mono uppercase">
                    <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: post.tags[0] ? tagColor(post.tags[0]) : nodeColor({ type: post.type, tags: [] }) }} />
                    {post.type}
                  </span>
                  <span>{post.date}</span>
                  {post.tags.map((t) => (
                    <TagChip key={t} name={t} color={tagColor(t)} />
                  ))}
                  <span style={{ color: C.ink2 }}>
                    {post.html.replace(/<[^>]+>/g, '').length} 字
                  </span>
                </motion.div>
                <DiamondDivider className="mt-12" />
              </header>

              {/* 正文 */}
              <motion.div
                ref={bodyRef}
                className="post-body mt-12"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.15 }}
                dangerouslySetInnerHTML={{ __html: post.html }}
              />

              {/* <1200px 时 links 区块收进正文下方 */}
              <div className="mt-16 min-[1200px]:hidden">
                <LinksPanel post={post} graph={graph} onGhost={showHint} />
              </div>

              {/* 上一篇 / 下一篇 */}
              <motion.nav
                className="mt-16 grid gap-4 border-t pt-10 sm:grid-cols-2"
                style={{ borderColor: C.line }}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: EASE }}
              >
                {prevNext.prev ? (
                  <PrevNextCard dir="prev" id={prevNext.prev.id} title={prevNext.prev.title} date={prevNext.prev.date} tag={prevNext.prev.tags[0]} />
                ) : <span />}
                {prevNext.next ? (
                  <PrevNextCard dir="next" id={prevNext.next.id} title={prevNext.next.title} date={prevNext.next.date} tag={prevNext.next.tags[0]} />
                ) : <span />}
              </motion.nav>
            </div>

            {/* ≥1200px 右侧 sticky links-panel */}
            <aside className="hidden min-[1200px]:col-start-3 min-[1200px]:block">
              <div className="sticky top-[88px] max-h-[calc(100dvh-104px)] overflow-y-auto pr-1 pt-8">
                <LinksPanel post={post} graph={graph} onGhost={showHint} />
              </div>
            </aside>
          </div>
        </div>
      )}

      {/* 移动端回到图谱浮钮 */}
      <Link
        to="/graph"
        className="fixed bottom-5 right-5 z-40 flex h-11 w-11 items-center justify-center rounded-full md:hidden"
        style={{ background: C.accent, color: C.paper, boxShadow: '0 6px 20px rgba(46,42,36,0.2)' }}
        aria-label="回到图谱"
      >
        <Network size={18} />
      </Link>
    </PageChrome>
  )
}

/* ---------------- Links Panel ---------------- */

function LinksPanel({
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

function PrevNextCard({
  dir, id, title, date, tag,
}: {
  dir: 'prev' | 'next'
  id: string
  title: string
  date: string
  tag?: string

}) {
  return (
    <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.18 }} className={dir === 'next' ? 'sm:text-right' : ''}>
      <Link
        to={`/p/${encodeURIComponent(id)}`}
        className="block rounded-[10px] p-4 transition-shadow"
        style={{ background: C.paper2, border: `1px solid ${C.line}` }}
      >
        <div className="mb-1 flex items-center gap-1 text-xs" style={{ color: C.ink2, justifyContent: dir === 'next' ? 'flex-end' : 'flex-start' }}>
          {dir === 'prev' ? <><ArrowLeft size={12} /> 上一篇</> : <>下一篇 <ArrowRight size={12} /></>}
        </div>
        <div className="font-semibold" style={{ fontFamily: '"Noto Serif SC",serif', color: C.ink }}>
          {title}
        </div>
        <div className="mt-2 flex items-center gap-2 text-xs" style={{ color: C.ink2, justifyContent: dir === 'next' ? 'flex-end' : 'flex-start' }}>
          <span>{date}</span>
          {tag && <TagChip name={tag} color={tagColor(tag)} />}
        </div>
      </Link>
    </motion.div>
  )
}

/* ---------------- ghost 种子落地页 ---------------- */

function SeedLanding({
  id, referrers,
}: {
  id: string
  referrers: { id: string; title: string; date: string }[]
}) {
  return (
    <div className="mx-auto max-w-[42rem] px-6 py-24">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: EASE }}
        className="rounded-[10px] p-10 text-center"
        style={{ background: C.paper2, border: `1px dashed ${C.lineStrong}` }}
      >
        <div className="mb-4 flex justify-center" style={{ color: C.moss }}>
          <Sprout size={32} />
        </div>
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: '"Noto Serif SC",serif', color: C.ink }}
        >
          「{id}」还是一粒种子
        </h1>
        <p className="mt-3 text-sm leading-relaxed" style={{ color: C.ink2 }}>
          它已被 [[wikilink]] 提及，但尚未写成。种子被允许存在 —— 也许某天就发芽了。
        </p>

        {referrers.length > 0 && (
          <div className="mt-8 text-left">
            <div className="mb-2 text-xs uppercase" style={{ letterSpacing: '0.08em', color: C.ink2 }}>
              提及它的文章
            </div>
            <ul className="space-y-1">
              {referrers.map((r) => (
                <li key={r.id}>
                  <Link
                    to={`/p/${encodeURIComponent(r.id)}`}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:text-[#A45A3C]"
                    style={{ color: C.ink }}
                  >
                    <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: C.accent }} />
                    {r.title}
                    <span className="ml-auto text-xs" style={{ color: C.ink2 }}>{r.date}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <Link
          to={`/graph#focus=${encodeURIComponent(id)}`}
          className="mt-8 inline-flex items-center gap-1.5 rounded-[10px] px-6 py-3 text-sm font-semibold"
          style={{ background: C.accent, color: C.paper }}
        >
          在图中看看它的位置 →
        </Link>
      </motion.div>
    </div>
  )
}
