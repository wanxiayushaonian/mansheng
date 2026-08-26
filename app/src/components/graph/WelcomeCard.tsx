import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CircleHelp } from 'lucide-react'

const KEY = 'garden-welcomed'

/** 首访欢迎卡 + 图例（可通过 ? 按钮再次唤出） */
export default function WelcomeCard() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (localStorage.getItem(KEY)) return
    const t = setTimeout(() => setVisible(true), 1200)
    return () => clearTimeout(t)
  }, [])

  const close = () => {
    localStorage.setItem(KEY, '1')
    setVisible(false)
  }

  return (
    <>
      <button
        className="float-panel absolute left-4 bottom-[132px] w-8 h-8 rounded-full flex items-center justify-center text-ink-3 hover:text-accentc"
        style={{ zIndex: 20 }}
        onClick={() => setVisible(true)}
        aria-label="图例与说明"
        title="图例与说明"
      >
        <CircleHelp size={15} />
      </button>
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20, transition: { duration: 0.2 } }}
            transition={{ duration: 0.35, ease: [0.22, 0.8, 0.32, 1] }}
            className="float-panel absolute left-4 bottom-[176px] w-[300px] p-4"
            style={{ zIndex: 25 }}
          >
            <div className="font-serif-sc text-base font-semibold text-ink">
              欢迎来到蔓生花园 🌱
            </div>
            <p className="mt-2 text-sm leading-relaxed text-ink-2">
              这是一张会生长的知识图谱。每个圆点是一篇笔记，线是它们的连接。
              <b>拖动</b>平移，<b>滚轮</b>缩放，<b>悬停</b>看摘要，<b>点击</b>进入文章，
              <b>双击</b>局部探索。虚线灰点是待写的种子。
            </p>
            <div className="mt-3 flex items-center gap-3 text-xs text-ink-3">
              <span className="flex items-center gap-1">
                <i className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: 'var(--moss)' }} />
                笔记
              </span>
              <span className="flex items-center gap-1">
                <i className="inline-block w-2.5 h-2.5 rounded-full border border-dashed border-ink-3" />
                种子
              </span>
              <span className="flex items-center gap-1">
                <i className="inline-block w-4 h-0 border-t" style={{ borderColor: '#B09B7E' }} />
                链接
              </span>
              <span className="flex items-center gap-1">
                <i className="inline-block w-4 h-0 border-t border-dashed" style={{ borderColor: '#B9AE99' }} />
                共现
              </span>
            </div>
            <button
              onClick={close}
              className="mt-3 w-full rounded-lg border border-accentc px-3 py-1.5 text-sm text-accentc hover:bg-accentc-soft transition-colors"
            >
              开始漫游
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
