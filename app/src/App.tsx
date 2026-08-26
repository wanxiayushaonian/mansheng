import { Routes, Route, Navigate } from 'react-router-dom'
import GraphPage from '@/pages/GraphPage'
import PostPage from '@/pages/PostPage'
import TagPage from '@/pages/TagPage'
import AboutPage from '@/pages/AboutPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<GraphPage />} />
      <Route path="/graph" element={<GraphPage />} />
      <Route path="/p/:id" element={<PostPage />} />
      <Route path="/tag/:name" element={<TagPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="*" element={<Navigate to="/graph" replace />} />
    </Routes>
  )
}
