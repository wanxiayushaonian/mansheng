import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { LocalMode, PathMode } from '@/store'
import type { GraphNodeData } from '@/types/graph'

export interface PathResultInfo {
  ids: Set<string>
  edges: Set<string>
  found: boolean
}

interface GraphOverlaysProps {
  byId: Map<string, GraphNodeData>
  focusId: string | null
  setFocus: (id: string | null) => void
  pathMode: PathMode | null
  pathResult: PathResultInfo | null
  setPathMode: (p: PathMode | null) => void
  localMode: LocalMode | null
  localRoot: GraphNodeData | null
  setLocalMode: (m: LocalMode | null) => void
  sheetNode: GraphNodeData | null
  setSheetNode: (n: GraphNodeData | null) => void
}

/** 画布悬浮层：聚焦退出胶囊 / 寻路面包屑 / 局部探索面包屑 / 移动端 sheet */
export function GraphOverlays({
  byId, focusId, setFocus, pathMode, pathResult, setPathMode,
  localMode, localRoot, setLocalMode, sheetNode, setSheetNode,
}: GraphOverlaysProps) {
  const navigate = useNavigate()
  return (
    <>
      {/* 聚焦退出胶囊 */}
      <AnimatePresence>
        {focusId && (
          <motion.button
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="float-panel absolute right-4 top-4 flex items-center gap-1.5 px-3 py-1.5 text-xs text-ink-2 hover:text-accentc"
            style={{ zIndex: 20 }}
            onClick={() => setFocus(null)}
          >
            聚焦：{byId.get(focusId)?.title ?? focusId} <X size={12} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* 寻路模式面包屑 */}
      <AnimatePresence>
        {pathMode && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="float-panel absolute left-1/2 top-[76px] -translate-x-1/2 flex items-center gap-2 px-4 py-2 text-xs text-ink-2"
            style={{ zIndex: 20 }}
          >
            {!pathMode.from ? (
              <span>寻路：请点选起点节点</span>
            ) : !pathMode.to ? (
              <span>
                寻路：起点 <b className="text-ink">{byId.get(pathMode.from)?.title ?? pathMode.from}</b>
                {' · '}请点选终点
              </span>
            ) : pathResult?.found ? (
              <span>
                路径：<b className="text-ink">{byId.get(pathMode.from)?.title}</b> ⇄{' '}
                <b className="text-ink">{byId.get(pathMode.to)?.title}</b> · {pathResult.ids.size - 1} 跳
              </span>
            ) : (
              <span>
                『{byId.get(pathMode.from)?.title}』与『{byId.get(pathMode.to)?.title}』不连通
              </span>
            )}
            <button
              className="rounded-full border border-line px-2 py-0.5 hover:bg-paper-3"
              onClick={() => setPathMode(null)}
            >
              退出
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 局部探索面包屑 */}
      <AnimatePresence>
        {localMode && localRoot && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="float-panel absolute left-1/2 top-[76px] -translate-x-1/2 flex items-center gap-2 px-4 py-2 text-xs text-ink-2"
            style={{ zIndex: 20 }}
          >
            <span>
              局部探索 · 起点：<b className="text-ink">{localRoot.title}</b> · 深度 {localMode.depth}
            </span>
            <button
              className="rounded-full border border-line px-2 py-0.5 text-accentc hover:bg-accentc-soft"
              onClick={() => setLocalMode({ ...localMode, depth: localMode.depth + 1 })}
            >
              + 展开一层
            </button>
            <button
              className="rounded-full border border-line px-2 py-0.5 hover:bg-paper-3"
              onClick={() => setLocalMode(null)}
            >
              退出
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 移动端底部 sheet */}
      <AnimatePresence>
        {sheetNode && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.25, ease: [0.22, 0.8, 0.32, 1] }}
            className="float-panel fixed inset-x-3 bottom-3 p-4 md:hidden"
            style={{ zIndex: 30, borderRadius: 14 }}
          >
            <div className="font-serif-sc text-lg font-semibold text-ink">{sheetNode.title}</div>
            <div className="mt-1 text-xs font-mono-jb text-ink-2">
              {sheetNode.type.toUpperCase()} · {sheetNode.date ?? ''}
            </div>
            <p className="mt-2 text-sm text-ink-2 clamp-3">{sheetNode.summary}</p>
            <div className="mt-3 flex gap-2">
              <button
                className="flex-1 rounded-lg bg-accentc px-3 py-2 text-sm text-white"
                onClick={() => navigate(`/p/${encodeURIComponent(sheetNode.id)}`)}
              >
                阅读全文 →
              </button>
              <button
                className="rounded-lg border border-line px-3 py-2 text-sm text-ink-2"
                onClick={() => setSheetNode(null)}
              >
                关闭
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
