---
id: typescript-类型体操
title: 克制地使用 TypeScript 类型体操
type: essay
tags: [前端, 工具链]
date: 2026-02-14
draft: false
---

类型体操的合理场景只有一个：库的作者。应用代码里，类型的价值是文档 + 防错，不是炫技。

## 本站的实践

graph.json 的数据结构手写一份类型，再用 `satisfies` 校验：

```ts
interface GraphNode {
  id: string; title: string; type: 'post' | 'note' | 'essay';
  tags: string[]; degree: number; x: number; y: number; exists: boolean;
}
const data = await fetch('/data/graph.json').then(r => r.json()) as { nodes: GraphNode[] };
```

## 红线

- 不写超过两层的条件类型
- 不用模板字符串类型做运行时逻辑的「替身」
- 类型推导不出来时优先改代码结构，而不是加断言

[[react-19-新特性]] 的类型升级基本无感，好类型就该这样。[[测试策略笔记]] 里有个观点呼应：类型和测试是互补的安全网，谁也不是对方的替代品。
