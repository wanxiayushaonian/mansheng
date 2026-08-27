import { C } from '@/lib/ui'

/** 文章加载骨架屏（延迟 200ms 出现，避免闪烁） */
export function PostSkeleton() {
  const bar = {
    background: C.paper2,
    borderRadius: 6,
    animation: 'pg-pulse 1.2s ease-in-out infinite',
  } as React.CSSProperties
  return (
    <div className="mx-auto w-full max-w-[42rem] px-6 pt-10">
      <style>{`@keyframes pg-pulse{0%,100%{opacity:1}50%{opacity:.45}}`}</style>
      <div style={{ ...bar, width: '42%', height: 28, marginBottom: 20 }} />
      <div style={{ ...bar, width: '30%', height: 12, marginBottom: 48 }} />
      {[92, 100, 96, 60].map((w, i) => (
        <div key={i} style={{ ...bar, width: `${w}%`, height: 14, marginBottom: 16 }} />
      ))}
      <div style={{ height: 32 }} />
      {[100, 88, 95].map((w, i) => (
        <div key={`b${i}`} style={{ ...bar, width: `${w}%`, height: 14, marginBottom: 16 }} />
      ))}
    </div>
  )
}
