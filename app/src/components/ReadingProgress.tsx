import { useEffect, useRef } from 'react'
import { C } from '@/lib/ui'

/** 顶部阅读进度条（随滚动填充） */
export function ReadingProgress() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const onScroll = () => {
      const el = ref.current
      if (!el) return
      const h = document.documentElement
      const max = h.scrollHeight - h.clientHeight
      const p = max > 0 ? h.scrollTop / max : 0
      el.style.transform = `scaleX(${p})`
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return (
    <div
      ref={ref}
      className="fixed left-0 top-0 z-[60] h-0.5 w-full"
      style={{ background: C.accent, transformOrigin: 'left', transform: 'scaleX(0)' }}
    />
  )
}
