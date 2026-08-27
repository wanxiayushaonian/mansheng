/**
 * /about —— 「蔓生花园」说明书页
 * 什么是数字花园 / 图例卡 / 写作→构建→漫游流程卡 / 进入图谱 CTA。
 */
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Move, ZoomIn, MousePointer, MousePointerClick, Sprout, PenLine, Cog, Compass } from 'lucide-react'
import { DiamondDivider } from '@/components/DiamondDivider'
import { PageChrome } from '@/components/PageChrome'
import { useLenis } from '@/hooks/useLenis'
import { fetchGraph } from '@/lib/content'
import type { GraphData } from '@/lib/content'
import { C } from '@/lib/ui'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'

const EASE: [number, number, number, number] = [0.22, 0.8, 0.32, 1]

/** 挂载时上浮入场（不依赖 IntersectionObserver，内容默认可达） */
const rise = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
} as const

export default function AboutPage() {
  useLenis()
  const navigate = useNavigate()
  const [graph, setGraph] = useState<GraphData | null>(null)

  useDocumentMeta({
    title: '关于这座花园',
    description: '「蔓生花园」是一座数字花园：笔记以双向链接彼此连接，长成一张可以漫游的图。',
  })

  useEffect(() => {
    let alive = true
    fetchGraph().then((g) => alive && setGraph(g)).catch(() => {})
    return () => { alive = false }
  }, [])

  const stats = useMemo(() => {
    if (!graph) return null
    return {
      posts: graph.nodes.filter((n) => n.exists).length,
      seeds: graph.nodes.filter((n) => !n.exists).length,
      links: graph.edges.length,
    }
  }, [graph])

  // 「随便读一篇」：点击时从连接最多的前 5 篇里随机挑（渲染保持纯函数）
  const hotEntries = useMemo(() => {
    if (!graph) return []
    return [...graph.nodes.filter((n) => n.exists)].sort((a, b) => b.degree - a.degree).slice(0, 5)
  }, [graph])

  return (
    <PageChrome>
      <div className="mx-auto max-w-[42rem] px-6 pb-28 pt-16">
        {/* 页头 */}
        <motion.h1
          className="text-center text-[1.875rem] md:text-[2.5rem]"
          style={{
            fontFamily: '"Noto Serif SC","Source Serif 4",Georgia,serif',
            fontWeight: 700, lineHeight: 1.25, letterSpacing: '0.01em', color: C.ink,
          }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: EASE }}
        >
          关于这座花园
        </motion.h1>
        <DiamondDivider className="mx-auto mt-8 max-w-[16rem]" />

        {/* 引言 */}
        <motion.p
          {...rise}
          transition={{ duration: 0.35, ease: EASE }}
          className="mt-12"
          style={{
            fontFamily: '"Noto Serif SC",serif', fontSize: '1rem', lineHeight: 1.85, color: C.ink,
          }}
        >
          「蔓生花园」是一座数字花园（digital garden）：这里的笔记不按时间倒序堆放，而是以
          <code
            className="mx-1 rounded px-1.5 py-0.5 text-[0.85em]"
            style={{ fontFamily: '"JetBrains Mono",monospace', background: C.paper2 }}
          >
            [[双向链接]]
          </code>
          彼此连接，长成一张可以漫游的图。有些笔记已经成熟，有些还是虚线画出的种子 —— 它们都被允许存在。
        </motion.p>
        {stats && (
          <motion.p {...rise} transition={{ duration: 0.3 }} className="mt-4 text-sm" style={{ color: C.ink3 }}>
            目前 {stats.posts} 篇笔记 · {stats.links} 条连接 · {stats.seeds} 枚待写种子
          </motion.p>
        )}

        {/* 图例区 */}
        <SectionTitle>如何阅读这张图</SectionTitle>
        <div className="space-y-3">
          <LegendCard delay={0} demo={<DotsRow />} text="圆点即笔记，颜色来自它的主标签或类型（post 苔绿 / essay 陶土 / note 赭黄）" />
          <LegendCard delay={1} demo={<SizeRow />} text="圆点越大，与它相连的笔记越多" />
          <LegendCard delay={2} demo={<GhostRow />} text="虚线灰圈是『种子节点』：已被提及、尚未写成。点击它会告诉你它还在等待" />
          <LegendCard delay={3} demo={<EdgeRow />} text="实线是文内 [[链接]]，细虚线是同标签的弱关联" />
          <LegendCard delay={4} demo={<OpsRow />} text="拖动平移 · 滚轮缩放 · 悬停看摘要 · 点击进入文章 · 双击局部探索" />
        </div>

        {/* 生长流程 */}
        <SectionTitle>它是如何生长的</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-3 sm:gap-0">
          <FlowCard
            index={0}
            color={C.moss}
            icon={<PenLine size={18} />}
            title="写作"
            text="Markdown + Obsidian 风格 [[wikilink]]，在本地随手写"
          />
          <FlowArrow index={0} />
          <FlowCard
            index={1}
            color={C.ochre}
            icon={<Cog size={18} />}
            title="构建"
            text="脚本解析链接，d3-force 预计算坐标，生成 graph.json"
          />
          <FlowArrow index={1} />
          <FlowCard
            index={2}
            color={C.clay}
            icon={<Compass size={18} />}
            title="漫游"
            text="前端渲染成图，图先于内容生长，读者在图上散步"
          />
        </div>

        {/* CTA */}
        <motion.div
          {...rise}
          transition={{ duration: 0.3 }}
          className="mt-20 text-center"
        >
          <motion.button
            type="button"
            onClick={() => navigate('/graph')}
            whileHover={{ scale: 1.04 }}
            transition={{ duration: 0.18 }}
            className="rounded-[10px] px-9 py-3.5 text-[1.125rem] font-semibold"
            style={{
              background: C.accent, color: C.paper,
              boxShadow: '0 1px 2px rgba(46,42,36,0.05), 0 6px 20px rgba(46,42,36,0.12)',
            }}
          >
            进入图谱 →
          </motion.button>
          {hotEntries.length > 0 && (
            <div className="mt-5">
              <button
                type="button"
                className="text-sm"
                style={{ color: C.accent }}
                onClick={() => {
                  const pick = hotEntries[Math.floor(Math.random() * hotEntries.length)]
                  if (pick) navigate(`/p/${encodeURIComponent(pick.id)}`)
                }}
              >
                或随便读一篇 →
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </PageChrome>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <motion.h2
      {...rise}
      transition={{ duration: 0.35 }}
      className="mb-6 mt-20 flex items-center gap-3 text-[1.5rem] font-bold"
      style={{ fontFamily: '"Noto Serif SC",serif', color: C.ink }}
    >
      <span style={{ color: C.ochre }}>❖</span>
      {children}
    </motion.h2>
  )
}

function LegendCard({ demo, text, delay }: { demo: React.ReactNode; text: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.32, delay: delay * 0.08, ease: EASE }}
      className="flex items-center gap-5 rounded-[10px] px-5 py-4"
      style={{ background: C.paper2, border: `1px solid ${C.line}` }}
    >
      <div className="flex w-24 shrink-0 items-center justify-center">{demo}</div>
      <p className="text-sm leading-relaxed" style={{ color: C.ink2 }}>{text}</p>
    </motion.div>
  )
}

