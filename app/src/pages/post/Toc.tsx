import { useEffect, useState } from 'react'
import { C } from '@/lib/ui'
import type { Post } from '@/lib/content'

export function Toc({ toc }: { toc: NonNullable<Post['toc']> }) {
  const [active, setActive] = useState(toc[0]?.id ?? '')

  useEffect(() => {
    const onScroll = () => {
      let cur = ''
      for (const h of toc) {
        const el = document.getElementById(h.id)
        if (el && el.getBoundingClientRect().top < 140) cur = h.id
      }
      setActive(cur || toc[0]?.id || '')
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [toc])

  return (
    <section aria-label="目录">
      <div className="mb-2 uppercase" style={{ fontSize: '0.75rem', letterSpacing: '0.08em', color: C.ink3 }}>
        目录
      </div>
      <ul className="space-y-0.5" style={{ borderLeft: `1px solid ${C.line}` }}>
        {toc.map((h) => (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              onClick={(e) => {
                e.preventDefault()
                document.getElementById(h.id)?.scrollIntoView({ behavior: 'smooth' })
              }}
              className="block truncate py-1 transition-colors hover:text-[#A45A3C]"
              style={{
                paddingLeft: h.level === 2 ? 12 : 26,
                fontSize: h.level === 2 ? '0.82rem' : '0.78rem',
                color: active === h.id ? C.accent : C.ink2,
                fontWeight: active === h.id ? 600 : 400,
                boxShadow: `inset 2px 0 0 ${active === h.id ? C.accent : 'transparent'}`,
              }}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
