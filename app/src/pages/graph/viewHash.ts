/* ---------- URL hash 编解码 ---------- */
export interface HashState {
  x?: number
  y?: number
  z?: number
  focus?: string
  tags?: string[]
  hideWeak?: boolean
  hideGhost?: boolean
  tl?: string
  mode?: string
}

export function parseHash(): HashState {
  const raw = window.location.hash.replace(/^#/, '')
  if (!raw) return {}
  const out: HashState = {}
  const params = new URLSearchParams(raw.includes('=') ? raw : `focus=${raw}`)
  const x = params.get('x')
  const y = params.get('y')
  const z = params.get('z')
  if (x) out.x = Number(x)
  if (y) out.y = Number(y)
  if (z) out.z = Number(z)
  const focus = params.get('focus')
  if (focus) out.focus = decodeURIComponent(focus)
  const tags = params.get('tags')
  if (tags) out.tags = tags.split(',').map(decodeURIComponent).filter(Boolean)
  if (params.get('hideWeak') === '1') out.hideWeak = true
  if (params.get('hideGhost') === '1') out.hideGhost = true
  const tl = params.get('tl')
  if (tl) out.tl = tl
  const mode = params.get('mode')
  if (mode) out.mode = decodeURIComponent(mode)
  return out
}

export function writeHash(h: HashState) {
  const p = new URLSearchParams()
  if (h.x !== undefined) p.set('x', h.x.toFixed(1))
  if (h.y !== undefined) p.set('y', h.y.toFixed(1))
  if (h.z !== undefined) p.set('z', h.z.toFixed(2))
  if (h.focus) p.set('focus', encodeURIComponent(h.focus))
  if (h.tags && h.tags.length) p.set('tags', h.tags.map(encodeURIComponent).join(','))
  if (h.hideWeak) p.set('hideWeak', '1')
  if (h.hideGhost) p.set('hideGhost', '1')
  if (h.tl) p.set('tl', h.tl)
  if (h.mode) p.set('mode', encodeURIComponent(h.mode))
  const s = p.toString()
  history.replaceState(null, '', s ? `#${s}` : window.location.pathname)
}
