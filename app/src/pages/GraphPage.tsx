/**
 * /graph（及 /）—— 图谱页壳：加载 / 错误态 + 画布挂载。
 * 画布与悬浮层分别在 ./GraphCanvas / ./GraphOverlays。
 */
import { motion } from 'framer-motion'
import { ReactFlowProvider } from '@xyflow/react'
import { useGraph } from '@/hooks/useGraph'
import { useGraphStore } from '@/store'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { GraphCanvas } from './graph/GraphCanvas'

export default function GraphPage() {
  const { graph, loading, error } = useGraph()
  const reload = useGraphStore((s) => s.reload)

  useDocumentMeta({
    description: '一座数字花园：文章是节点，链接是边。在图上漫游，在文里阅读。',
  })

  if (loading || (!graph && !error)) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-4">
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="w-3 h-3 rounded-full"
              style={{ background: 'var(--moss)' }}
              animate={{ scale: [1, 1.4, 1] }}
              transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
        <p className="text-sm text-ink-2">正在展开花园…</p>
      </div>
    )
  }

  if (error || !graph) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <div className="float-panel p-8 text-center">
          <p className="font-serif-sc text-lg text-ink">图数据加载失败</p>
          <p className="mt-1 text-sm text-ink-2">{error}</p>
          <button
            className="mt-4 rounded-lg border border-accentc px-4 py-1.5 text-sm text-accentc hover:bg-accentc-soft"
            onClick={() => reload()}
          >
            重试
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0" style={{ height: '100dvh' }}>
      <ReactFlowProvider>
        <GraphCanvas graph={graph} />
      </ReactFlowProvider>
    </div>
  )
}
