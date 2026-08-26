---
id: unified-生态
title: unified 生态速览
type: note
tags: [工具链]
date: 2025-04-20
draft: false
---

unified 是一套基于 AST 的内容处理框架：parse → transform → stringify。remark 管 Markdown，rehype 管 HTML，micromark 是底层 tokenizer。

## 为什么值得学

- 插件机制统一，写一个 remark 插件 = 遍历 AST 的纯函数
- AST 遍历推荐 `unist-util-visit`，比手写递归健壮
- 与具体渲染器解耦，同一 AST 可输出 HTML、React 节点或纯文本

```js
import { visit } from 'unist-util-visit';
visit(tree, 'wikiLink', (node) => {
  links.push(node.value);
});
```

本站的 [[markdown-解析管线]] 只用它提取 wikilink 和 frontmatter，正文渲染另走 markdown-it。生态学习曲线略陡，但一旦理解「一切皆 AST」，很多文本处理问题都变成同一种问题。
