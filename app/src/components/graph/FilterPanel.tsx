import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Funnel, X } from 'lucide-react'
import { useGraphStore } from '@/store'
import TagChip from '@/components/TagChip'
import { cn } from '@/lib/utils'

function Toggle({
  on,
  onChange,
  label,
}: {
  on: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className="flex w-full items-center justify-between py-1.5 text-sm text-ink-2 hover:text-ink"
    >
      <span>{label}</span>
      <span
        className={cn(
          'relative inline-block w-8 h-[18px] rounded-full transition-colors duration-150',
        )}
        style={{ background: on ? 'var(--moss)' : 'var(--line)' }}
      >
        <span
          className="absolute top-[2px] h-[14px] w-[14px] rounded-full bg-white transition-all duration-150"
          style={{ left: on ? 16 : 2 }}
        />
      </span>
    </button>
  )
}

/** 右侧悬浮过滤面板（<1200px 收起为浮钮） */
export default function FilterPanel({
  visibleCount,
  visibleEdgeCount,
}: {
  visibleCount: number
  visibleEdgeCount: number
}) {
  const graph = useGraphStore((s) => s.graph)
  const filters = useGraphStore((s) => s.filters)
  const { toggleTag, clearTags, toggleType, setHideWeakEdges, setHideGhost } = useGraphStore()
  const [open, setOpen] = useState(() => window.innerWidth >= 1200)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1200px)')
    const fn = (e: MediaQueryListEvent) => setOpen(e.matches)
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [])

  if (!graph) return null
  const totalNodes = graph.nodes.length

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.aside
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            transition={{ duration: 0.24, ease: [0.22, 0.8, 0.32, 1] }}
            className="float-panel absolute right-4 top-[88px] w-[264px] max-h-[70vh] overflow-y-auto p-4"
            style={{ zIndex: 20 }}
          >
            <div className="flex items-center justify-between">
              <span className="font-serif-sc text-sm font-semibold text-ink">过滤</span>
              <button
                className="text-ink-3 hover:text-ink lg:hidden"
                onClick={() => setOpen(false)}
                aria-label="收起过滤面板"
              >
                <X size={14} />
              </button>
            </div>

            <div className="mt-3 pt-3 border-t border-line">
              <div className="flex items-center justify-between text-xs text-ink-3">
                <span>标签（多选，OR）</span>
                <button className="hover:text-accentc" onClick={clearTags}>
                  清空
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {graph.tags
                  .filter((t) => t.count > 0)
                  .map((t) => (
                    <TagChip
                      key={t.name}
                      name={t.name}
                      selected={filters.tags.includes(t.name)}
                      onClick={() => toggleTag(t.name)}
                    />
                  ))}
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-line">
              <Toggle
                on={filters.hideWeakEdges}
                onChange={setHideWeakEdges}
                label="隐藏标签弱边"
              />
              {!filters.hideWeakEdges && (
                <p className="-mt-0.5 text-[0.7rem] leading-relaxed text-ink-3">
                  弱边在放大后显示（总览只看正文链接）
                </p>
              )}
              <Toggle on={filters.hideGhost} onChange={setHideGhost} label="隐藏占位种子" />
              <div className="flex items-center justify-between py-1.5">
                <span className="text-sm text-ink-2">类型</span>
                <div className="flex gap-1">
                  {(['post', 'essay', 'note'] as const).map((t) => {
                    const off = filters.typesOff.includes(t)
                    return (
                      <button
                        key={t}
                        onClick={() => toggleType(t)}
                        className={cn(
                          'px-2 py-0.5 rounded-full border text-xs transition-colors',
                          off
                            ? 'border-line text-ink-3 line-through'
                            : 'border-line-strong text-ink-2 bg-paper-3',
                        )}
                      >
                        {t}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-line text-xs text-ink-3 font-mono-jb">
              当前显示 {visibleCount} / {totalNodes} 节点 · {visibleEdgeCount} 边
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {!open && (
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="float-panel absolute right-4 top-[88px] w-10 h-10 rounded-full flex items-center justify-center text-ink-2 hover:text-accentc"
          style={{ zIndex: 20 }}
          onClick={() => setOpen(true)}
          aria-label="打开过滤面板"
        >
          <Funnel size={16} />
        </motion.button>
      )}
    </>
  )
}
