import { useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Search } from 'lucide-react'
import { useGraphStore } from '@/store'
import { getTagColor } from '@/lib/colors'
import type { GraphNodeData } from '@/types/graph'
import { cn } from '@/lib/utils'

interface SearchBoxProps {
  onPick: (node: GraphNodeData) => void
}

/** 顶部居中搜索框：模糊匹配 title/id，↑↓ 选择，Enter 确认 */
export default function SearchBox({ onPick }: SearchBoxProps) {
  const graph = useGraphStore((s) => s.graph)
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const results = useMemo(() => {
    if (!graph || !q.trim()) return []
    const needle = q.trim().toLowerCase()
    return graph.nodes
      .filter(
        (n) =>
          n.title.toLowerCase().includes(needle) || n.id.toLowerCase().includes(needle),
      )
      .slice(0, 8)
  }, [graph, q])

  const pick = (n: GraphNodeData) => {
    onPick(n)
    setQ('')
    setOpen(false)
    inputRef.current?.blur()
  }

  return (
    <div
      className="absolute left-1/2 top-4 -translate-x-1/2"
      style={{ width: 'min(420px, 60vw)', zIndex: 20 }}
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
          onFocus={() => setOpen(true)}
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
          placeholder="搜索标题，飞到节点…"
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
            {results.map((n, i) => (
              <motion.li
                key={n.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
              >
                <button
                  className={cn(
                    'flex w-full items-center gap-2 px-4 py-2 text-left text-sm',
                    i === active ? 'bg-accentc-soft' : 'hover:bg-paper-3',
                  )}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    pick(n)
                  }}
                  onMouseEnter={() => setActive(i)}
                >
                  <span className="flex-1 truncate text-ink">{n.title}</span>
                  <span className="rounded border border-line px-1 text-[10px] font-mono-jb uppercase text-ink-3">
                    {n.exists ? n.type : 'seed'}
                  </span>
                  {n.tags.slice(0, 2).map((t) => (
                    <span
                      key={t}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: getTagColor(t) }}
                      aria-hidden
                    />
                  ))}
                </button>
              </motion.li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}
