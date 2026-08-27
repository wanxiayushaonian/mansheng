import { Link } from 'react-router-dom'
import { C } from '@/lib/ui'

/** 内容页的标签胶囊（图谱过滤面板用的是另一个同名组件） */
export function TagPill({
  name,
  color,
  active,
  fontSize,
  onClick,
}: {
  name: string
  color: string
  active?: boolean
  fontSize?: string
  onClick?: () => void
}) {
  const inner = (
    <>
      <span
        className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ background: color }}
      />
      <span>{name}</span>
    </>
  )
  const style: React.CSSProperties = {
    fontSize: fontSize ?? '0.75rem',
    letterSpacing: '0.04em',
    fontWeight: 500,
    background: active ? C.accentSoft : C.paper2,
    border: active ? `1px solid ${C.accent}` : `1px solid transparent`,
    color: active ? C.ink : C.ink2,
  }
  const cls =
    'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 transition-colors duration-150 hover:bg-accentc-soft'
  if (onClick) {
    return (
      <button type="button" className={cls} style={style} onClick={onClick}>
        {inner}
      </button>
    )
  }
  return (
    <Link to={`/tag/${encodeURIComponent(name)}`} className={cls} style={style}>
      {inner}
    </Link>
  )
}
