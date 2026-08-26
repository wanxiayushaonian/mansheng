import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import MiniSearch from 'minisearch'
import { Search } from 'lucide-react'
import { useGraphStore } from '@/store'
import { getTagColor } from '@/lib/colors'
import { tokenizeSearch, extractSnippet } from '@/lib/searchTokenize'
import type { SearchDoc } from '@/lib/searchTokenize'
import type { GraphNodeData } from '@/types/graph'
import { cn } from '@/lib/utils'

interface SearchBoxProps {
  onPick: (node: GraphNodeData) => void
}

interface FullTextIndex {
  ms: MiniSearch<SearchDoc>
  docs: Map<string, SearchDoc>
}

/** 全文索引懒加载（模块级缓存，整页共享；失败允许下次重试） */
let indexPromise: Promise<FullTextIndex> | null = null
function loadIndex(): Promise<FullTextIndex> {
  indexPromise ??= fetch(`${import.meta.env.BASE_URL}data/search-index.json`)
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      return r.json() as Promise<SearchDoc[]>
    })
    .then((docs) => {
      const ms = new MiniSearch<SearchDoc>({
        fields: ['title', 'summary', 'tags', 'text'],
        tokenize: tokenizeSearch,
        searchOptions: {
          tokenize: tokenizeSearch,
          prefix: true,
          combineWith: 'OR',
          boost: { title: 3, tags: 2.5, summary: 1.5, text: 1 },
        },
      })
      ms.addAll(docs)
      return { ms, docs: new Map(docs.map((d) => [d.id, d])) }
    })
    .catch((e: Error) => {
      indexPromise = null
      throw e
    })
  return indexPromise
}

interface ResultItem {
  id: string
  node: GraphNodeData
  /** 命中片段（含 <mark>），仅全文命中时存在 */
  snippet?: string
  score: number
}

/** 顶部居中搜索框：全文检索 + 标题兜底，↑↓ 选择，Enter 打开 */
export default function SearchBox({ onPick }: SearchBoxProps) {
  const graph = useGraphStore((s) => s.graph)
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [index, setIndex] = useState<FullTextIndex | null>(null)
  const [indexFailed, setIndexFailed] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // 首次聚焦即预取索引
  const prefetch = () => {
    if (!index && !indexFailed) {
      loadIndex().then(setIndex).catch(() => setIndexFailed(true))
    }
  }
  useEffect(() => {
    if (!index && !indexFailed && q.trim()) prefetch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  const results = useMemo<ResultItem[]>(() => {
    const query = q.trim()
    if (!graph || !query) return []
    const byId = new Map(graph.nodes.map((n) => [n.id, n]))
    const out: ResultItem[] = []
    const seen = new Set<string>()

    if (index) {
      for (const hit of index.ms.search(query).slice(0, 6)) {
        const node = byId.get(hit.id)
        const doc = index.docs.get(hit.id)
        if (!node || !doc) continue
        seen.add(hit.id)
        out.push({ id: hit.id, node, snippet: extractSnippet(doc, query), score: hit.score })
      }
    }

    // 标题/种子节点兜底（索引只覆盖已成文的文章）
    const needle = query.toLowerCase()
    for (const n of graph.nodes) {
      if (out.length >= 8) break
      if (seen.has(n.id)) continue
      if (n.title.toLowerCase().includes(needle) || n.id.toLowerCase().includes(needle)) {
        out.push({ id: n.id, node: n, score: 0 })
        seen.add(n.id)
      }
    }
    return out.slice(0, 8)
  }, [graph, q, index])

  const pick = (item: ResultItem) => {
    if (item.node.exists) {
      navigate(`/p/${encodeURIComponent(item.id)}`)
    } else {
      onPick(item.node) // 种子节点：飞过去 + 提示待写
    }
    setQ('')
    setOpen(false)
    inputRef.current?.blur()
  }

  return (
    <div
      className="absolute left-1/2 top-4 -translate-x-1/2"
      style={{ width: 'min(480px, 70vw)', zIndex: 20 }}
    >
      <div className="float-panel flex items-center gap-2 h-11 px-4 rounded-full">
        <Search size={15} className="text-ink-3 shrink-0" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setOpen(true)
            setActive(0)
          }}
          onFocus={() => {
            prefetch()
            setOpen(true)
          }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setActive((a) => Math.min(a + 1, results.length - 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setActive((a) => Math.max(a - 1, 0))
            } else if (e.key === 'Enter' && results[active]) {
              pick(results[active])
            } else if (e.key === 'Escape') {
              setOpen(false)
              inputRef.current?.blur()
            }
          }}
          placeholder="搜索全文，或飞到节点…"
          className="w-full bg-transparent text-sm outline-none placeholder:text-ink-3 text-ink"
        />
      </div>
      <AnimatePresence>
        {open && results.length > 0 && (
          <motion.ul
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            transition={{ duration: 0.16 }}
            className="float-panel mt-2 overflow-hidden py-1"
          >
            {results.map((item, i) => (
              <motion.li
                key={item.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
              >
                <button
                  className={cn(
                    'flex w-full flex-col gap-0.5 px-4 py-2 text-left',
                    i === active ? 'bg-accentc-soft' : 'hover:bg-paper-3',
                  )}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    pick(item)
                  }}
                  onMouseEnter={() => setActive(i)}
                >
                  <span className="flex w-full items-center gap-2">
                    <span className="flex-1 truncate text-sm text-ink">{item.node.title}</span>
                    <span className="rounded border border-line px-1 text-[10px] font-mono-jb uppercase text-ink-3">
                      {item.node.exists ? item.node.type : 'seed'}
                    </span>
                    {item.node.tags.slice(0, 2).map((t) => (
                      <span
                        key={t}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: getTagColor(t) }}
                        aria-hidden
                      />
                    ))}
                  </span>
                  {item.snippet && (
                    <span
                      className="clamp-2 text-xs leading-relaxed text-ink-2 [&_mark]:bg-accentc-soft [&_mark]:text-accentc [&_mark]:rounded-sm [&_mark]:px-0.5"
                      dangerouslySetInnerHTML={{ __html: item.snippet }}
                    />
                  )}
                </button>
              </motion.li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}
