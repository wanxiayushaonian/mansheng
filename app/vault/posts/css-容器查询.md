---
id: css-容器查询
title: CSS 容器查询在图节点上的妙用
type: note
tags: [前端]
date: 2026-01-25
draft: false
---

图节点的标签（label）应该在 zoom 大时显示、zoom 小时隐藏。用 JS 监听 zoom 再切 class 很啰嗦，容器查询可以纯 CSS 解决。

## 实现

```css
.gnode { container-type: size; }
.gnode__label { display: none; }
@container (min-width: 80px) {
  .gnode__label { display: block; }
}
```

React Flow 缩放会改变节点的视觉尺寸，容器查询直接响应尺寸，不需要任何 JS 状态同步。

## 边界

- 需要节点本身有确定的渲染尺寸变换
- 对老浏览器要降级（直接常显 label）

省下的 JS 也算进 [[前端性能预算]] 的收益里。这类「让浏览器干活」的思路，比任何框架技巧都保值。
