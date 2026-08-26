---
id: vite-构建优化
title: Vite 构建优化清单
type: post
tags: [构建优化, 工具链]
date: 2025-07-15
draft: false
---

本站构建分两步：`node build.mjs` 生成数据层，再 `vite build`。数据层是纯 Node 脚本，不进 Vite 管线，所以 Markdown 解析零成本。

## 有效手段

- **manualChunks**：把 react-flow、recharts 拆成独立 chunk，首屏只加载壳
- **按需 fetch**：文章正文放 `public/data/posts/<id>.json`，不进 bundle
- **esbuild minify**：比 terser 快 20 倍，体积差距 <2%

```ts
build: {
  rollupOptions: {
    output: { manualChunks: { graph: ['@xyflow/react'] } }
  }
}
```

## 无效的折腾

压缩 Markdown 源文件、给 JSON 加 gzip 预压——部署平台（Pages）会自动做。真正值得投入的是增量构建：[[markdown-解析管线]] 只重算变化的文章，缓存思路见 [[构建缓存策略]]。
