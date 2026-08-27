import { memo, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Handle, Position, useViewport } from '@xyflow/react'
import type { NodeProps, Node } from '@xyflow/react'
import type { GraphNodeData } from '@/types/graph'
import { getNodeColor, getTagColor } from '@/lib/colors'
import { nodeSize } from '@/components/graph/nodeSize'
import { useGraphStore } from '@/store'

export interface GardenNodeRFData extends Record<string, unknown> {
  node: GraphNodeData
  /** 压暗不透明度：0 = 正常，0.08 = 聚焦模式重压，0.25 = hover 邻域轻压 */
  dimmed: number
  highlighted: boolean
  focused: boolean
  /** 已读：圆点去饱和 + 标签变淡 */
  read: boolean
  /** 在最短路径上：accent 圆环 */
  inPath: boolean
  /** 生长动画进行中：新出现的节点以 spring 入场 */
  growing: boolean
}

export type GardenNodeType = Node<GardenNodeRFData, 'garden'>

const TYPE_LABEL: Record<string, string> = { post: 'POST', essay: 'ESSAY', note: 'NOTE', ghost: 'SEED' }

/** hover 摘要卡 */
function HoverCard({ node }: { node: GraphNodeData }) {
  return (
    <div
      className="absolute bottom-full left-1/2 mb-3 pointer-events-none"
      style={{ width: 280, transform: 'translateX(-50%)', zIndex: 30 }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, transition: { duration: 0.1 } }}
        transition={{ duration: 0.16, ease: [0.22, 0.8, 0.32, 1] }}
        className="float-panel p-3.5 text-left"
      >
        <div className="font-serif-sc text-base font-semibold leading-snug clamp-2 text-ink">
          {node.title}
        </div>
        <div className="mt-1 text-xs font-mono-jb text-ink-2" style={{ letterSpacing: '0.04em' }}>
          {(node.exists ? TYPE_LABEL[node.type] : 'SEED') ?? 'POST'}
          {node.date ? ` · ${node.date}` : ''}
        </div>
        {node.summary && (
          <p className="mt-2 text-sm leading-relaxed text-ink-2 clamp-3">{node.summary.slice(0, 120)}</p>
        )}
        {node.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {node.tags.slice(0, 3).map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs bg-paper-3 text-ink-2"
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: getTagColor(t) }}
                  aria-hidden
                />
                {t}
              </span>
            ))}
          </div>
        )}
        <div className="mt-2 pt-2 border-t border-line text-xs text-accentc">
          {node.exists ? '点击阅读全文 →' : '🌱 待写的种子节点'}
        </div>
      </motion.div>
    </div>
  )
}

function GardenNodeInner({ data, selected }: NodeProps<GardenNodeType>) {
  const { node, dimmed, highlighted, focused, read, inPath, growing } = data
  const { zoom } = useViewport()
  const setHoverId = useGraphStore((s) => s.setHover)
  const [hover, setHover] = useState(false)
  const [kbFocus, setKbFocus] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const size = nodeSize(node.degree)
  const color = getNodeColor(node)
  const isGhost = !node.exists
  const showLabel = zoom >= 0.6
  const showDate = zoom >= 1.2

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
    // 节点被过滤/卸载时清理可能残留的邻域高亮
    if (useGraphStore.getState().hoverId === node.id) {
      useGraphStore.getState().setHover(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onEnter = () => {
    timer.current = setTimeout(() => {
      setHover(true)
      setHoverId(node.id) // 通知画布做 BFS 邻域高亮（与摘要卡同步出现）
    }, 90)
  }
  const onLeave = () => {
    if (timer.current) clearTimeout(timer.current)
    setHover(false)
    setHoverId(null)
  }

  const ring =
    selected || focused || highlighted || inPath || kbFocus
      ? `0 0 0 2px var(--accent-color)`
      : undefined

  return (
    <div
      className={`relative flex flex-col items-center${hover ? ' gnode--hover' : ''}`}
      style={{ opacity: dimmed || 1, transition: 'opacity 200ms ease' }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      tabIndex={0}
      role="button"
      aria-label={`${node.title}${node.exists ? '' : '（待写种子）'}`}
      onFocus={(e) => {
        if (e.target === e.currentTarget) setKbFocus(true)
      }}
      onBlur={() => setKbFocus(false)}
      onKeyDown={(e) => {
        // Enter / Space 触发与点击一致的行为：转发到 React Flow 的节点点击处理
        if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) {
          e.preventDefault()
          ;(e.currentTarget.closest('.react-flow__node') as HTMLElement | null)?.click()
        }
      }}
    >
      {/* 两个隐形 Handle 都钉在圆形正中心：连线走圆心到圆心的直线 */}
      <Handle
        type="target"
        position={Position.Top}
        style={{
          left: '50%',
          top: size / 2,
          bottom: 'auto',
          width: 1,
          height: 1,
          transform: 'translate(-50%, -50%)',
          opacity: 0,
          pointerEvents: 'none',
        }}
      />
      <motion.div
        initial={growing ? { scale: 0 } : false}
        animate={highlighted ? { scale: [1, 1.25, 1, 1.25, 1] } : { scale: hover ? 1.12 : 1 }}
        transition={
          highlighted
            ? { duration: 1.2, times: [0, 0.25, 0.5, 0.75, 1] }
            : growing
              ? { type: 'spring', stiffness: 260, damping: 17 }
              : { duration: 0.18, ease: [0.22, 0.8, 0.32, 1] }
        }
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: isGhost
            ? 'transparent'
            : read
              ? 'color-mix(in srgb, ' + color + ' 40%, var(--dot-mix))'
              : 'color-mix(in srgb, ' + color + ' 88%, var(--dot-mix))',
          border: isGhost ? '1.5px dashed #A39A8A' : 'none',
          boxShadow: ring,
          cursor: isGhost ? 'help' : 'pointer',
        }}
      />
      {showLabel && (
        <div
          className="gnode__label absolute top-full mt-1 text-center text-xs font-medium text-ink whitespace-nowrap"
          style={{
            letterSpacing: '0.04em',
            color: isGhost || read ? 'var(--ink-3)' : undefined,
          }}
        >
          {node.title.length > 12 ? `${node.title.slice(0, 12)}…` : node.title}
          {showDate && node.date && (
            <div className="text-[10px] font-mono-jb text-ink-3">{node.date}</div>
          )}
        </div>
      )}
      <AnimatePresence>{hover && <HoverCard node={node} />}</AnimatePresence>
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          left: '50%',
          top: size / 2,
          bottom: 'auto',
          width: 1,
          height: 1,
          transform: 'translate(-50%, -50%)',
          opacity: 0,
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}

const GardenNode = memo(GardenNodeInner)
export default GardenNode
