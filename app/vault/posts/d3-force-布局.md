---
id: d3-force-布局
title: d3-force 力导向布局笔记
type: note
tags: [可视化, 前端]
date: 2025-03-05
draft: false
---

力导向布局把节点当质点、边当弹簧，模拟到收敛后得到坐标。本站在构建时跑 300 tick 固化坐标，[[react-flow-实践]] 里解释了前端为什么不再模拟。

## 调参经验

- `forceLink.distance`：link 边 90，tag 弱边 180，让弱关系把图撑开
- `forceManyBody().strength(-400)`：斥力，值越大图越稀疏
- `forceCollide(40)`：防止节点重叠，半径要大于节点视觉半径

```js
const sim = forceSimulation(nodes)
  .force('link', forceLink(edges).id(d => d.id).distance(90))
  .force('charge', forceManyBody().strength(-400))
  .stop();
for (let i = 0; i < 300; i++) sim.tick();
```

## 稳定性

每次构建位置乱跳会破坏读者的心智地图。解法：读旧 graph.json 坐标做初始值，新节点在质心附近随机落位。这和 [[图数据库选型]] 无关，但对图的可读性比选型重要得多。
