/**
 * 构建管线集成测试：
 * 复制真实 vault 到临时目录 + 追加语法夹具文章 → spawn `node build.mjs` → 断言产物 JSON。
 * 覆盖：KaTeX 渲染、嵌入分类（图片不建边/笔记建边）、fragment 剥离、breaks、TOC 提取、健康报告。
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { cp, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

const run = promisify(execFile)
const APP_DIR = path.resolve(import.meta.dirname, '..')

const FIXTURE_ID = 'z-fixtures'
const FIXTURE_MD = `---
id: ${FIXTURE_ID}
title: 管线夹具：语法覆盖
type: note
tags: [前端]
date: 2026-08-27
draft: false
---

行内公式 $a^2 + b^2 = c^2$ 出现在句中。

块级公式：

$$x = \\frac{1}{2}$$

这一行结束是单个换行
下一行应当渲染为换行。

## 一级小节

内容一。

### 子小节

内容二。

图片嵌入 ![[不存在的图.png]] 不应建边。

笔记嵌入 ![[笔记原子化]] 应当建边并内联正文。

[[数字花园方法论#三条原则]] 是 fragment 链接，[[幽灵链接-夹具]] 是种子链接。
`

let workDir: string
let fixture: Record<string, unknown>
let stdoutText: string

beforeAll(async () => {
  workDir = await mkdtemp(path.join(tmpdir(), 'garden-pipeline-'))
  await cp(path.join(APP_DIR, 'vault'), path.join(workDir, 'vault'), { recursive: true })
  await writeFile(path.join(workDir, 'vault/posts', `${FIXTURE_ID}.md`), FIXTURE_MD)
  // build.mjs 以绝对路径运行（模块解析基于文件位置），相对产物路径落在 cwd
  const { stdout } = await run('node', [path.join(APP_DIR, 'build.mjs')], { cwd: workDir })
  stdoutText = stdout
  fixture = JSON.parse(
    await readFile(path.join(workDir, 'public/data/posts', `${FIXTURE_ID}.json`), 'utf8'),
  )
}, 60_000)

describe('构建管线语义', () => {
  it('数学公式在构建期渲染为 KaTeX HTML', () => {
    const html = fixture.html as string
    expect(html).toContain('katex')
    expect(html).toContain('katex-display')
    expect(html).toContain('frac')
  })

  it('单个换行渲染为 <br>（对齐 Obsidian 行为）', () => {
    expect(fixture.html as string).toMatch(/单个换行<br\s*\/?>\s*下一行/)
  })

  it('h2/h3 注入锚点 id 并提取 TOC', () => {
    const toc = fixture.toc as { id: string; text: string; level: number }[]
    expect(toc.length).toBeGreaterThanOrEqual(2)
    expect(toc[0]).toMatchObject({ id: 'h-0', text: '一级小节', level: 2 })
    expect(toc[1]).toMatchObject({ id: 'h-1', text: '子小节', level: 3 })
    expect(fixture.html as string).toContain('id="h-0"')
  })

  it('图片嵌入渲染 <img> 但不产生图谱边', () => {
    const html = fixture.html as string
    expect(html).toContain('embed-img')
    const outgoing = fixture.outgoing as { id: string }[]
    expect(outgoing.map((o) => o.id)).not.toContain('不存在的图.png')
  })

  it('笔记嵌入建立连接', () => {
    const outgoing = fixture.outgoing as { id: string }[]
    expect(outgoing.map((o) => o.id)).toContain('笔记原子化')
    expect(fixture.html as string).toContain('embed-note')
  })

  it('wikilink 剥离 #fragment 并保留种子语义', () => {
    const html = fixture.html as string
    const outgoing = fixture.outgoing as { id: string; exists: boolean }[]
    expect(html).not.toContain('data-target="数字花园方法论#三条原则"')
    expect(outgoing.map((o) => o.id)).toContain('数字花园方法论')
    const ghost = outgoing.find((o) => o.id === '幽灵链接-夹具')
    expect(ghost?.exists).toBe(false)
    expect(html).toContain('wikilink--ghost')
  })

  it('健康报告输出到构建日志', () => {
    expect(stdoutText).toContain('内容健康报告')
    expect(stdoutText).toContain('frontmatter 完整')
  })

  it('graph.json 的边类型只有 link 与 tag', async () => {
    const graph = JSON.parse(await readFile(path.join(workDir, 'public/data/graph.json'), 'utf8'))
    for (const e of graph.edges) expect(['link', 'tag']).toContain(e.kind)
  })
})