/* ---- 图例示意（带微动画） ---- */

function DotsRow() {
  return (
    <div className="flex items-center gap-2.5">
      {[C.moss, C.clay, C.ochre].map((c, i) => (
        <motion.span
          key={c}
          className="inline-block h-3 w-3 rounded-full"
          style={{ background: c }}
          animate={{ scale: [1, 1.12, 1] }}
          transition={{ duration: 3, repeat: Infinity, delay: i * 0.6 }}
        />
      ))}
    </div>
  )
}

function SizeRow() {
  return (
    <div className="flex items-end gap-2">
      {[6, 9, 13].map((s) => (
        <span key={s} className="inline-block rounded-full" style={{ width: s, height: s, background: C.moss }} />
      ))}
    </div>
  )
}

function GhostRow() {
  return (
    <span className="inline-flex items-center gap-1 text-xs" style={{ color: C.ink3 }}>
      <motion.span
        className="inline-block h-3.5 w-3.5 rounded-full border-[1.5px] border-dashed"
        style={{ borderColor: C.ink3 }}
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 3, repeat: Infinity }}
      />
      <Sprout size={12} />
    </span>
  )
}

function EdgeRow() {
  return (
    <svg width="72" height="18" viewBox="0 0 72 18" aria-hidden>
      <line x1="2" y1="6" x2="34" y2="6" stroke="#B09B7E" strokeWidth="1.5" opacity="0.8" />
      <motion.line
        x1="38" y1="12" x2="70" y2="12"
        stroke="#B9AE99" strokeWidth="1" strokeDasharray="2 5"
        animate={{ strokeDashoffset: [0, -14] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
      />
    </svg>
  )
}

function OpsRow() {
  return (
    <div className="flex items-center gap-2" style={{ color: C.ink2 }}>
      <Move size={14} />
      <ZoomIn size={14} />
      <MousePointer size={14} />
      <MousePointerClick size={14} />
    </div>
  )
}

/* ---- 流程卡 ---- */

function FlowCard({
  index, color, icon, title, text,
}: {
  index: number
  color: string
  icon: React.ReactNode
  title: string
  text: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, delay: index * 0.12, ease: EASE }}
      className="relative overflow-hidden rounded-[10px] p-5"
      style={{ background: C.paper2, border: `1px solid ${C.line}` }}
    >
      <span className="absolute left-0 top-0 h-0.5 w-full" style={{ background: color }} />
      <div className="flex items-center gap-2" style={{ color }}>
        {icon}
        <span className="font-semibold" style={{ color: C.ink }}>{title}</span>
      </div>
      <p className="mt-2 text-sm leading-relaxed" style={{ color: C.ink2 }}>{text}</p>
    </motion.div>
  )
}

function FlowArrow({ index }: { index: number }) {
  return (
    <div className="flex items-center justify-center py-2 sm:px-1 sm:py-0" aria-hidden>
      <svg width="28" height="28" viewBox="0 0 28 28" className="rotate-90 sm:rotate-0">
        <motion.line
          x1="4" y1="14" x2="20" y2="14"
          stroke={C.lineStrong} strokeWidth="1.5" strokeDasharray="16"
          initial={{ strokeDashoffset: 16 }}
          animate={{ strokeDashoffset: 0 }}
          transition={{ duration: 0.4, delay: 0.6 + index * 0.12 }}
        />
        <path d="M18 9 L24 14 L18 19" fill="none" stroke={C.lineStrong} strokeWidth="1.5" />
      </svg>
    </div>
  )
}
