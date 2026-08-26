/**
 * 构建后预渲染（prerender）：
 * 起本地静态服务 + 无头 Chrome（CDP），逐路由加载 → 等待挂载动画完成
 * （轮询内联 style.opacity === '0' 的元素归零，上限 10s）→ 抓 outerHTML
 * 写入 dist/<route>/index.html，让静态托管直接返回含正文/正确 og 标签的
 * HTML（SEO / 无 JS 兜底）。另生成 sitemap.xml、robots.txt、404.html。
 *
 * 环境变量：
 *   SITE_URL     站点绝对地址（默认 https://example.com，sitemap 用）
 *   CHROME_PATH  指定 Chrome/Chromium 可执行文件
 * 找不到浏览器时跳过预渲染，不阻塞构建。
 */
import { execFile, spawn } from 'node:child_process'
import { promisify } from 'node:util'
import { createServer } from 'node:http'
import { readFile, writeFile, mkdir, copyFile, mkdtemp } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, extname, join, resolve } from 'node:path'

const execFileAsync = promisify(execFile)

const DIST = resolve(process.cwd(), 'dist')
// 与 vite.config.ts 的 base 保持一致（CI 里 SITE_URL 传完整 https://host/mansheng）
const BASE_PATH = process.env.BASE_PATH ?? '/mansheng/'
const BASE_PREFIX = BASE_PATH.replace(/\/+$/, '')
const SITE_URL = (process.env.SITE_URL ?? `https://example.com${BASE_PREFIX}`).replace(/\/+$/, '')
const ANIM_TIMEOUT_MS = 10000

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
}

async function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH
  for (const bin of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser']) {
    try {
      await execFileAsync(bin, ['--version'], { timeout: 5000 })
      return bin
    } catch {
      /* try next */
    }
  }
  return null
}

/** 启动带 CDP 的无头 Chrome，返回 { port, kill } */
async function launchChrome(bin) {
  const profileDir = await mkdtemp(join(tmpdir(), 'garden-prerender-'))
  const child = spawn(
    bin,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      `--user-data-dir=${profileDir}`,
      '--remote-debugging-port=0',
      'about:blank',
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] },
  )
  const port = await new Promise((res, rej) => {
    let buf = ''
    child.stderr.on('data', (d) => {
      buf += d.toString()
      const m = buf.match(/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)/)
      if (m) res(Number(m[1]))
    })
    child.on('exit', () => rej(new Error('Chrome 提前退出')))
    setTimeout(() => rej(new Error('等待 CDP 端口超时')), 15000)
  })
  return {
    port,
    kill: () => {
      child.kill('SIGKILL')
    },
  }
}

/** dist 静态服务：剥离 BASE_PATH 前缀；无扩展名路径回退 index.html（SPA fallback） */
function serveDist() {
  return new Promise((resolveServe) => {
    const server = createServer(async (req, res) => {
      try {
        const url = new URL(req.url ?? '/', 'http://localhost')
        let pathname = decodeURIComponent(url.pathname)
        if (BASE_PREFIX && pathname.startsWith(BASE_PREFIX)) {
          pathname = pathname.slice(BASE_PREFIX.length) || '/'
        }
        let path = join(DIST, pathname)
        if (!path.startsWith(DIST)) throw new Error('forbidden')
        if (extname(path) === '') path = join(path, 'index.html')
        if (!existsSync(path)) path = join(DIST, 'index.html')
        const body = await readFile(path)
        res.writeHead(200, { 'content-type': MIME[extname(path)] ?? 'application/octet-stream' })
        res.end(body)
      } catch {
        res.writeHead(500)
        res.end('server error')
      }
    })
    server.listen(0, '127.0.0.1', () => resolveServe(server))
  })
}

let msgId = 0
function cdpCall(ws, method, params = {}) {
  return new Promise((res, rej) => {
    const id = ++msgId
    const onMsg = (ev) => {
      const m = JSON.parse(ev.data)
      if (m.id === id) {
        ws.removeEventListener('message', onMsg)
        m.error ? rej(new Error(m.error.message)) : res(m.result)
      }
    }
    ws.addEventListener('message', onMsg)
    ws.send(JSON.stringify({ id, method, params }))
  })
}

