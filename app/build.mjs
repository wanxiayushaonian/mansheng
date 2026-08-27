// build.mjs —— 图节点博客构建脚本
// 扫描 vault/posts/*.md → 解析 frontmatter + wikilinks → 生成边/占位节点
// → 标签共现弱边 → d3-force 布局（300 ticks，旧坐标做初始值）
// → 输出 public/data/graph.json、posts/<id>.json、tags.json
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkFrontmatter from 'remark-frontmatter';
import remarkWikiLink from 'remark-wiki-link';
import { visit } from 'unist-util-visit';
import * as yaml from 'js-yaml';
import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js';
import {
  forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide, forceX, forceY,
} from 'd3-force';

const POSTS_DIR = 'vault/posts';
const OUT_DIR = 'public/data';
// 子路径部署前缀（与 vite.config.ts 的 base 保持一致）；站点绝对地址用于 RSS
const BASE_PATH = process.env.BASE_PATH ?? '/mansheng/';
const SITE_URL = (process.env.SITE_URL ?? 'https://example.com').replace(/\/+$/, '');

const md = new MarkdownIt({
  html: true, // vault 内容为可信源，允许内联 HTML（wikilink 替换产物）
  linkify: true,
  breaks: true, // 对齐 Obsidian 默认行为：单个换行渲染为 <br>（写作端所见即所得）
  highlight(code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      return `<pre><code class="hljs language-${lang}">${hljs.highlight(code, { language: lang }).value}</code></pre>`;
    }
    return `<pre><code class="hljs">${md.utils.escapeHtml(code)}</code></pre>`;
  },
});

// 把 [[target]] / [[target|display]] 替换为 <a class="wikilink" ...>
function renderHtml(body, existsMap) {
  const src = body.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target, display) => {
    const id = target.trim();
    const text = (display || target).trim();
    const ghost = existsMap.get(id) ? '' : ' wikilink--ghost';
    return `<a class="wikilink${ghost}" data-target="${id}" href="${BASE_PATH}p/${encodeURIComponent(id)}">${text}</a>`;
  });
  return md.render(src);
}

// 纯文本（去 markdown 语法、去 wikilink 括号），用于 summary / context
function toPlainText(body) {
  return body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, t, d) => (d || t).trim())
    .replace(/[#>*`\-|[\]()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ---------- 1. 扫描并解析 ----------
const files = (await readdir(POSTS_DIR)).filter((f) => f.endsWith('.md'));
const nodes = new Map();
const edges = [];
const seenEdge = new Set();

const addEdge = (source, target, kind) => {
  const key = `${source}->${target}`;
  if (seenEdge.has(key)) return;
  seenEdge.add(key);
  edges.push({ source, target, kind });
};

for (const f of files) {
  const raw = await readFile(`${POSTS_DIR}/${f}`, 'utf-8');
  const tree = unified().use(remarkParse).use(remarkFrontmatter).use(remarkWikiLink, {
    aliasDivider: '|',
  }).parse(raw);

  let front = {};
  const links = [];
  visit(tree, (node) => {
    if (node.type === 'yaml') front = yaml.load(node.value) ?? {};
    if (node.type === 'wikiLink') links.push(node.value.trim());
  });

  const id = f.replace(/\.md$/, '');
  const body = raw.replace(/^---[\s\S]*?---\s*/, '');
  nodes.set(id, {
    id,
    title: front.title ?? id,
    type: front.type ?? 'post',
    tags: front.tags ?? [],
    date: front.date ? String(front.date) : '',
    draft: front.draft === true,
    exists: true,
    links: [...new Set(links)].filter((t) => t !== id),
    body,
  });
}

// ---------- 2. 生成边 + 占位节点 ----------
for (const node of nodes.values()) {
  for (const target of node.links) {
    if (!nodes.has(target)) {
      nodes.set(target, {
        id: target, title: target, type: 'note', tags: [], date: '',
        exists: false, links: [], body: '',
      });
    }
    addEdge(node.id, target, 'link');
  }
}

// ---------- 3. 标签共现弱边（每标签最多 12 条，轮转选取） ----------
const linkPairs = new Set(edges.map((e) => [e.source, e.target].sort().join('~')));
const byTag = new Map();
for (const n of nodes.values()) {
  if (!n.exists) continue;
  for (const t of n.tags) {
    if (!byTag.has(t)) byTag.set(t, []);
    byTag.get(t).push(n.id);
  }
}
for (const ids of byTag.values()) {
  const pairs = [];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      pairs.push([ids[i], ids[j]]);
    }
  }
  // 轮转选取，最多 12 条
  let added = 0;
  const step = Math.max(1, Math.floor(pairs.length / 12));
  for (let k = 0; k < pairs.length && added < 12; k += step) {
    const [a, b] = pairs[k];
    const key = [a, b].sort().join('~');
    if (linkPairs.has(key)) continue;
    linkPairs.add(key);
    addEdge(a, b, 'tag');
    added++;
  }
}

