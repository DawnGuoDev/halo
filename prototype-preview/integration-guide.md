# 集成指引 · 文章列表筛选标签 + 文章信息速览

本工程是 Halo 控制台的独立原型（`prototype-preview` 分支），不依赖后端/数据库。本页覆盖两轮需求：「文章 → 文章列表」筛选体验优化（v1），以及本次「文章信息速览」抽屉（v2）。其余页面与能力沿用工程既有说明。

> 本轮（v2）需求：在文章列表每行增加「速览」入口，右侧抽屉展示标题、状态、可见性、分类、标签、发布时间、最近更新时间，底部「编辑文章」。业务口径见 PRD v2：`artifacts/产品设计/PRD 文档/PRD.md`（REQ-001 / REQ-002）。

## 1. 本次业务来源

| 项 | 内容 |
| --- | --- |
| 需求正本 | `artifacts/产品设计/PRD 文档`（v2，REQ-001 / REQ-002） |
| 业务仓库 | `DawnGuoDev/halo` |
| 业务基线 | `f6c046cc27e2b5d61367b85792b6cd51bd9101f1`（= 设计系统 source commit） |
| 目标页面 | `ui/console-src/modules/contents/posts/PostList.vue`（路由 `/posts`，name `Posts`） |
| 原型分支 | `prototype-preview`，工程目录 `prototype-preview/` |
| 设计系统 | Halo Design System v2.28.0；组件 npm 最新为 `@halo-dev/components@2.27.0` |

## 2. 实际复用 / 适配 / 替身

| 类型 | 对象 | 说明 |
| --- | --- | --- |
| 直接复用 | `VCard`、`VPageHeader`、`VButton`、`VSpace`、`VEntityContainer`、`VEntity`、`VEntityField`、`VStatusDot`、`VTag`、`VPagination`、`VLoading`、`VEmpty`、`VModal`、`VDropdownItem`、`Toast`、`VDropdown`（VFilterDropdown 内部） | `@halo-dev/components@2.27.0` |
| 源码迁入 | `VFilterDropdown`、`VFilterDropdownGroup` | npm 2.27.0 未包含，按 2.28.0 源码迁入 `src/components/halo/filter/`；含 2.28.0 的清除按钮、`selectedLabel`、tree 选项与键盘处理 |
| 源码迁入并适配 | `CategoryFilterDropdown`、`TagFilterDropdown`、`UserFilterDropdown` | 只替换数据入口（`use-resource-queries.ts`）与类型来源；选项结构、计数、颜色圆点、作者远程搜索保留 |
| 改写（视觉等价） | `SearchInput` | FormKit 未纳入，使用原生 input 复刻“Enter 提交 / 清除按钮”语义（业务为 FormKit + `@halo-dev/ui-shared`） |
| 宿主替身 | `useRouteQuery` → `use-post-filters.ts` | 用 vue-router `replace` 实现 URL query 同步；`page` 在筛选变化时被移除以回到第 1 页 |
| 宿主替身 | `@tanstack/vue-query` → `use-resource-queries.ts` | 本地 Promise + `onMounted` 查询，返回结构与组件期望一致 |
| 前端 Mock | `src/mock/index.ts` / `src/mock/data.ts` | 模拟 `listPosts({ labelSelector, fieldSelector, sort, keyword, page, size })` 与分类/标签/作者查询；固定 40 篇文章 |
| 未迁移 | 批量操作、权限（`v-permission` / `HasPermission`）、插件扩展点、分类/标签/回收站页、文章编辑器、设置表单校验 | 不属本次需求；入口保留，点击提示“原型预览未接入” |

### v2 新增：文章信息速览（本次）——含 v3 修正

| 类型 | 对象 | 说明 |
| --- | --- | --- |
| 直接复用 | `VModal`（`@halo-dev/components@2.27.0`） | 抽屉复用弹层能力：遮罩、头部关闭按钮、Esc 关闭、焦点陷阱与焦点恢复、`visible` + `close` 契约均来自组件；本次未重写弹层 |
| 新增页面组件 | `src/components/post/PostQuickViewDrawer.vue` | 抽屉内容：标题、状态（`VStatusDot`）、可见性（文字值）、分类与标签（`VTag`）、发布时间、最近更新时间、底部「编辑文章」（`VButton`） |
| 行内入口 | `src/views/PostListView.vue` 的 `VEntity #end` 区 | 「速览」文字按钮位于操作菜单（⋯）左侧，**始终可见**的 12px 灰字次级操作（hover/focus 加深），不改变行高与列宽 |
| 布局适配 | `src/styles.css` 的 `.modal-wrapper.quick-view-drawer` 与 `.quick-view-*` | 仅做“贴右侧、全高、420px 宽、去圆角”的定位与抽屉内字段排版；业务回填时建议由组件新增 `placement="right"` 类能力替代，删除这段样式 |
| 编辑器占位 | `src/views/PostEditPlaceholderView.vue` + 路由 `PostEditor` | 业务文章编辑器未纳入独立工程；占位页只验证“抽屉 → 编辑 → 返回列表”的跳转与筛选恢复 |
| Mock 扩展 | `src/mock/data.ts` / `src/mock/index.ts` | 固定 40 篇：已发布/未发布/定时发布/私有/内部、空分类、空标签、空发布时间样本；`getPost(name)` 供占位编辑器页使用 |

