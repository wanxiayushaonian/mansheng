/**
 * 全文搜索分词：CJK 拆单字 + 相邻二元组，拉丁/数字按词。
 * ⚠️ 与 build.mjs 的注释约定保持一致（索引在构建期用同一规则生成文档，
 * 此文件负责查询侧分词；两侧规则必须同步修改）。
 */
export function tokenizeSearch(text: string): string[] {
  const tokens: string[] = []
  for (const w of text.toLowerCase().match(/[a-z0-9]+/g) ?? []) tokens.push(w)
  const cjk = text.replace(/[^一-鿿]/g, '')
  for (const ch of cjk) tokens.push(ch)
  for (let i = 0; i < cjk.length - 1; i++) tokens.push(cjk[i] + cjk[i + 1])
  return tokens
}

export interface SearchDoc {
  id: string
  title: string
  type: string
  tags: string[]
  date: string
  summary: string
  text: string
}

/** 从正文里截取命中片段（首尾各 ~45 字），命中处加 <mark> */
export function extractSnippet(doc: SearchDoc, query: string): string {
  const tokens = tokenizeSearch(query)
    .filter((t) => t.length >= 2)
  const pool = tokens.length ? tokens : tokenizeSearch(query).filter((t) => /[一-鿿]/.test(t))
  const lower = doc.text.toLowerCase()
  let hitIdx = -1
  let hitToken = ''
  for (const t of pool) {
    const i = lower.indexOf(t.toLowerCase())
    if (i >= 0) {
      hitIdx = i
      hitToken = t
      break
    }
  }
  if (hitIdx < 0) return doc.text.slice(0, 90)
  const start = Math.max(0, hitIdx - 45)
  const end = Math.min(doc.text.length, hitIdx + hitToken.length + 45)
  const raw = `${start > 0 ? '…' : ''}${doc.text.slice(start, end)}${end < doc.text.length ? '…' : ''}`
  // 窗口内高亮所有命中 token
  const escaped = hitToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return raw.replace(new RegExp(escaped, 'gi'), (m) => `<mark>${m}</mark>`)
}