// ---------- 4. d3-force 布局（旧坐标做初始值，新节点在质心附近随机） ----------
let oldPos = new Map();
if (existsSync(`${OUT_DIR}/graph.json`)) {
  try {
    const old = JSON.parse(await readFile(`${OUT_DIR}/graph.json`, 'utf-8'));
    for (const n of old.nodes ?? []) {
      if (Number.isFinite(n.x) && Number.isFinite(n.y)) oldPos.set(n.id, { x: n.x, y: n.y });
    }
  } catch { /* 忽略损坏的旧文件 */ }
}
let cx = 0; let cy = 0;
for (const p of oldPos.values()) { cx += p.x; cy += p.y; }
if (oldPos.size) { cx /= oldPos.size; cy /= oldPos.size; }

const simNodes = [...nodes.values()].map((n) => {
  const old = oldPos.get(n.id);
  return {
    ...n,
    x: old ? old.x : cx + (Math.random() - 0.5) * 200,
    y: old ? old.y : cy + (Math.random() - 0.5) * 200,
  };
});
// degree 提前计算（碰撞半径与节点尺寸都依赖它）
const degree = new Map();
for (const e of edges) {
  degree.set(e.source, (degree.get(e.source) ?? 0) + 1);
  degree.set(e.target, (degree.get(e.target) ?? 0) + 1);
}

// 节点直径与前端 nodeSize.ts 保持一致；标签截断 12 字，中文约 13px/字（12px 字号 + 字距）
const nodeR = (d) => (24 + Math.min((degree.get(d.id) ?? 0) * 5, 44)) / 2;
const labelHalfW = (d) => Math.min(String(d.title ?? d.id).length, 12) * 6.5;
// 自适应碰撞半径：节点半径与标签半宽取大者 + 间隙，保证圆点和标签都不重叠
const collideR = (d) => Math.max(nodeR(d) + 10, labelHalfW(d) + 14);

const simEdges = edges.map((e) => ({ ...e }));
const sim = forceSimulation(simNodes)
  .force('link', forceLink(simEdges).id((d) => d.id).distance((d) => (d.kind === 'tag' ? 200 : 110)))
  .force('charge', forceManyBody().strength(-450))
  .force('center', forceCenter(cx, cy))
  .force('collide', forceCollide((d) => collideR(d)))
  .force('anchorX', forceX((d) => oldPos.get(d.id)?.x ?? cx).strength((d) => (oldPos.has(d.id) ? 0.25 : 0)))
  .force('anchorY', forceY((d) => oldPos.get(d.id)?.y ?? cy).strength((d) => (oldPos.has(d.id) ? 0.25 : 0)))
  .stop();
for (let i = 0; i < 300; i++) sim.tick();

// ---------- 5. summary / 输出（degree 已在布局前计算） ----------

const existsMap = new Map([...nodes.values()].map((n) => [n.id, n.exists]));
const titleMap = new Map([...nodes.values()].map((n) => [n.id, n.title]));

const graphNodes = simNodes
  .filter((n) => !(n.exists && n.draft))
  .map((n) => ({
    id: n.id,
    title: n.title,
    type: n.type,
    tags: n.tags,
    degree: degree.get(n.id) ?? 0,
    date: n.date,
    x: Math.round(n.x * 100) / 100,
    y: Math.round(n.y * 100) / 100,
    exists: n.exists,
    summary: n.exists ? toPlainText(n.body).slice(0, 120) : '',
  }));

const tagCount = new Map();
for (const n of nodes.values()) {
  if (!n.exists || n.draft) continue;
  for (const t of n.tags) tagCount.set(t, (tagCount.get(t) ?? 0) + 1);
}

