# 蔓生花园

一座**图节点数字花园**：文章是节点，[[wikilink]] 是边，构建期用 d3-force 预计算布局，读者在图上漫游、在文里阅读。

- 站点：https://wanxiayushaonian.github.io/mansheng/
- 技术栈：Vite + React 19 + React Flow + zustand + Tailwind，内容管线为 remark/markdown-it
- 部署：GitHub Actions → GitHub Pages（子路径 `/mansheng/`）

## 结构

```
app/
├── vault/posts/        # 内容源：Markdown + frontmatter + [[wikilink]]
├── vault/tags.yaml     # 标签描述
├── build.mjs           # 构建管线：解析 → 建边/弱边 → d3-force 布局 → data JSON + rss.xml
├── scripts/prerender.mjs  # 构建后预渲染 42+ 路由为静态 HTML（SEO）
└── src/                # 前端（图谱 / 文章 / 标签 / 关于）
```

## 常用命令

```bash
cd app
npm run dev        # 开发（http://localhost:3000/mansheng/）
npm run build      # 数据管线 + tsc + vite build + 预渲染 → dist/
npm run preview    # 本地预览构建产物
```

## 写作工作流（Obsidian）

用 Obsidian「打开文件夹作为库」选择 `app/vault`：`posts/` 里的文章、`[[wikilink]]`
互链、frontmatter properties 全部原生可用，附件自动存入 `assets/`。
写完 push 到 master 即自动构建上线。`[[不存在的链接]]` 会作为"种子节点"
出现在图谱上，等它被写出来。

## 部署配置

子路径由 `BASE_PATH`（默认 `/mansheng/`）贯穿 vite / build.mjs / prerender 三处；
sitemap 与 RSS 的绝对地址由 `SITE_URL` 控制，CI 中已配置。推送到 `master` 即自动构建发布。
