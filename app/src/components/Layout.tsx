import type { ReactNode } from 'react'
import TopBar from '@/components/TopBar'
import Footer from '@/components/Footer'

/**
 * 共享布局（children 模式）：吸顶 TopBar + 内容 + Footer。
 * 图视图不使用本组件（全屏无 Footer，内嵌悬浮 TopBar）。
 */
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] flex flex-col">
      <TopBar variant="bar" />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}
