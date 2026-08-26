---
id: zustand-状态管理
title: 为什么图视图的状态用 zustand
type: post
tags: [状态管理, React]
date: 2025-01-20
draft: false
---

图视图有过滤面板、focus 高亮、搜索定位，状态不少但结构扁平。Redux 太重，Context 会整树重渲染，zustand 正好。

## 用法

```ts
export const useStore = create((set) => ({
  filters: { tags: [], showTagEdges: true, hideGhost: false },
  toggleTag: (t) => set((s) => ({
    filters: { ...s.filters, tags: toggle(s.filters.tags, t) }
  })),
}));
```

## 心得

- 选择器订阅精确到字段，节点图层不会因为面板状态变化而重渲染
- graph.json fetch 一次缓存进 store，[[react-flow-实践]] 的 useMemo 直接消费
- 与 URL hash 同步可以用 subscribe 做，比 useEffect 干净

状态管理选型和服务端数据（如 [[markdown-解析管线]] 的产物）要分开：服务端缓存用 SWR 思路，UI 状态才进 zustand。
