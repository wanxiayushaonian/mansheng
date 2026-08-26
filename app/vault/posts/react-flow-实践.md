---
id: react-flow-实践
title: React Flow 实战：把博客画成一张图
type: post
tags: [前端, 可视化]
date: 2025-02-10
draft: false
---

React Flow（@xyflow/react）是目前 React 生态里最顺手的节点图库。本项目用它渲染全站文章图，坐标来自构建时的 [[d3-force-布局]]，前端只做交互，不跑物理模拟。

## 三个关键决策

- 节点即 React 组件，hover 展开摘要卡，click 跳转文章页
- `draggable: false`，避免用户拖乱构建时算好的布局
- 边样式区分 link / tag 弱边，后者虚线低透明度

## 性能

节点过千时打开虚拟化，只渲染视口内的节点：

```tsx
<ReactFlow nodes={nodes} edges={edges} onlyRenderVisibleElements minZoom={0.05} />
```

配合 [[zustand-状态管理]] 存过滤状态，切换标签不会触发整图重算。更极端的规模可以参考 [[节点虚拟化技巧]]，那是下一步要写的。
