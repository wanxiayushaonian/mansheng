# 图节点博客 — 实施计划

## 已确认需求
- 范围：完整实现到可发布状态（方案 D1–D8 全部）
- 前端形态：Vite + React 18 SPA（react-router v6、zustand、@xyflow/react）
- 内容：生成 25–30 篇示例文章（含 wikilink 互链、标签、部分指向不存在文章的占位节点）
- 交互：P0–P3 全部（缩放平移/hover 卡片/点击进文章；过滤面板/focus 聚焦高亮；MiniMap/搜索/时间轴；局部展开模式/URL hash 同步）

## 阶段划分

### Stage 0 — 技能加载与脚手架
- 加载技能：`vibecoding-webapp-swarm`（读 SKILL.md + product-knowledge.md）
- 建 Vite + React + TS 项目，装依赖：@xyflow/react, react-router-dom, zustand, d3-force, unified/remark 系列, js-yaml, markdown-it + highlight.js

### Stage 1 — 内容层（示例 vault）
- 生成 25–30 篇高质量中文示例文章（技术/知识管理主题），frontmatter 齐全（id/title/type/tags/date/draft）
- 含 [[wikilink]] 互链 + 若干指向不存在文章的占位引用
- tags.yaml + assets 占位
- 产出：/vault

### Stage 2 — 构建脚本 build.mjs（对应 D1–D2）
- 扫描 vault/posts → 解析 frontmatter + wikilinks
- 生成边、占位节点、标签共现弱边（每标签限 N 条）
- d3-force 300 ticks 预计算布局；布局稳定性：旧 graph.json 坐标做初始值
- 输出 dist/data/graph.json、posts/<id>.json（含 HTML 正文、outgoing、backlinks 含上下文片段）、tags.json
- 验证：命令行输出正确节点/边/backlinks
- 委派：coder 子代理

### Stage 3 — 图视图 GraphView（对应 D3–D4）
- React Flow + 自定义 GardenNode（大小映射 degree、颜色映射 type/主标签、ghost 虚线、hover 摘要卡、label 随 zoom 显隐）
- P0 交互 + P1 过滤面板（标签多选/隐藏弱边/隐藏 ghost）
- 委派：coder 子代理

### Stage 4 — 文章页 + 标签页（对应 D5–D6）
- PostPage：正文 HTML 渲染、wikilink 转链、outgoing/backlinks（含上下文）面板、"在图中查看"
- TagPage 聚合
- 委派：coder 子代理

### Stage 5 — P1–P3 增强 + 视觉打磨（对应 D7–D8）
- focus=graph 聚焦高亮邻域（setCenter + 邻域提亮）
- MiniMap、搜索框（飞到节点）、时间轴滑块
- 局部展开模式、URL hash 同步视图状态
- 视觉打磨：低饱和暖色、清晰层级（避免蓝紫渐变）
- 委派：coder 子代理 + reviewer 验收

### Stage 6 — 验证与交付
- 端到端构建 + 预览验证（reviewer/verifier）
- website_version_manager build_version 保存版本交付

## Stage 7 — 上线加固（2026-08-27）

- **SEO/预渲染**：每路由 `useDocumentMeta`（title/description/og）；`/` 直接渲染图谱；`scripts/prerender.mjs` 用 CDP + 真实时间抓取 42 条路由写入 `dist/<route>/index.html`，生成 sitemap.xml / robots.txt / 404.html（`SITE_URL` 环境变量配置域名）
- **字体自托管**：Google Fonts → @fontsource（Noto Sans/Serif SC + JetBrains Mono，unicode-range 分包）；lockfile resolved 统一改写为 registry.npmmirror.com（原 msh 镜像不可达）
- **可见性策略**：全部内容型 `whileInView` 改挂载动画（爬虫/打印/无 JS 可见）；`MotionConfig reducedMotion="user"` + CSS reduced-motion 兜底；Lenis 平滑滚动尊重系统设置
- **稳定取色**：标签颜色改为按名字 FNV-1a hash 取模 6 色盘（不再随标签频率洗牌），chrome.tsx 与 lib/colors.ts 共享一套实现
- **打磨**：edge id 改 `kind:source:target` 稳定键；错误重试不再整页刷新（store.reloadNonce）；信息型文本 ink-3→ink-2；节点 inset 999px hack → color-mix；删除整体未使用的 components/ui/（41 个依赖随之移除）
- 验证：`npm run build` 全绿（tsc + vite + 预渲染 42 路由）；预渲染产物 0 个未完成动画（除 RF Handle）；eslint 同类错误 23→15（均为原有 chrome.tsx 混排导出模式）
- 备份：`temp/backup-before-hardening-20260827.tar.gz`

### 连线布局优化（2026-08-27 追加）
- Handle 钉到圆形正中心（`size/2` 精确定位）：连线由"圆底→圆顶"偏移锚改为圆心到圆心
- edge `type: 'straight'`：去掉默认贝塞尔弧线
- 弱边渐进显示：`WEAK_EDGE_ZOOM = 1.2`，总览只显示 wikilink 实线（108→70 边），放大后标签弱边恢复；`ViewportWatcher` 内部组件同步 zoom；FilterPanel 加提示文案
- hover 邻域高亮：GardenNode 90ms 防抖内上报 store.hoverId（摘要卡同步出现），GraphCanvas 以 `bfsWithin` BFS 1 跳计算邻域——邻居全亮、其余压 0.25、邻接边 accent 高亮，hover 临时接管聚焦模式的强调（移开恢复）；节点卸载时清理残留 hover

## Stage 8 — 仓库与部署（2026-08-27）

- 仓库：git init -b master，首提交 `feat: init mansheng digital garden`，remote（SSH）→ github.com/wanxiayushaonian/mansheng
- 子路径改造：`BASE_PATH`（默认 /mansheng/）贯穿 vite base / BrowserRouter basename / fetch BASE_URL / 纸纹资源迁 src/assets / build.mjs wikilink href / prerender 静态服务剥离前缀
- 补 RSS：build.mjs 生成 Atom 格式 public/rss.xml（Footer 死链接就此接通），Footer GitHub 链接指向真实仓库
- CI：.github/workflows/deploy.yml，push master → build（SITE_URL=wanxiayushaonian.github.io/mansheng，runner 自带 Chrome 跑预渲染）→ actions/deploy-pages
- 上线：Pages Source = GitHub Actions，首次部署成功，https://wanxiayushaonian.github.io/mansheng/ （首页/图谱/文章预渲染/RSS/sitemap 42 条均验证 200）

## Stage 9 — 路线图功能（2026-08-27）

- 全文搜索：build.mjs 生成 search-index.json（原始文档），前端 minisearch + CJK 单字/bigram 分词（src/lib/searchTokenize.ts，与构建端注释约定同步），SearchBox 升级——懒加载索引、正文片段 mark 高亮、种子节点标题兜底，成文结果直接进文章页
- og:image：新增 /og/:id 分享卡路由（1200×630 品牌卡），prerender.mjs 以 CDP setDeviceMetricsOverride 截图 27 张 → dist/og/<id>.png；useDocumentMeta 支持 image 选项，文章页指向专属卡；htmlToText 统一实体解码
- 已读标记：store readMap 持久化 localStorage（mansheng.read）；PostPage 驻留 5s 或滚动 60% 记已读；图谱已读节点去饱和（40% 混纸色）+ 标签页标题变淡；过滤面板显示已读计数
