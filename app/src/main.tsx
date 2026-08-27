import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
// 自托管字体（fontsource，unicode-range 分包按需加载）
import '@fontsource/noto-sans-sc/400.css'
import '@fontsource/noto-sans-sc/500.css'
import '@fontsource/noto-sans-sc/700.css'
import '@fontsource/noto-serif-sc/400.css'
import '@fontsource/noto-serif-sc/600.css'
import '@fontsource/noto-serif-sc/700.css'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/500.css'
// 数学公式样式（公式本体在构建期已渲染为 HTML，无客户端 JS）
import 'katex/dist/katex.min.css'
import './index.css'
import App from './App.tsx'
import { applyTheme, useGraphStore } from './store'

// 首帧前落地主题，避免闪烁
applyTheme(useGraphStore.getState().theme)

// PWA：仅生产构建注册（离线可漫游已读内容）
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {})
  })
}

createRoot(document.getElementById('root')!).render(
  <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/+$/, '') || undefined}>
    <MotionConfig reducedMotion="user">
      <App />
    </MotionConfig>
  </BrowserRouter>,
)
