/* 蔓生花园 service worker：
 * - 带 hash 的静态资源（/assets/、字体、图片）：缓存优先，一次安装永久离线
 * - 页面与数据 JSON：网络优先，离线回退到已缓存内容（读过的文章离线可再读）
 */
const VERSION = 'mansheng-v1'
const BASE = '/mansheng/'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    self.clients.claim().then(() =>
      caches.keys().then((keys) =>
        Promise.all(
          keys.filter((k) => k.startsWith('mansheng-') && k !== VERSION).map((k) => caches.delete(k)),
        ),
      ),
    ),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  // 指纹资源：immutable，缓存优先
  if (url.pathname.includes('/assets/') || /\.(woff2?|png|jpe?g|svg|webp|avif)$/.test(url.pathname)) {
    event.respondWith(
      caches.open(VERSION).then(async (cache) => {
        const hit = await cache.match(req)
        if (hit) return hit
        const res = await fetch(req)
        if (res.ok) cache.put(req, res.clone())
        return res
      }),
    )
    return
  }

  // 页面与数据：网络优先，失败回退缓存 / 首页
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone()
          caches.open(VERSION).then((cache) => cache.put(req, copy))
        }
        return res
      })
      .catch(async () => {
        const hit = await caches.match(req)
        return (
          hit ??
          caches.match(`${BASE}`) ??
          new Response('离线中 —— 蔓生花园暂不可达', {
            status: 503,
            headers: { 'content-type': 'text/plain; charset=utf-8' },
          })
        )
      }),
  )
})
