import { motion } from 'framer-motion'
import { C } from '@/lib/ui'

/** 居中菱形分隔线（入场横向展开） */
export function DiamondDivider({ className = '' }: { className?: string }) {
  return (
    <motion.div
      className={`relative flex items-center justify-center ${className}`}
      initial={{ scaleX: 0 }}
      animate={{ scaleX: 1 }}
      transition={{ duration: 0.5, delay: 0.45, ease: [0.22, 0.8, 0.32, 1] }}
      style={{ transformOrigin: 'center' }}
    >
      <div className="h-px w-full" style={{ background: C.line }} />
      <div
        className="absolute h-1.5 w-1.5 rotate-45"
        style={{ background: C.ochre }}
      />
    </motion.div>
  )
}
