---
id: react-19-新特性
title: React 19 里我真正用上的三个特性
type: post
tags: [React, 前端]
date: 2025-12-01
draft: false
---

React 19 声势很大，但本站实际用到的只有三个：ref 作为 prop、`use()`、以及 Actions 的表单处理。

## 清单

- **ref as prop**：函数组件直接收 ref，告别 forwardRef 样板
- **use()**：在 render 里读 promise，配合 Suspense 处理 graph.json 加载很顺
- **useOptimistic**：评论提交先乐观渲染

```tsx
function GardenNode({ ref, data }) {
  return <div ref={ref}>{data.title}</div>;
}
```

## 没用上的

Server Components——本站是纯静态 SPA，没有服务端。RSC 的心智模型值得学（见 [[服务端组件理解]]），但别为用而用。状态层依然是 [[zustand-状态管理]]，React 19 没有改变客户端状态管理的基本格局。
