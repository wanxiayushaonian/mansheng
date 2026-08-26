---
id: backlinks-的价值
title: Backlinks：列表式博客没有的那块拼图
type: essay
tags: [知识管理, 数字花园]
date: 2025-08-11
draft: false
---

传统博客的「相关文章」靠算法猜，backlinks 靠作者亲手链接——质量高一个数量级。构建时反向扫描 edges 即可得到，成本几乎为零。

## 实现

```js
for (const e of edges) {
  backlinks.get(e.target).push({ id: e.source, context: extractContext(e.source, e.target) });
}
```

context 取引用处前后各 40 字的纯文本片段，读者不用点进去就知道「为什么被引用」。

## 对写作的反向影响

知道自己写的每句话都可能出现在别人的反链面板里，会让人更认真地写链接上下文。这是 [[双向链接的认知科学]] 里谈的「链接即承诺」。[[数字花园方法论]] 把反链视为花园的小径——走得人多了，就成了路。入门概念可先读 [[知识图谱入门]]。
