/**
 * /og/:id —— 文章分享卡（1200×630）
 * 不进入站内导航：构建期由 prerender.mjs 用无头 Chrome 截成 og/<id>.png
 * 供各文章页 og:image 使用。人直接访问时卡片显示在纸底左上角。
 */
import { useParams } from 'react-router-dom'
import { C, tagColor, htmlToText } from './chrome'
import { usePost } from '@/hooks/usePost'
import paperTexture from '@/assets/paper-texture.png'

const TYPE_LABEL: Record<string, string> = { post: 'POST', essay: 'ESSAY', note: 'NOTE' }

export default function OgCardPage() {
  const { id = '' } = useParams()
  const { post } = usePost(id)

  if (!post) return null
  return (
    <div
      style={{
        width: 1200,
        height: 630,
        background: C.paper,
        backgroundImage: `url(${paperTexture})`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '64px 72px',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      {/* 顶部：站名 / 元信息 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 14, height: 14, borderRadius: '50%', background: C.moss }} />
          <span
            style={{
              fontFamily: '"Noto Serif SC",serif',
              fontSize: 26,
              fontWeight: 700,
              color: C.ink,
              letterSpacing: '0.06em',
            }}
          >
            蔓生花园
          </span>
        </div>
        <div
          style={{
            fontFamily: '"JetBrains Mono",monospace',
            fontSize: 20,
            letterSpacing: '0.08em',
            color: C.ink2,
          }}
        >
          {(TYPE_LABEL[post.type] ?? 'POST') + (post.date ? ` · ${post.date}` : '')}
        </div>
      </div>

      {/* 中部：标题 + 摘要 */}
      <div>
        <div
          style={{
            fontFamily: '"Noto Serif SC",serif',
            fontSize: 64,
            fontWeight: 700,
            lineHeight: 1.3,
            color: C.ink,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {post.title}
        </div>
        <p
          style={{
            marginTop: 28,
            fontSize: 24,
            lineHeight: 1.7,
            color: C.ink2,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {htmlToText(post.html).replace(/\s+/g, ' ').trim().slice(0, 120)}
        </p>
      </div>

      {/* 底部：标签 */}
      <div style={{ display: 'flex', gap: 16 }}>
        {post.tags.map((t) => (
          <span
            key={t}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 18px',
              borderRadius: 999,
              background: C.paper2,
              border: `1px solid ${C.line}`,
              fontSize: 20,
              color: C.ink2,
            }}
          >
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: tagColor(t) }} />
            {t}
          </span>
        ))}
      </div>
    </div>
  )
}
