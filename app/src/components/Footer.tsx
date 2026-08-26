import { useGraphStore } from '@/store'

/** 三段式页脚：版权 / 统计 / 链接 */
export default function Footer() {
  const graph = useGraphStore((s) => s.graph)
  const posts = graph?.nodes.filter((n) => n.exists).length ?? 0
  const ghosts = graph?.nodes.filter((n) => !n.exists).length ?? 0
  const edges = graph?.edges.length ?? 0

  return (
    <footer className="border-t mt-16" style={{ borderColor: 'var(--line)' }}>
      <div className="mx-auto max-w-5xl px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-ink-3">
        <span>© 2026 蔓生花园 · 用 [[wikilink]] 写作，以图结构生长</span>
        <span className="font-mono-jb">
          内容 {posts} 篇 · 连接 {edges} 条 · 占位种子 {ghosts} 枚
        </span>
        <span className="flex gap-4">
          <a
            href={`${import.meta.env.BASE_URL}rss.xml`}
            className="hover:text-accentc transition-colors"
          >
            RSS
          </a>
          <a
            href="https://github.com/wanxiayushaonian/mansheng"
            target="_blank"
            rel="noreferrer"
            className="hover:text-accentc transition-colors"
          >
            GitHub
          </a>
        </span>
      </div>
    </footer>
  )
}
