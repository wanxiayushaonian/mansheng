---
id: markdown-解析管线
title: Markdown 解析管线：从 .md 到 graph.json
type: post
tags: [工具链, 前端]
date: 2025-04-12
draft: false
---

构建脚本的核心是一条解析管线：扫描 vault/posts，用 unified 解析 frontmatter 和双方括号链接，产出节点、边和渲染数据。

## 管线结构

1. `remark-parse` 把 md 解析成 AST
2. `remark-frontmatter` 识别 YAML 头，交给 js-yaml
3. `remark-wiki-link` 把 `[[xxx]]` 解析成 wikiLink 节点
4. 遍历 AST 收集链接，生成边和占位节点

正文 HTML 则单独用 markdown-it + highlight.js 渲染，AST 只负责关系抽取——关系与渲染解耦，这正是 [[unified-生态]] 的设计哲学。

## 取舍

没有用 MDX。文章内容是纯 Markdown，MDX 的组件能力对博客是过剩的，还会把写作端锁死在 React。详见 [[MDX-的取舍]]。构建速度则交给 [[vite-构建优化]] 那篇讨论。
