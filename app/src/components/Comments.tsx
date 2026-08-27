/**
 * giscus 评论区（GitHub Discussions 驱动）。
 * 构建期注入以下环境变量才会挂载，缺省时本组件不渲染任何内容：
 *   VITE_GISCUS_REPO        如 wanxiayushaonian/mansheng
 *   VITE_GISCUS_REPO_ID     giscus.app 生成的 repoId
 *   VITE_GISCUS_CATEGORY    默认 Announcements
 *   VITE_GISCUS_CATEGORY_ID giscus.app 生成的 categoryId
 */
import { useEffect, useRef } from 'react'
import { C } from '../pages/chrome'

export default function Comments({ title }: { title: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const env = import.meta.env
    const repo = env.VITE_GISCUS_REPO as string | undefined
    const repoId = env.VITE_GISCUS_REPO_ID as string | undefined
    const category = (env.VITE_GISCUS_CATEGORY as string | undefined) ?? 'Announcements'
    const categoryId = env.VITE_GISCUS_CATEGORY_ID as string | undefined
    if (!ref.current || !repo || !repoId || !categoryId) return

    const script = document.createElement('script')
    script.src = 'https://giscus.app/client.js'
    script.async = true
    script.crossOrigin = 'anonymous'
    const attrs: Record<string, string> = {
      'data-repo': repo,
      'data-repo-id': repoId,
      'data-category': category,
      'data-category-id': categoryId,
      'data-mapping': 'pathname',
      'data-strict': '0',
      'data-reactions-enabled': '1',
      'data-emit-metadata': '0',
      'data-input-position': 'top',
      'data-theme': document.documentElement.dataset.theme === 'dark' ? 'dark_dimmed' : 'light',
      'data-lang': 'zh-CN',
    }
    for (const [k, v] of Object.entries(attrs)) script.setAttribute(k, v)
    ref.current.appendChild(script)
    return () => {
      ref.current?.replaceChildren()
    }
  }, [title])

  return (
    <section className="mt-16 border-t pt-10" style={{ borderColor: C.line }}>
      <h2 className="mb-6 text-[1.125rem] font-semibold" style={{ color: C.ink }}>
        讨论
      </h2>
      <div ref={ref} className="min-h-20" />
    </section>
  )
}
