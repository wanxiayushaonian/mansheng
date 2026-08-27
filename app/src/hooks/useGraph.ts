import { useEffect } from 'react'
import { useGraphStore } from '@/store'
import { buildTagColors } from '@/lib/colors'
import { fetchGraph } from '@/lib/content'
import type { GraphData } from '@/types/graph'

/** 首屏加载 graph.json 入 zustand 缓存（所有页面共享）；reloadNonce 变化时重新拉取。
 *  取数经 lib/content 的单一缓存入口，与内容页共享同一份 Promise。 */
export function useGraph() {
  const { graph, loading, error, reloadNonce, setGraph, setLoading, setError } = useGraphStore()

  useEffect(() => {
    if (graph || loading) return
    let cancelled = false
    setLoading(true)
    fetchGraph()
      .then((data: GraphData) => {
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