function connectWs(url) {
  return new Promise((res, rej) => {
    const ws = new WebSocket(url)
    ws.addEventListener('open', () => res(ws))
    ws.addEventListener('error', () => rej(new Error(`CDP WebSocket 连接失败: ${url}`)))
  })
}

// 入场动画未完成的元素数（排除 React Flow 故意隐藏的连接点 Handle）
const PENDING_JS = `[...document.querySelectorAll('[style]')].filter(el => el.style.opacity === '0' && !el.classList.contains('react-flow__handle')).length`

let msgId2 = 0
function cdpCallRaw(ws, method, params = {}) {
  return new Promise((res, rej) => {
    const id = ++msgId2
    const onMsg = (ev) => {
      const m = JSON.parse(ev.data)
      if (m.id === id) {
        ws.removeEventListener('message', onMsg)
        m.error ? rej(new Error(m.error.message)) : res(m.result)
      }
    }
    ws.addEventListener('message', onMsg)
    ws.send(JSON.stringify({ id, method, params }))
  })
}

/** 打开 /og/:id，按 1200×630 视口截图，返回 PNG buffer */
async function capturePng(cdpPort, httpPort, route) {
  const targetUrl = `http://127.0.0.1:${httpPort}${BASE_PREFIX}${route}`
  let target
  try {
    target = await (await fetch(`http://127.0.0.1:${cdpPort}/json/new?${encodeURIComponent(targetUrl)}`, { method: 'PUT' })).json()
  } catch {
    target = await (await fetch(`http://127.0.0.1:${cdpPort}/json/new?${encodeURIComponent(targetUrl)}`)).json()
  }
  const ws = await connectWs(target.webSocketDebuggerUrl)
  try {
    await cdpCallRaw(ws, 'Emulation.setDeviceMetricsOverride', {
      width: 1200,
      height: 630,
      deviceScaleFactor: 1,
      mobile: false,
    })
    // 等字体就绪 + 数据加载
    await cdpCallRaw(ws, 'Runtime.evaluate', {
      expression: 'document.fonts ? document.fonts.ready.then(() => 1) : 1',
      awaitPromise: true,
      returnByValue: true,
    }).catch(() => {})
    await new Promise((r) => setTimeout(r, 800))
    const shot = await cdpCallRaw(ws, 'Page.captureScreenshot', { format: 'png' })
    if (!shot?.data) throw new Error(`captureScreenshot 无数据: ${JSON.stringify(shot).slice(0, 200)}`)
    return Buffer.from(shot.data, 'base64')
  } finally {
    ws.close()
    fetch(`http://127.0.0.1:${cdpPort}/json/close/${target.id}`).catch(() => {})
  }
}

/** 打开新标签页加载 route（带 BASE_PATH 前缀，与线上一致），等入场动画完成，返回页面 HTML */
async function captureRoute(cdpPort, httpPort, route) {
  const targetUrl = `http://127.0.0.1:${httpPort}${BASE_PREFIX}${route}`
  let target
  try {
    // 新版 Chrome 要求 PUT
    target = await (await fetch(`http://127.0.0.1:${cdpPort}/json/new?${encodeURIComponent(targetUrl)}`, { method: 'PUT' })).json()
  } catch {
    target = await (await fetch(`http://127.0.0.1:${cdpPort}/json/new?${encodeURIComponent(targetUrl)}`)).json()
  }
  const ws = await connectWs(target.webSocketDebuggerUrl)
  try {
    const start = Date.now()
    let pending = -1
    // 轮询：等 mount 动画把内联 opacity 从 0 同步到 1
    while (pending !== 0 && Date.now() - start < ANIM_TIMEOUT_MS) {
      await new Promise((r) => setTimeout(r, 400))
      try {
        const r = await cdpCall(ws, 'Runtime.evaluate', {
          expression: PENDING_JS,
          returnByValue: true,
        })
        pending = r.result.value
      } catch {
        /* 页面跳转中，下一轮重试 */
      }
    }
    const { result } = await cdpCall(ws, 'Runtime.evaluate', {
      expression: 'document.documentElement.outerHTML',
      returnByValue: true,
    })
    return result.value
  } finally {
    ws.close()
    fetch(`http://127.0.0.1:${cdpPort}/json/close/${target.id}`).catch(() => {})
  }
}

