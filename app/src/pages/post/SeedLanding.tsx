import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Sprout } from 'lucide-react'
import { C } from '@/lib/ui'

const EASE: [number, number, number, number] = [0.22, 0.8, 0.32, 1]

export function SeedLanding({
  id, referrers,
}: {
  id: string
  referrers: { id: string; title: string; date: string }[]
}) {
  return (
    <div className="mx-auto max-w-[42rem] px-6 py-24">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: EASE }}
        className="rounded-[10px] p-10 text-center"
        style={{ background: C.paper2, border: `1px dashed ${C.lineStrong}` }}
      >
        <div className="mb-4 flex justify-center" style={{ color: C.moss }}>
          <Sprout size={32} />
        </div>
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: '"Noto Serif SC",serif', color: C.ink }}
        >
          「{id}」还是一粒种子
        </h1>
        <p className="mt-3 text-sm leading-relaxed" style={{ color: C.ink2 }}>
          它已被 [[wikilink]] 提及，但尚未写成。种子被允许存在 —— 也许某天就发芽了。
        </p>

        {referrers.length > 0 && (
          <div className="mt-8 text-left">
            <div className="mb-2 text-xs uppercase" style={{ letterSpacing: '0.08em', color: C.ink2 }}>
              提及它的文章
            </div>
            <ul className="space-y-1">
              {referrers.map((r) => (
                <li key={r.id}>
                  <Link
                    to={`/p/${encodeURIComponent(r.id)}`}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:text-[#A45A3C]"
                    style={{ color: C.ink }}
                  >
                    <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: C.accent }} />
                    {r.title}
                    <span className="ml-auto text-xs" style={{ color: C.ink2 }}>{r.date}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <Link
          to={`/graph#focus=${encodeURIComponent(id)}`}
          className="mt-8 inline-flex items-center gap-1.5 rounded-[10px] px-6 py-3 text-sm font-semibold"
          style={{ background: C.accent, color: C.paper }}
        >
          在图中看看它的位置 →
        </Link>
      </motion.div>
    </div>
  )
}
