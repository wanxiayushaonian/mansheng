import { cn } from '@/lib/utils'
import { getTagColor } from '@/lib/colors'

interface TagChipProps {
  name: string
  selected?: boolean
  onClick?: () => void
  /** 过滤面板中显示 × 移除 */
  removable?: boolean
  onRemove?: () => void
  size?: 'sm' | 'md'
  className?: string
}

/** 标签胶囊：左侧 6px 映射色圆点，选中态 accent-soft 底 + accent 描边 */
export default function TagChip({
  name,
  selected,
  onClick,
  removable,
  onRemove,
  size = 'sm',
  className,
}: TagChipProps) {
  const color = getTagColor(name)
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border transition-colors duration-150',
        size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        selected
          ? 'border-accentc text-ink'
          : 'border-line text-ink-2 hover:border-line-strong',
        className,
      )}
      style={{
        background: selected ? 'var(--accent-soft)' : 'var(--paper-2)',
        letterSpacing: '0.04em',
      }}
    >
      <span
        className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
        style={{ background: color }}
        aria-hidden
      />
      {name}
      {removable && (
        <span
          role="button"
          aria-label={`移除标签 ${name}`}
          className="ml-0.5 text-ink-3 hover:text-accentc"
          onClick={(e) => {
            e.stopPropagation()
            onRemove?.()
          }}
        >
          ×
        </span>
      )}
    </button>
  )
}
