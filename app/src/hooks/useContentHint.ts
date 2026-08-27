import { useCallback, useEffect, useState } from 'react'

/** ready 为 false 超过 ms 后才置 true（骨架屏延迟出现，避免闪烁） */
export function useDelayedFlag(ready: boolean, ms = 200) {
  const [show, setShow] = useState(false)
  useEffect(() => {
    if (ready) return
    const t = setTimeout(() => setShow(true), ms)
    return () => clearTimeout(t)
  }, [ready, ms])
  return !ready && show
}

/** 种子提示的显隐状态 */
export function useGhostHint() {
  const [hint, setHint] = useState<string | null>(null)
  const show = useCallback((title: string) => setHint(title), [])
  const hide = useCallback(() => setHint(null), [])
  return { hint, show, hide }
}