// backlinks：反向扫描 link 边，context 取引用处前后各约 40 字
const backlinks = new Map();
for (const e of edges) {
  if (e.kind !== 'link') continue;
  const src = nodes.get(e.source);
  if (!src || !src.exists) continue;
  const plain = toPlainText(src.body);
  const needle = titleMap.get(e.target) ?? e.target;
  let idx = plain.indexOf(needle);
  if (idx < 0) idx = plain.indexOf(e.target);
  if (idx < 0) idx = 0;
  const context = plain.slice(Math.max(0, idx - 40), idx + needle.length + 40);
  if (!backlinks.has(e.target)) backlinks.set(e.target, []);
  backlinks.get(e.target).push({ id: e.source, title: src.title, context });
}

await mkdir(`${OUT_DIR}/posts`, { recursive: true });

for (const n of nodes.values()) {
  if (!n.exists || n.draft) continue;
  const out = {
    id: n.id,
    title: n.title,
    type: n.type,
    tags: n.tags,
    date: n.date,
    draft: false,
    html: renderHtml(n.body, existsMap),
    outgoing: n.links.map((t) => ({ id: t, title: titleMap.get(t) ?? t, exists: existsMap.get(t) ?? false })),
    backlinks: backlinks.get(n.id) ?? [],
  };
  await writeFile(`${OUT_DIR}/posts/${n.id}.json`, JSON.stringify(out, null, 2));
}

let tagMeta = [];
if (existsSync('vault/tags.yaml')) {
  tagMeta = yaml.load(await readFile('vault/tags.yaml', 'utf-8')) ?? [];
}
const descMap = new Map(tagMeta.map((t) => [t.name, t.description]));

const tagsSorted = [...tagCount.entries()]
  .map(([name, count]) => ({ name, count }))
  .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

await writeFile(`${OUT_DIR}/graph.json`, JSON.stringify({
  nodes: graphNodes,
  edges,
  tags: tagsSorted,
}, null, 2));

await writeFile(`${OUT_DIR}/tags.json`, JSON.stringify(
  tagsSorted.map((t) => ({ ...t, ...(descMap.get(t.name) ? { description: descMap.get(t.name) } : {}) })),
  null, 2,
));

// ---------- 6. RSS（ATOM 格式，供订阅器抓取） ----------
const escXml = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const isoDate = (d) => `${d || '1970-01-01'}T00:00:00Z`;
const feedPosts = [...nodes.values()]
  .filter((n) => n.exists && !n.draft)
  .sort((a, b) => b.date.localeCompare(a.date));
const feedEntries = feedPosts.map((n) => {
  const url = `${SITE_URL}${BASE_PATH}p/${encodeURIComponent(n.id)}/`;
  return `  <entry>
    <id>${url}</id>
    <title>${escXml(n.title)}</title>
    <link rel="alternate" href="${url}"/>
    <updated>${isoDate(n.date)}</updated>
    <summary>${escXml(toPlainText(n.body).slice(0, 200))}</summary>
${n.tags.map((t) => `    <category term="${escXml(t)}"/>`).join('\n')}
    <author><name>蔓生花园</name></author>
  </entry>`;
}).join('\n');
await writeFile('public/rss.xml', `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>蔓生花园</title>
  <subtitle>一座数字花园：文章是节点，链接是边。</subtitle>
  <id>${SITE_URL}${BASE_PATH}</id>
  <link rel="alternate" href="${SITE_URL}${BASE_PATH}"/>
  <link rel="self" href="${SITE_URL}${BASE_PATH}rss.xml"/>
  <updated>${isoDate(feedPosts[0]?.date)}</updated>
  <author><name>蔓生花园</name></author>
${feedEntries}
</feed>
`);

// ---------- 7. 全文搜索索引（原始文档数组；minisearch 索引在前端构建） ----------
// 分词规则与 src/lib/searchTokenize.ts 保持一致：CJK 单字+bigram，拉丁按词
const searchDocs = feedPosts.map((n) => ({
  id: n.id,
  title: n.title,
  type: n.type,
  tags: n.tags,
  date: n.date,
  summary: toPlainText(n.body).slice(0, 160),
  text: toPlainText(n.body).slice(0, 4000),
}));
await writeFile(`${OUT_DIR}/search-index.json`, JSON.stringify(searchDocs));

const linkEdges = edges.filter((e) => e.kind === 'link').length;
const tagEdges = edges.length - linkEdges;
console.log(`nodes: ${graphNodes.length} (ghost: ${graphNodes.filter((n) => !n.exists).length})`);
console.log(`edges: ${edges.length} (link: ${linkEdges}, tag: ${tagEdges})`);
console.log(`tags: ${tagsSorted.length}, posts written: ${graphNodes.filter((n) => n.exists).length}`);
