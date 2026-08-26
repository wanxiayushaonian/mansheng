import { useEffect, useState } from 'react'
import type { PostData } from '@/types/graph'

const cache = new Map<string, PostData>()

/** 按需 fetch posts/<id>.json（id 含中文需编码） */
export function usePost(id: string | undefined) {
  const [post, setPost] = useState<PostData | null>(id ? (cache.get(id) ?? null) : null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    const hit = cache.get(id)
    if (hit) {
      queueMicrotask(() => setPost(hit))
      return
    }
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 进入加载态是合法的外部同步
    setLoading(true)
    setError(null)
    fetch(`${import.meta.env.BASE_URL}data/posts/${encodeURIComponent(id)}.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<PostData>
      })
      .then((data) => {
        if (cancelled) return
        cache.set(id, data)
        setPost(data)
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
  }, [id])

  return { post, loading, error }
}
