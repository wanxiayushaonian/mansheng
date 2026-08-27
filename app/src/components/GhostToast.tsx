import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Sprout } from 'lucide-react'
import { C } from '@/lib/ui'

/** 种子节点提示 toast（3s 自动消失，由父级 AnimatePresence 控制入场/退场） */
export function GhostToast({ title, onDone }: { title: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000)
    return () => clearTimeout(t)
  }, [onDone])
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.18 }}
      className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2"
      style={{
        background: C.paper2,
        border: `1px solid ${C.line}`,
        borderRadius: 10,
        boxShadow: '0 1px 2px rgba(46,42,36,0.05), 0 6px 20px rgba(46,42,36,0.07)',
      }}
    >
      <div className="flex items-center gap-2 px-4 py-2.5 text-sm" style={{ color: C.ink }}>
        <Sprout size={15} style={{ color: C.moss }} />
        <span>
          『{title}』还是一粒种子 —— 此节点待写。
        </span>
      </div>
    </motion.div>
  )
}
