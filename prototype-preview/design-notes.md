# 设计说明与验收记录 · 文章列表筛选标签 + 文章信息速览

## 本轮（v2）· 文章信息速览

### 基线
- 需求：`artifacts/产品设计/PRD 文档`（v2，REQ-001 / REQ-002，三项口径已确认）。
- 业务来源：`DawnGuoDev/halo` @ `f6c046cc27e2b5d61367b85792b6cd51bd9101f1`；页面 `ui/console-src/modules/contents/posts/PostList.vue`、行组件 `components/PostListItem.vue`、字段 `entity-fields/{PublishStatus,PublishTime,Visible}Field.vue`；弹层 `ui/packages/components/src/components/modal/Modal.vue`。
- 原型工程：`prototype-preview` 分支上的任务分支 `feat/post-quick-view`，从已验收提交 `1a64e4f65` 增量实现；Vue 3 + TS + Vite + Tailwind + `@halo-dev/components@2.27.0`。
- 设计系统：Halo v2.28.0 —— 4px 圆角、主色 #4CCBA0、12px 辅助文本、抽屉/弹层进入 200ms / 退出 100ms。

### 保留 / 变化
- 保留：页头与右上操作、搜索 + 筛选组 + 刷新、当前筛选标签行、筛选无结果空态、列表行字段与操作菜单、分页、设置弹层入口。
- 变化：行尾（操作菜单左侧）新增「速览」；右侧 420px 全高抽屉；底部「编辑文章」；空值占位；Esc/关闭按钮关闭、遮罩不关闭；编辑占位页往返。

### 视觉选择
- 入口：12px 灰字（#4b5563），位于最近更新时间之后、⋯之前；默认透明文字保留布局，悬停该行/键盘聚焦/抽屉正打开该行时显色并 hover 下划线，右上与操作菜单同层级视觉权重。
- 抽屉：白底、左 1px 边框、无圆角、全高；头部沿用 `VModal` 默认标题「文章速览」+ 关闭按钮；标题 18px/600；字段为“标签 12px 灰 / 值 14px”纵向列表，间距 20px；分类与标签使用 `VTag`；空值为 gray-400 文案；底部右侧 `secondary` 型「编辑文章」按钮（唯一主操作），与设计系统“一个操作区最多一个 primary、次要动作用 secondary”一致。
- 状态：已发布绿点、草稿灰点、定时发布黄点、发布中黄色动画点（`VStatusDot`，与列表口径一致）。

### 浏览器检查（HTTP 独立页面，构建产物 dist）
- 工具：独立原型辅助 Skill `preview.py` + `browser.mjs`（Playwright，`/usr/bin/chromium-browser`），配置 `preview.json`；`playwright-core` 装在会话隔离目录（`/tmp/halo-tools/prototype-browser`，未写入工程依赖）。
- 视口：1440×900。构建：`npm run build`（vue-tsc + vite）与 preview.py build 均通过。
- 13 个场景全部通过（v1 筛选 7 个 + v2 速览 6 个）：
  1. 速览抽屉展示文章信息（标题/已发布/公开/2 个分类/2 个标签/发布时间/最近更新时间，编辑按钮可见）；
  2. 空分类标签与未发布占位（草稿、“未设置分类”、“未发布”，标签仍有值）；
  3. 无标签也显示占位（分类和标签都显示“未设置”，状态已发布）；
  4. 定时发布文章显示「定时发布」与计划时间；
  5. 连续查看与 Esc：可见性=私有时打开第 2 页文章 → Esc → 打开另一篇 → Esc，筛选标签保持、抽屉只显示最后点击文章的分类与时间；
  6. 编辑文章后返回：第 2 页（30 条/页）打开抽屉 → 编辑占位页 → 返回，页码 2/2 与总条数保持、抽屉关闭。
- 人工补充（截图）：入口悬停显示；定时发布状态；遮罩点击不关闭（`layer-closable=false`，浏览器工具实测点击遮罩后抽屉仍在）；关闭后焦点回到触发按钮；点击 Open 后行保持选中背景。
- 运行错误：浏览器报告 `errors: []`，资源均为构建产物 200。

### 截图（本包内）
- `screenshot-quick-view-entry.png`：悬停行显示「速览」入口（⋯ 左侧）。
- `screenshot-quick-view-drawer.png`：已发布文章抽屉（分类/标签/发布时间/最近更新时间/编辑文章）。
- `screenshot-quick-view-empty.png`：未发布、未设置分类、发布日期显示「未发布」。
- `screenshot-editor-placeholder.png`：编辑器占位页（原型边界）。

### 未覆盖 / 限制
- 「发布中」状态的自动轮询与真实发布流程未模拟（Mock 用固定 `publicizing` 样本表达）；抽屉不自动刷新。
- `INTERNAL` 可见性样本按 PRD 两值显示为「公开」，业务实际枚举需研发确认。
- 分类/标签数量很多时的换行与滚动未专项验收（PRD 标注为未验证边界）；抽屉正文已 `overflow-y:auto`。
- 窄屏 < 640px 未做专项验收（抽屉固定 420px，`max-width:100vw`）。
- 编辑器为占位页，真实编辑器、权限与批量操作未纳入本次原型。

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
