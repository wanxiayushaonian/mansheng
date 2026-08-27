import type { ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useGraphStore } from '@/store'

const NAV = [
  { to: '/graph', label: '图谱' },
  { to: '/tag/全部', label: '标签' },
  { to: '/about', label: '关于' },
]

/** 明暗切换 */
function ThemeToggle() {
  const theme = useGraphStore((s) => s.theme)
  const toggleTheme = useGraphStore((s) => s.toggleTheme)
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink-2 transition-colors hover:text-accentc"
      aria-label={theme === 'dark' ? '切换到亮色' : '切换到暗色'}
      title={theme === 'dark' ? '切换到亮色' : '切换到暗色'}
    >
      {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  )
}

function NavItems({ className }: { className?: string }) {
  return (
    <nav className={cn('flex items-center gap-4', className)}>
      {NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            cn(
              'relative text-sm transition-colors duration-150 pb-0.5',
              isActive
                ? 'text-ink font-medium after:absolute after:left-0 after:bottom-0 after:h-[2px] after:w-full after:bg-accentc'
                : 'text-ink-2 hover:text-ink',
            )
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}

export function SiteMark() {
  return (
    <Link to="/graph" className="flex items-center gap-2 shrink-0">
      <span
        className="inline-block w-2.5 h-2.5 rounded-full"
        style={{ background: 'var(--moss)' }}
        aria-hidden
      />
      <span className="font-serif-sc text-lg font-bold tracking-wide text-ink">蔓生花园</span>
    </Link>
  )
}

interface TopBarProps {
  /** floating：图视图左上悬浮胶囊；bar：吸顶通栏 */
  variant?: 'floating' | 'bar'
  /** 图视图内嵌搜索框等 */
  children?: ReactNode
}

export default function TopBar({ variant = 'bar', children }: TopBarProps) {
  const location = useLocation()

  if (variant === 'floating') {
    return (
      <motion.header
        initial={{ y: -16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.1, ease: [0.22, 0.8, 0.32, 1] }}
        className="float-panel flex items-center gap-4 h-14 px-5"
        style={{ zIndex: 20 }}
      >
        <SiteMark />
        <span className="w-px h-5 bg-line hidden sm:block" aria-hidden />
        <NavItems className="hidden sm:flex" />
        <ThemeToggle />
        {children}
      </motion.header>
    )
  }

  return (
    <header
      className="sticky top-0 z-50 w-full border-b"
      style={{ background: 'var(--paper)', borderColor: 'var(--line)' }}
      key={location.key}
    >
      <div className="mx-auto max-w-5xl h-14 px-4 flex items-center justify-between">
        <SiteMark />
        <div className="flex items-center gap-4">
          <NavItems />
          <ThemeToggle />
          {children}
        </div>
      </div>
    </header>
  )
}
