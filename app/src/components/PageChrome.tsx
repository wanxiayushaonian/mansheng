import TopBar from '@/components/TopBar'
import Footer from '@/components/Footer'
import { C } from '@/lib/ui'

/** 内容页布局包装：吸顶 TopBar + Footer */
export function PageChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] flex-col" style={{ background: C.paper, color: C.ink }}>
      <TopBar />
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  )
}
