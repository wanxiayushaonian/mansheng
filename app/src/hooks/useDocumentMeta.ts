import { useEffect } from 'react'

const SITE_NAME = '蔓生花园'

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

interface DocumentMeta {
  /** 页面标题（不含站名后缀） */
  title?: string
  /** 页面描述（同时写入 description 与 og:description） */
  description?: string
  /** og:image 路径（BASE_URL 下的相对路径，如 og/<id>.png）；缺省用全站封面 */
  image?: string
}

/** 每路由设置 document.title / description / og 标签 */
export function useDocumentMeta({ title, description, image }: DocumentMeta) {
  useEffect(() => {
    const fullTitle = title ? `${title} · ${SITE_NAME}` : `${SITE_NAME} · 图节点博客`
    document.title = fullTitle
    upsertMeta('property', 'og:title', fullTitle)
    upsertMeta('property', 'og:image', `${import.meta.env.BASE_URL}${image ?? 'og-cover.png'}`)
    if (description) {
      upsertMeta('name', 'description', description)
      upsertMeta('property', 'og:description', description)
    }
  }, [title, description, image])
}
