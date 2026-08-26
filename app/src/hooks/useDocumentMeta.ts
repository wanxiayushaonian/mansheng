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
}

/** 每路由设置 document.title / description / og 标签 */
export function useDocumentMeta({ title, description }: DocumentMeta) {
  useEffect(() => {
    const fullTitle = title ? `${title} · ${SITE_NAME}` : `${SITE_NAME} · 图节点博客`
    document.title = fullTitle
    upsertMeta('property', 'og:title', fullTitle)
    // og:image 是静态 meta 无法被子路径构建改写，运行时补齐
    upsertMeta('property', 'og:image', `${import.meta.env.BASE_URL}og-cover.png`)
    if (description) {
      upsertMeta('name', 'description', description)
      upsertMeta('property', 'og:description', description)
    }
  }, [title, description])
}
