import { motion } from 'framer-motion'
import { C } from '@/lib/ui'

export interface MiniMapNode {
  id: string
  x: number
  y: number
  color: string
  ghost?: boolean
  isSelf?: boolean
  r?: number
}

/** 静态 SVG 点线预览（标签页星座图 / 文章页邻域小图共用） */
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