抽屉的数据来源、状态与关闭行为：

1. **数据只取列表行自身的 `ListedPost`**（Mock 的 `MockPost`）；列表只在“正在查看”时渲染抽屉（`v-if`），关闭即卸载。每次打开都是新实例、`post` 由 `:post` 整份传入（不合并），因此连续查看不会残留上一篇的标题、分类、标签或时间，也不会在隐藏态残留下拉菜单。
2. **状态口径与列表一致**：定时发布（scheduling）→「定时发布」及计划时间；发布进行中（publicizing，业务为 `spec.publish && 未打 published/scheduling 标签`）→「发布中」动画点（同名提示）；未发布 →「未发布」；其余 →「已发布」。
3. **可见性**：PUBLIC「公开」/ INTERNAL「内部」/ PRIVATE「私有」。`core.post.quick_view.visible.internal` 文案仅速览使用，不改动列表筛选（列表仍旧两值）。
4. **分类/标签**：取列表返回的已解析名称，优先 `displayName`；多值换行；未设置时显示灰色「未设置分类」「未设置标签」，不隐藏该行。
5. **发布时间**：有值显示 `YYYY-MM-DD HH:mm`（定时发布显示计划时间）；为空显示「未发布」。最近更新时间取行的 `updateTime`（与「最近更新」排序同源）。
6. **关闭**：右上关闭按钮与 Esc 都调用抽屉 `handleClose()`，同步自身可见状态并通知列表清空 `quickViewPost`；**点击遮罩不关闭**（`layerClosable` 默认 false）。关闭后列表保持原页码、每页条数与全部筛选（抽屉状态不写 URL）；约 260ms 后焦点回到触发的「速览」按钮。
7. **编辑**：`handleQuickViewEdit` 先关闭抽屉，再 `router.push({ name: "PostEditor", query: { name, back } })`；占位编辑器返回时恢复 `back` 中的 query（筛选、页码），抽屉不再打开。

### v3 修正（相对已验证提交 350b845c1）

v2 交付后评审发现的问题与本次修正：

| 问题 | 位置 | 当前行为 |
| --- | --- | --- |
| P0 关闭后残留隐藏的下拉菜单；连续打开第二篇时 Modal 不再自行展开（`onMounted` 只置一次可见，`v-if="drawerVisible \|\| !!post"` 让隐藏实例常驻） | `PostQuickViewDrawer.vue` + `PostListView.vue` | 列表以 `v-if="quickViewOpen && quickViewPost"` 渲染，关闭即卸载；抽屉内去掉重复 `onMounted` 与 `v-if="visible \|\| post"` 组合 |
| P0 点击遮罩会关闭 | 抽屉 `VModal` | 去掉 `:layer-closable="true"`，保持组件默认 false（PRD：仅关闭按钮或 Esc） |
| P1 INTERNAL 显示为「公开」 | `visibleText` | 新增 INTERNAL →「内部 / Internal」 |
| P1 草稿显示「草稿」与列表「未发布」不一致 | 状态文案 | `core.post.quick_view.status.draft` 改为「未发布」 |
| P1 入口默认透明，初次进入页面的评审者难以发现 | `.quick-view-trigger` | 改为始终可见的 12px 灰字，hover/focus 加深并下划线 |

## 3. v1 实现的业务变化（筛选标签，保留）

1. **「当前筛选」标签行**（`PostListView.vue` 中 `data-testid="active-filters"`）
   - 位置：VCard body 顶部、筛选区下方；无筛选时整行不渲染。
   - 顺序固定：关键词 → 状态 → 可见性 → 分类 → 标签 → 作者；每类一个标签。
   - 文案：`条件名：可读值`。关键词取搜索词；状态/可见性取本地可选值映射；分类/标签取查询到的 `displayName`；作者当前取作者 name（与业务 `UserFilterDropdown` 的 `selectedValue` 相同，见“待确认”）。
   - 关闭标签：`clearActiveFilter(key)` → `updateFilter(key, undefined)`，仅删除该 query 键，其它条件与列表保持。
   - 「清除全部」：`clearAll()` 清空 6 个条件（保留 `page/size`），排序恢复默认（`sort` 为空即 `spec.publishTime,desc`），并回到第 1 页。
2. **筛选变化回到第 1 页**：`writeFilters()` 删除 `page`；分页变更则由 `handlePageChange` 写入新页码。
3. **筛选无结果空态**：`hasActiveFilters && total === 0` → `VEmpty`“没有符合筛选条件的文章”，仅一个「清除筛选」，等同「清除全部」。
4. **原空态保留**：无筛选且 0 篇 → 原「当前没有文章」+ 刷新/新建；用 `?scenario=empty` 模拟。

## 4. 回填顺序（研发）

