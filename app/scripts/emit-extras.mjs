/**
 * 构建附属产物：RSS（ATOM）/ 全文搜索索引 / 内容健康报告。
 * 由 build.mjs 在主数据就绪后调用；cwd 必须是 app/（相对 vault、public 路径）。
 */
import { writeFile } from 'node:fs/promises';

const escXml = (s) => String(s)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');
const isoDate = (d) => `${d || '1970-01-01'}T00:00:00Z`;

/**
 * @param {{ nodes: Map<string, {body: string, exists: boolean, draft: boolean, date: string, title: string, tags: string[][]}>, edges: Array<{source: string, target: string, kind: string}>, graphNodes: Array<{id: string, exists: boolean, degree: number}> }} data
 * @param {{ basePath: string, siteUrl: string, outDir: string, healthIssues: string[], toPlainText: (s: string) => string }} ctx
 */
export async function emitExtras(data, ctx) {
  const { nodes, edges, graphNodes } = data;
  const { basePath, siteUrl, outDir, healthIssues, toPlainText } = ctx;

  // ---------- RSS（ATOM 格式，供订阅器抓取） ----------
  const feedPosts = [...nodes.values()]
    .filter((n) => n.exists && !n.draft)
    .sort((a, b) => b.date.localeCompare(a.date));
  const feedEntries = feedPosts.map((n) => {
    const url = `${siteUrl}${basePath}p/${encodeURIComponent(n.id)}/`;
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
  <id>${siteUrl}${basePath}</id>
  <link rel="alternate" href="${siteUrl}${basePath}"/>
  <link rel="self" href="${siteUrl}${basePath}rss.xml"/>
  <updated>${isoDate(feedPosts[0]?.date)}</updated>
  <author><name>蔓生花园</name></author>
${feedEntries}
</feed>
`);

  // ---------- 全文搜索索引（原始文档数组；minisearch 索引在前端构建） ----------
  const searchDocs = feedPosts.map((n) => ({
    id: n.id,
    title: n.title,
    type: n.type,
    tags: n.tags,
    date: n.date,
    summary: toPlainText(n.body).slice(0, 160),
    text: toPlainText(n.body).slice(0, 4000),
  }));
  await writeFile(`${outDir}/search-index.json`, JSON.stringify(searchDocs));

  // ---------- 内容健康报告 ----------
  const existsNodes = graphNodes.filter((n) => n.exists);
  const orphans = existsNodes.filter((n) => n.degree === 0);
  const ghostsByRefs = graphNodes
    .filter((n) => !n.exists)
    .map((g) => ({ id: g.id, refs: edges.filter((e) => e.kind === 'link' && e.target === g.id).length }))
    .sort((a, b) => b.refs - a.refs);
  console.log('\n── 内容健康报告 ─────────────────────');
  if (orphans.length) {
    console.warn(`⚠ 孤儿节点 ${orphans.length}：${orphans.map((o) => o.id).join('、')}（无任何连接）`);
  } else {
    console.log('✓ 无孤儿节点');
  }
  if (ghostsByRefs.length) {
    console.log(`ℹ 种子节点 ${ghostsByRefs.length}，被引最多：${ghostsByRefs.slice(0, 3).map((g) => `${g.id}(${g.refs}篇)`).join('、')}`);
  }
  if (healthIssues.length) {
    for (const issue of healthIssues) console.warn(`✎ ${issue}`);
  } else {
    console.log('✓ frontmatter 完整');
  }
}
