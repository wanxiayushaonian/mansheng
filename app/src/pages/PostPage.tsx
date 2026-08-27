/**
 * /p/:id —— 文章阅读页
 * 居中正文栏 42rem + ≥1200px 右侧 sticky links-panel + ghost 种子落地页。
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Network } from 'lucide-react'
import { DiamondDivider } from '@/components/DiamondDivider'
import { GhostToast } from '@/components/GhostToast'
import { PageChrome } from '@/components/PageChrome'
import { PostSkeleton } from '@/components/PostSkeleton'
import { ReadingProgress } from '@/components/ReadingProgress'
import { TagPill } from '@/components/TagPill'
import Comments from '@/components/Comments'
import { useDelayedFlag, useGhostHint } from '@/hooks/useContentHint'
import { useLenis } from '@/hooks/useLenis'
import { fetchGraph, fetchPost, htmlToText } from '@/lib/content'
import type { GraphData, Post } from '@/lib/content'
import { C } from '@/lib/ui'
import { nodeColor, tagColor } from '@/lib/colors'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { useGraphStore } from '@/store'
import { ARTICLE_CSS } from './post/article-css'
import { Toc } from './post/Toc'
import { LinksPanel } from './post/LinksPanel'
import { PrevNextCard } from './post/PrevNextCard'
import { SeedLanding } from './post/SeedLanding'

const EASE: [number, number, number, number] = [0.22, 0.8, 0.32, 1]


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
    // mermaid 图表：懒加载渲染（仅当文章含 diagram 时才拉取 chunk；语法错误保留源码）
    const mmdCodes = Array.from(el.querySelectorAll('pre > code.language-mermaid'))
    if (mmdCodes.length) {
      import('mermaid')
        .then(async ({ default: mermaid }) => {
          mermaid.initialize({
            startOnLoad: false,
            securityLevel: 'strict',
            theme: 'base',
            themeVariables: {
              primaryColor: '#F1EBE0',
              primaryBorderColor: '#A45A3C',
              primaryTextColor: '#2E2A24',
              lineColor: '#B09B7E',
              secondaryColor: '#EAE2D3',
              tertiaryColor: '#F7F3EC',
              fontFamily: '"Noto Sans SC", sans-serif',
            },
          })
          let i = 0
          for (const code of mmdCodes) {
            try {
              const { svg } = await mermaid.render(`mmd-${i++}`, code.textContent ?? '')
              const holder = document.createElement('div')
              holder.className = 'mermaid-embed'
              holder.innerHTML = svg
              code.closest('pre')?.replaceWith(holder)
            } catch {
              /* 语法错误：保留 hljs 源码展示 */
            }
          }
        })
        .catch(() => {})
    }
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
      <AnimatePresence>{hint && <GhostToast title={hint} onDone={hideHint} />}</AnimatePresence>

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
                    <TagPill key={t} name={t} color={tagColor(t)} />
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

              {/* 讨论（配置了 giscus 环境变量才出现） */}
              <Comments title={post.title} />
            </div>

            {/* ≥1200px 右侧 sticky links-panel */}
            <aside className="hidden min-[1200px]:col-start-3 min-[1200px]:block">
              <div className="sticky top-[88px] max-h-[calc(100dvh-104px)] space-y-8 overflow-y-auto pr-1 pt-8">
                {post.toc && post.toc.length > 1 && <Toc toc={post.toc} />}
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


