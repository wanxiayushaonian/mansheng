import { useEffect } from 'react'
import { useGraphStore } from '@/store'
import { buildTagColors } from '@/lib/colors'
import type { GraphData } from '@/types/graph'

/** 首屏加载 graph.json 入 zustand 缓存（所有页面共享）；reloadNonce 变化时重新拉取 */
export function useGraph() {
  const { graph, loading, error, reloadNonce, setGraph, setLoading, setError } = useGraphStore()

  useEffect(() => {
    if (graph || loading) return
    let cancelled = false
    setLoading(true)
    fetch(`${import.meta.env.BASE_URL}data/graph.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<GraphData>
      })
      .then((data) => {
        if (cancelled) return
        buildTagColors(data.tags ?? [])
        setGraph(data)
        setLoading(false)
      })
      .catch((e: Error) => {
        if (cancelled) return
        setError(e.message)
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadNonce])

  return { graph, loading, error }
}