/** 路径段安全检查：拒绝路径分隔符 / 目录穿越 */
function safeSegment(s) {
  return s && !s.includes('/') && !s.includes('\\') && !s.includes('..') && !s.startsWith('.')
}

async function main() {
  if (!existsSync(join(DIST, 'index.html'))) {
    console.error('prerender: dist/index.html 不存在，请先执行 vite build')
    process.exit(1)
  }
  const graph = JSON.parse(await readFile(join(DIST, 'data/graph.json'), 'utf8'))

  const routes = [
    { route: '/', out: join(DIST, 'index.html') },
    { route: '/graph', out: join(DIST, 'graph/index.html') },
    { route: '/about', out: join(DIST, 'about/index.html') },
    ...graph.nodes
      .filter((n) => n.exists && safeSegment(n.id))
      .map((n) => ({ route: `/p/${encodeURIComponent(n.id)}`, out: join(DIST, 'p', n.id, 'index.html') })),
    ...graph.tags
      .map((t) => t.name)
      .filter(safeSegment)
      .map((name) => ({ route: `/tag/${encodeURIComponent(name)}`, out: join(DIST, 'tag', name, 'index.html') })),
  ]

  const chrome = await findChrome()
  if (!chrome) {
    console.warn('prerender: 未找到 Chrome/Chromium，跳过预渲染（SEO HTML 不会生成）')
    return
  }
  console.log(`prerender: ${routes.length} 条路由，浏览器 ${chrome}`)

  const server = await serveDist()
  const chromeProc = await launchChrome(chrome)
  try {
    const httpPort = server.address().port
    for (const r of routes) {
      const html = await captureRoute(chromeProc.port, httpPort, r.route)
      await mkdir(dirname(r.out), { recursive: true })
      await writeFile(r.out, html)
      console.log(`  ✓ ${r.route} → dist/${r.out.slice(DIST.length + 1)}`)
    }
    // 404 页（GitHub Pages 等托管用）：复用首页快照
    await copyFile(join(DIST, 'index.html'), join(DIST, '404.html'))

    // og:image：每篇成文文章截 1200×630 分享卡 → dist/og/<id>.png
    await mkdir(join(DIST, 'og'), { recursive: true })
    const ogPosts = graph.nodes.filter((x) => x.exists && safeSegment(x.id))
    let ogOk = 0
    for (const n of ogPosts) {
      try {
        const png = await capturePng(chromeProc.port, httpPort, `/og/${encodeURIComponent(n.id)}`)
        await writeFile(join(DIST, 'og', `${n.id}.png`), png)
        ogOk++
      } catch (e) {
        console.warn(`  ✗ og ${n.id}: ${e.message}`)
      }
    }
    console.log(`prerender: og 分享卡 ${ogOk}/${ogPosts.length} 张`)

    // sitemap.xml + robots.txt
    const urls = routes.map((r) => `  <url><loc>${SITE_URL}${r.route === '/' ? '/' : r.route}</loc></url>`)
    await writeFile(
      join(DIST, 'sitemap.xml'),
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`,
    )
    await writeFile(
      join(DIST, 'robots.txt'),
      `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`,
    )
    console.log(`prerender: 完成（sitemap/robots 基于 SITE_URL=${SITE_URL}）`)
  } finally {
    chromeProc.kill()
    server.close()
  }
}

main().catch((e) => {
  console.warn('prerender 失败（不阻塞构建）:', e.message)
  process.exit(0)
})
