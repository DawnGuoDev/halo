# 设计说明与验收记录 · 文章信息速览（v3）

## 本轮（v3）· 文章信息速览修正与复验

### 基线
- 需求：`artifacts/产品设计/PRD 文档/PRD.md`（v2，REQ-001 / REQ-002）。本轮无新增业务口径，按 PRD 修正原型偏差。
- 业务来源：`DawnGuoDev/halo` @ `f6c046cc27e2b5d61367b85792b6cd51bd9101f1`：`PostList.vue`、`PostListItem.vue`、`entity-fields/{PublishStatus,PublishTime,Visible}Field.vue`、`ui/src/locales/*.json`、`Modal.vue`。
- 原型工程：`prototype-preview` 分支的任务分支 `feat/45e18184-ax04-prototype`，从已验证提交 `350b845c1` 增量实现；Vue 3 + TS + Vite + Tailwind + `@halo-dev/components@2.27.0`。

### 本轮修正（相对 350b845c1）
1. **P0 残留 / 二次打开失效**：抽屉改为由列表以 `v-if="quickViewOpen && quickViewPost"` 渲染，关闭即卸载；去掉抽屉内重复 `onMounted` 和 `v-if="visible || post"` 造成的隐藏常驻实例。连续打开 A、B 时每次都得到新实例，不可能残留隐藏的下拉菜单或上一篇字段。
2. **P0 遮罩关闭**：去掉 `:layer-closable="true"`，保持组件默认 false，点击遮罩不关闭。
3. **P1 内部可见性**：INTERNAL 显示「内部 / Internal」（PRD「本次改动」要求），列表筛选仍两值。
4. **P1 草稿文案**：`status.draft` 改为「未发布」，与列表状态、PRD 状态口径一致。
5. **P1 入口可发现性**：入口从“默认透明、悬停才显色”改为始终可见的 12px 灰字按钮，仍在 ⋯ 左侧，hover/focus 加深。
6. 抽屉正文去掉中途的悬挂说明；字段标签 12px 灰、值 14px，空值 gray-400；底部「编辑文章」为唯一主操作（default 按钮 + 图标）。

### 浏览器检查（HTTP 独立页面，构建产物 dist）
- 工具：独立原型辅助 Skill `preview.py` + `browser.mjs`（Playwright `1.56.1` + `/usr/bin/chromium-browser`），配置 `preview.json`；模块装在会话隔离目录 `/tmp/halo-tools/prototype-browser`。
- 视口 1440×900。构建：`preview.py build`（`npm run build:preview`）通过；`npm run build`（vue-tsc + vite）通过。
- **16 个场景全部通过**（v1 筛选 7 个 + 速览 9 个），新增：
  1. 速览入口始终可见（⋯ 左侧）→ 点击打开后标题与行一致；
  2. 点击遮罩不关闭 → 关闭按钮关闭 → 仍在第 2/2 页；
  3. 连续切换 A（默认分类/技术）→ B（未设置分类、发布时间「未发布」）→ C（未设置标签）：每次都只显示当前文章；
  4. 编辑文章后返回：第 2 页 30/页打开 post-32 的速览 → 编辑占位页显示同名文章 → 返回后仍在 2/2、共 40 项，抽屉关闭。
- 已经过场景覆盖：已发布/公开、草稿 + 空分类 + 无发布时间、空标签、内部、私有、定时发布（post-12）、Esc 关闭后筛选与行数保持。
- 人工观察（截图）：入口默认可见；抽屉右侧全高、头部「文章速览」+ 关闭按钮、字段纵向排列；底部固定「编辑文章」。
- 运行错误：所有场景 `errors: []`，资源均为构建产物 200。

### 截图（本包内）
- `screenshot-quick-view-entry.png`：列表行内常显「速览」入口（⋯ 左侧）。
- `screenshot-quick-view-drawer.png`：已发布 · 公开文章抽屉（分类/标签/发布时间/最近更新时间/编辑文章）。
- `screenshot-quick-view-empty.png`：内部可见性的未发布文章（未设置分类、未发布）。
- `screenshot-quick-view-switch-no-residue.png`：先看两分类文章再直接看空分类+空标签文章，仅显示后者。
- `screenshot-quick-view-list-with-filters.png`：第 2 页列表（30/页），关闭后仍停留原页。
- `screenshot-quick-view-page2-drawer.png`：第 2 页打开私有文章速览（遮罩点击不关闭，关闭按钮后页码保持）。
- `screenshot-editor-placeholder.png`：编辑器占位页（原型边界）。

