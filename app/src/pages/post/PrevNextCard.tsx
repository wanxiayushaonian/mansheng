import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { C } from '@/lib/ui'
import { tagColor } from '@/lib/colors'
import { TagPill } from '@/components/TagPill'

export function PrevNextCard({
  dir, id, title, date, tag,
}: {
  dir: 'prev' | 'next'
  id: string
  title: string
  date: string
  tag?: string

}) {
  return (
    <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.18 }} className={dir === 'next' ? 'sm:text-right' : ''}>
      <Link
        to={`/p/${encodeURIComponent(id)}`}
        className="block rounded-[10px] p-4 transition-shadow"
        style={{ background: C.paper2, border: `1px solid ${C.line}` }}
      >
        <div className="mb-1 flex items-center gap-1 text-xs" style={{ color: C.ink2, justifyContent: dir === 'next' ? 'flex-end' : 'flex-start' }}>
          {dir === 'prev' ? <><ArrowLeft size={12} /> 上一篇</> : <>下一篇 <ArrowRight size={12} /></>}
        </div>
        <div className="font-semibold" style={{ fontFamily: '"Noto Serif SC",serif', color: C.ink }}>
          {title}
        </div>
        <div className="mt-2 flex items-center gap-2 text-xs" style={{ color: C.ink2, justifyContent: dir === 'next' ? 'flex-end' : 'flex-start' }}>
          <span>{date}</span>
          {tag && <TagPill name={tag} color={tagColor(tag)} />}
        </div>
      </Link>
    </motion.div>
  )
}

