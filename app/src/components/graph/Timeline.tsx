import { useEffect, useMemo, useRef } from 'react'
import { Pause, Play } from 'lucide-react'
import { useGraphStore } from '@/store'

/** 底部时间轴滑块：按 date 过滤 + 播放"花园生长" */
export default function Timeline() {
  const graph = useGraphStore((s) => s.graph)
  const timelineDate = useGraphStore((s) => s.timelineDate)
  const playing = useGraphStore((s) => s.timelinePlaying)
  const setTimelineDate = useGraphStore((s) => s.setTimelineDate)
  const setTimelinePlaying = useGraphStore((s) => s.setTimelinePlaying)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  // 按月刻度
  const months = useMemo(() => {
    if (!graph) return [] as string[]
    const set = new Set<string>()
    for (const n of graph.nodes) if (n.date) set.add(n.date.slice(0, 7))
    return [...set].sort()
  }, [graph])

  const idx = useMemo(() => {
    if (!timelineDate || months.length === 0) return months.length - 1
    const m = timelineDate.slice(0, 7)
    let i = months.findIndex((x) => x >= m)
    if (i === -1) i = months.length - 1
    return i
  }, [timelineDate, months])

  useEffect(() => {
    if (!playing || months.length === 0) return
    timer.current = setInterval(() => {
      const cur = useGraphStore.getState().timelineDate
      const m = cur ? cur.slice(0, 7) : months[0]
      const i = months.findIndex((x) => x > m)
      if (i === -1 || i >= months.length) {
        setTimelinePlaying(false)
        setTimelineDate(null) // 播完回到全部
        return
      }
      setTimelineDate(`${months[i]}-28`)
    }, 400)
    return () => {
      if (timer.current) clearInterval(timer.current)
    }
  }, [playing, months, setTimelineDate, setTimelinePlaying])

  if (!graph || months.length === 0) return null

  const startPlay = () => {
    setTimelineDate(`${months[0]}-01`)
    setTimelinePlaying(true)
  }

  return (
    <div
      className="float-panel absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-3 px-5 py-3"
      style={{ width: 'min(520px, calc(100vw - 24px))', zIndex: 20 }}
    >
      <button
        className="text-accentc hover:text-ink transition-colors shrink-0"
        onClick={() => (playing ? setTimelinePlaying(false) : startPlay())}
        aria-label={playing ? '暂停' : '播放花园生长'}
      >
        {playing ? <Pause size={15} /> : <Play size={15} />}
      </button>
      <span className="text-xs text-ink-2 font-mono-jb shrink-0">{months[0]}</span>
      <input
        type="range"
        min={0}
        max={months.length - 1}
        value={idx}
        onChange={(e) => {
          const i = Number(e.target.value)
          setTimelinePlaying(false)
          setTimelineDate(i >= months.length - 1 ? null : `${months[i]}-28`)
        }}
        className="garden-range flex-1"
        aria-label="时间轴"
      />
      <span className="text-xs text-ink-2 font-mono-jb shrink-0">
        {timelineDate ? timelineDate.slice(0, 7) : '今天'}
      </span>
    </div>
  )
}