### 未覆盖 / 限制
- 真实文章中不存在“发布中”样本进入验收；Mock 的 `publicizing` 状态在场景中未单独断言（状态映射逻辑与列表一致）。
- 权限：未模拟文章编辑权限，`编辑文章` 始终可见；回填时受 `system:posts:manage` 约束。
- 分类/标签很多时的换行与正文滚动（PRD D-01）未专项验收；正文 `overflow-y:auto`。
- 英文界面无切换入口，英文键已补齐未做视觉验收。
- 编辑器为占位页，真实编辑器、批量操作、设置表单未纳入本次原型。

## v1 · 文章列表筛选标签（保留）

## 基线
- 业务来源：`DawnGuoDev/halo` @ `f6c046cc27e2b5d61367b85792b6cd51bd9101f1`，页面 `ui/console-src/modules/contents/posts/PostList.vue`。
- 原型工程：`prototype-preview` 分支 / `prototype-preview/` 目录（Vue 3 + TS + Vite + Tailwind + `@halo-dev/components@2.27.0`；`VFilterDropdown*` 按 2.28.0 源码迁入）。
- 设计系统：Halo v2.28.0（`knowledge/design-system/halo`）：主色 #4CCBA0、4px 圆角、36px 输入、12px 辅助文本；本页沿用控制台骨架、灰色筛选区、白色 VCard 表面。

## 保留 / 变化
- 保留：页头与右上四个操作、搜索框 + 筛选组 + 刷新图标布局、`VFilterDropdownGroup` 的「重置」图标、URL query 同步、列表行与行内操作、分页、设置弹层入口、「没有文章」原空态。
- 变化：筛选区下方新增「当前筛选」标签行（仅在有条件时出现）；筛选无结果时替换为空态并只给「清除筛选」；搜索框 Enter 提交语义（2.27 工程原为即时输入）。

## 视觉选择
- 标签使用浅色底 + 1px `#d9d9d9` 边框 + 4px 圆角 + 12px 字号，与 `VTag` 默认/列表标签同族；高度 24px、单行截断（最长 22rem），关闭按钮 16×16，hover 仅改颜色/背景不改尺寸；焦点保留原生按钮可见性。
- 「清除全部」为 primary 文本按钮，位于标签行右侧；空态「清除筛选」为默认按钮（唯一动作）。
- 标签行与筛选区以 `border-b` 分隔，筛选区仍是 gray-50，标签行白色，层级与 VCard 一致。

## 浏览器检查（HTTP 独立页面，构建产物 dist）
- 工具：独立原型辅助 Skill `preview.py` + `browser.mjs`（Playwright `chromium-browser`），配置 `preview.json`。
- 视口：1440×900（正式验收），另以 1280 宽人工查看筛选组换行与标签行。
- 7 个正式场景全部通过：
  1. 无筛选时隐藏标签区（20 行、共 40 篇）；
  2. 状态 + 可见性显示两个标签，关闭「可见性」只清该项，可见性下拉回「全部」；
  3. 搜索框输入 Halo → Enter → 出现「关键词：Halo」→ 关闭后搜索框清空、清除按钮消失；
  4. 「清除全部」后标签消失、恢复列表；
  5. 第 2 页选择「未发布」→ 回到「1 / 1」并显示标签（符合 PRD 第 1 页要求）；
  6. 分类 + 标签无匹配 → 「没有符合筛选条件的文章」+ 仅「清除筛选」→ 点击后恢复列表；
  7. `?scenario=empty` → 原「当前没有文章」+ 刷新/新建，无「清除筛选」、无标签行。
- 浮层抽查：可见性、分类（6 项长列表 + 搜索）、作者（远程搜索 + 头像）在页面右侧边缘展开均完整可见、未被裁切；实际点选作者后标签为「作者：ruibaby」并写入 URL。
- 运行错误：浏览器报告 `errors: []`，请求均为 200；无缺失资源或 MIME 问题。

## 截图（本包内）
- `screenshot-filters-active.png`：状态：未发布 + 可见性：私有，标签行 + 清除全部。
- `screenshot-keyword-active.png`：关键词：Halo 标签与搜索框内容、清除按钮联动。
- `screenshot-filtered-empty.png`：筛选无结果空态，仅「清除筛选」。

## 未覆盖 / 限制
- 窄屏 < 640px 未做正式验收（原型侧栏 16rem 在窄屏隐藏；业务布局不受本次改动影响）。
- 作者显示名、权限控制、批量操作、设置表单未纳入本次业务验收。
- 英文界面文案已补键但原型未提供切换入口，未做英文视觉验收。
