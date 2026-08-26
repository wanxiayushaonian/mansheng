import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGraphStore } from '@/store'

/** 点击 ghost 节点时弹出的 🌱 toast，3s 自动消失 */
export default function GhostHint() {
  const toast = useGraphStore((s) => s.ghostToast)
  const setGhostToast = useGraphStore((s) => s.setGhostToast)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setGhostToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast, setGhostToast])

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.18, ease: [0.22, 0.8, 0.32, 1] }}
          className="float-panel fixed left-1/2 bottom-24 -translate-x-1/2 px-4 py-2.5 text-sm text-ink-2 max-w-[90vw]"
          style={{ zIndex: 40 }}
          onClick={() => setGhostToast(null)}
        >
          🌱 『{toast.title}』还是一粒种子 —— 此节点待写。
        </motion.div>
      )}
    </AnimatePresence>
  )
}