1. 在业务 `PostList.vue` 新增标签派生：复用现有 6 个筛选 ref 与 `keyword`，按上面顺序生成标签；分类/标签/作者的可读名分别从 `usePostCategory()`、`useAllPostTagsQuery()`、用户详情查询获取，查不到时回退原值（原型 `readableFilterValue()` 即该行为）。
2. 关闭标签：设置对应 ref 为 `undefined`，并保留既有 `page.value = 1` watcher；标签区「清除全部」可调用 `VFilterDropdownGroup` 的 `clearAll`（`ref` 暴露）+ 清空 `keyword` + `selectedSort = undefined`。
3. 空态分支：`posts.length === 0` 时按 `hasActiveFilters` 切换两套 `VEmpty`，筛选无结果分支不渲染刷新/新建。
4. 文案：把 `src/locales/{zh-CN,en}.json` 中新增键并入 `ui/src/locales/*.json`：
   `core.post.filters.active.label|clear_all|remove|keyword.label`、`core.post.empty_filtered.title|message|clear`。
5. 删除宿主替身：`use-resource-queries.ts`、`i18n.ts`、`use-post-filters.ts`、`src/mock/*`、`src/components/halo/filter/*`（待 `@halo-dev/components` 发布 2.28.0 后）。自定义样式 `.filter-chip*` 可用 `VTag` + 允许单行/加高的属性替代，或直接沿用。

## 5. 前后端接口

- 后端无需改动：现有 `GET /apis/api.console.halo.run/v1alpha1/posts` 已支持 `keyword`、`labelSelector`（发布状态）、`fieldSelector`（分类/标签/作者/可见性）与 `sort`；筛选无结果由前端根据“是否有生效条件 + total = 0”判断。
- Mock 契约只用于预览：`listPosts` 入参与返回 `{ items, total, hasNext, hasPrevious }` 与业务调用形态一致，回填时替换实现即可。

## 6. 构建与验收

```bash
cd prototype-preview
npm ci
npm run build        # vue-tsc 类型检查 + vite 生产构建 → dist/
npm run preview      # http://localhost:4173/#/posts
```

标准验收（独立原型辅助 Skill 的 preview.py / browser.mjs，配置 `preview.json`，16 个场景：v1 筛选 7 个 + 速览功能与回归 9 个）：

```bash
python3 <SKILL>/scripts/preview.py validate <abs>/prototype-preview/preview.json
python3 <SKILL>/scripts/preview.py build    <abs>/prototype-preview/preview.json
node <SKILL>/scripts/browser.mjs <abs>/prototype-preview/preview.json \
  --playwright-module <abs>/prototype-preview/node_modules/playwright-core/index.mjs \
  --executable /usr/bin/chromium-browser
python3 <SKILL>/scripts/preview.py package  <abs>/prototype-preview/preview.json --out <abs>/fresh-package
```

`playwright-core` 为验收工具依赖（本次安装在会话隔离目录 `/tmp/halo-tools/prototype-browser`，版本 1.56.1），不写入 `package.json`；可换成环境已有的其他兼容版本。

## 7. 已知边界与待确认

- 作者标签当前显示作者 name（`ruibaby` 等）。Halo 的 `User` 在这里通常没有显示名，业务下拉也以 name 为主展示；若产品要求显示个人资料昵称，需要作者详情查询后再回填。
- 「重置」图标与「清除全部」并存：按 PRD 保留原重置图标，重置只清筛选组（不含关键词）；标签行「清除全部」清 6 类条件 + 排序。二者作用范围不同，文案上已区分。
- 标签/分类资源被删除或尚未加载时，标签回退显示原始值（PRD 允许的降级），不阻塞列表；此行为已在场景中覆盖分类/标签回退。
- 权限：原型不渲染 `system:users:view` 判断，作者筛选始终可见；回填时用既有 `HasPermission` 包裹。
- 批量选择/批量操作、设置弹层表单、行内发布/删除为工程既有预览能力，本次未改动，也未做业务验收。
- 速览抽屉：原型用 `VModal` + 样式贴右实现；业务组件库当前只有居中弹层，回填时按 PRD 建议扩展 placement 或抽取 `VDrawer`，关闭/Esc/遮罩不关闭/焦点恢复行为可直接沿用 `VModal` 实现。业务 `VisibleField` 仅区分 PUBLIC/PRIVATE 图标，如需在列表行展示「内部」需另行扩展。
- 不具备文章编辑权限的用户可查看速览；原型未模拟权限，`编辑文章` 始终可见。回填时应让编辑入口受 `system:posts:manage` 约束，速览本身不受限。
- 抽屉内容长文本未做专项验收：原型数据中最长分类/标签为 2 个短词；分类或标签很多时的换行与滚动（PRD「未验证边界」）需在业务组件上再确认。抽屉正文已设置 `overflow-y: auto`，内容超出时纵向滚动。
- 列表行「速览」入口始终可见（12px 灰字，位于 ⋯ 左侧），不依赖悬停才能发现；为键盘设备保留原生聚焦轮廓。
