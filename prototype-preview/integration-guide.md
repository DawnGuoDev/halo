# 集成指引 · 站点运营概览（原型增量）

本工程为 Halo 控制台的独立原型（`prototype-preview` 分支、`prototype-preview/` 目录），不依赖后端、数据库或容器。
本文档前半部分为「站点运营概览」本次增量，后半部分保留上一需求（文章列表筛选标签）的回填说明与工程通用约定。

- 需求正本：`artifacts/产品设计/PRD 文档`（PRD 文档 v1，REQ-001～REQ-004）；评审页：`artifacts/产品设计/PRD 文档（HTML）/index.html`
- 设计系统：`knowledge/design-system/halo`（Halo 2.28.0）；组件仍为 npm `@halo-dev/components@2.27.0`，未升级
- 验收配置：`preview.json`（11 个场景）；回执在 `.prototype-evidence/preview/`；截图见 `screenshot-ops-*.png`

---

## A. 本次业务来源与页面

| 项 | 内容 |
| --- | --- |
| 业务仓库 | `DawnGuoDev/halo`，业务基线 `02a4adf3b6404dbb5e1431b0106ae85d68e8b1a3`（工作分支 `feat/08ab0c6c-8jfv`） |
| 原型来源分支 | `prototype-preview@1a64e4f65b97a1c49559e0a02636ae5477b045c3`（登记基线 `main@f6c046cc2`） |
| 新增路由 | `/operations`（name `OperationsOverview`，hash：`#/operations`），菜单放「仪表盘」分组，标签「运营概览」 |
| 占位路由 | `/comments`（`src/views/FakeCommentsView.vue`），承接「评论管理」跳转；回填时删除并指向业务 `/comments` |
| 参考业务源码 | `ui/console-src/modules/dashboard/{Dashboard.vue,components/WidgetCard.vue,widgets/presets/comments/{PendingCommentsWidget,CommentItem,CommentStatsWidget}.vue,widgets/presets/posts/{PostStatsWidget,RecentPublishedWidget}.vue,module.ts}`、`ui/console-src/modules/contents/comments/{CommentList.vue,components/CommentDetailModal.vue,components/CommentListItem.vue}`、`ui/console-src/modules/contents/posts/PostList.vue` |

## B. 实际复用 / 适配 / 替身

| 类型 | 对象 | 说明 |
| --- | --- | --- |
| 直接复用（npm 2.27.0） | `VPageHeader`、`VButton`、`VCard` 风格（自建 `OperationalCard` 沿用 WidgetCard 表面）、`VEmpty`、`VEntityContainer`/`VEntity`/`VEntityField`、`VSpace`、`VStatusDot`、`VTag`、`VDescription`/`VDescriptionItem`、`VSwitch`、`VLoading`、`Toast`、`Dialog`（`Dialog.warning`）、`VModal` | 未改包内实现 |
| 组合参考 | 仪表盘 `WidgetCard`、`PendingCommentsWidget`、`CommentItem`、`CommentStatsWidget` | 卡片表面、页头、实体列表、`VStatusDot` 待审核状态点、相对时间等组合方式沿用业务写法 |
| 改写（视觉等价） | 指标卡 `src/views/operations/MetricCard.vue` | 复刻 `PostStatsWidget` 的「图标圆底 + 指标名 + 大数字」；新增涨跌徽标（↑ 绿 / ↓ 红 / 持平），业务无现成组件 |
| 新增（本地 SVG） | 趋势折线 `src/components/trend/OperationsTrendChart.vue` | 控制台无图表库；两条折线、按日刻度（30 天抽稀）、逐点悬浮；回填可换图表库或保留 |
| 源码迁入并适配（替身） | `src/components/halo/modal/Modal.vue` | 见「弹层适配」，仅替代 `VModal` 的显隐实现，结构与样式沿用业务 2.28 源码 |
| 宿主替身 | `src/i18n.ts` + `src/locales/*.json` | 精简 `t()`；新增 `core.operations.*` 中英文文案，回填并入业务 `ui/src/locales` |
| 宿主替身 | `src/utils/datetime.ts` | 替代 `@halo-dev/ui-shared` 的 `utils.date`（`format` / `timeAgo`） |
| 前端 Mock | `src/mock/operational.ts` | 见 C 节；唯一数据入口 |

## C. 前端 Mock（回填时整文件替换）

Mock 对齐建议的控制台查询能力（接口形态由研发确定，PRD「研发接续」已注明需补齐）：

```text
getOverview(rangeDays: 7|30)  -> { rangeStart, rangeEnd, metrics{posts,postsChange,comments,commentsChange,pending},
                                   trend[{date,posts,comments}], hotArticles[{name,title,deleted,publishTime,commentCount}],
                                   pendingComments[{name,summary,author,articleName,articleTitle,submittedAt}] }
getPendingState() / getHotState()      -> 区域级加载失败标记（仅 Mock，用于演示局部失败与重试）
getArticleSummary(articleName)         -> 互动摘要（总数、已通过/未审核、最近 5 条一级评论）
getCommentDetail(commentName)          -> 完整内容、评论人、文章、提交时间、该文已通过历史评论
approveComment(name) / rejectComment(name) -> 通过：approved=true；驳回：不新增状态，仅移出本页列表
canManageComments()                    -> 预览权限开关（?permission=view 时不显示通过/驳回）
```

- 统计口径：按自然日聚合、含当天；上一周期为紧邻的等长区间；新增文章按 `firstPublishedAt`（首次公开时间）；收到评论与热门文章只计一级评论。
- 待审核为当前存量，不随区间变化；列表取最近 5 条，处理后由第 6 条补位（Mock 中可见 `comment-011` 补入）。
- 场景参数（URL query）：`scenario=empty`（区间无数据）、`pending-empty`（无待审核）、`hot-empty`（无热门文章）、`pending-error` / `hot-error`（区域失败）；`permission=view`（无 `system:comments:manage`）。

## D. 弹层适配（重要，回填需处理）

- **现象（已复现）**：使用 npm `@halo-dev/components@2.27.0` 的 `VModal` 时，弹层外壳保持 `display:none`，内容不可见。该问题在基线工程既有的文章列表「设置」弹层同样出现，因此不是本页引入。
- **事实与假设分开**：
  - 事实：2.27.0 的 Modal 用 `<Transition>` 的 `@before-enter` 设置外层可见性；在 vue 3.5.46 + vue-router 5.1.0 的独立工程中该钩子未触发（Teleport 本身正常，测试过 `App.vue` 中的 `<Teleport to="body">` 可正常挂到 `body`）。
  - 假设（未验证）：业务 2.28 源码结构相同，但业务控制台有自己的 setup（vue-i18n、`Transition` 全局组件等），弹层在真实控制台可能表现正常。**研发回填时应在真实控制台验证一次，不要直接照搬本工程结论。**
- **原型处理**：新增 `src/components/halo/modal/Modal.vue`（`PrototypeVModal`），
  1) 保留业务 Modal 的 props / emits / 插槽（`header`、`center`、`actions`、默认、`footer`）、`.modal-wrapper/.modal-layer/.modal-content` 结构与样式；
  2) 把显隐改为明确 `v-show`（`visible` 驱动）；
  3) 内联渲染（不使用 Teleport），靠 `.modal-wrapper` 的 `fixed` 定位与遮罩覆盖页面；
  4) 补回 Esc 关闭、层点击「聚焦抖动」、打开/关闭焦点恢复与 Tab 焦点陷阱。
- **差异**：不限制 body 滚动、未接 `overlayScrollbars`、层点击不关闭（与业务一致：`layerClosable=false`）。
- **回填**：业务控制台直接用 `@halo-dev/components` / 业务源码的 `VModal`，删除本适配文件；若业务环境复现同样问题，需按真实组件版本排查（`Transition` 兼容或组件升级），本文件不作为业务实现建议。

## E. 回填顺序

1. 新增控制台模块（建议 `ui/console-src/modules/dashboard/` 或新模块），`module.ts` 增加 `/operations` 路由与菜单（`group: "dashboard"`，图标 `IconRocketLine`）；权限沿用 `system:posts:view`、`system:comments:view`、`system:comments:manage`。
2. 迁移页面：`OperationsOverviewView.vue`（主页面）、`MetricCard.vue`、`OperationalCard.vue`（或改用仪表盘 `WidgetCard`）、`OperationsTrendChart.vue`、`ArticleSummaryDrawer.vue`、`CommentReviewDrawer.vue`。
3. 数据层：把 B/C 节 Mock 调用替换为 `@tanstack/vue-query` + 新增控制台查询端点；待审核计数与列表、热门文章、趋势按返回结构调整；通过评论沿用现有 `patchComment`（`spec/approved`、`spec/approvedTime`），驳回仅从本页列表移除。
4. 文案：`core.operations.*` 并入 `ui/src/locales/{zh-CN,en}.json`；时间格式化改用 `utils.date`。
5. 移除原型专用：`src/mock/operational.ts`、`src/i18n.ts`、`src/utils/datetime.ts`、`FakeCommentsView.vue`（改为真实 `/comments` 路由）、`src/components/halo/modal/`（改用真实 `VModal`），以及 `BasicLayout` 中的本地菜单。
6. 接口契约变更后执行 `./gradlew generateOpenApiDocs && pnpm -C ui api-client:gen`，禁止手改生成客户端（详见 PRD 研发接续）。

## F. 前后端后续能力需求

- 指标：所选区间与上一等长区间的新增文章数（按首次公开时间）、一级评论数；待审核一级评论总数（当前存量）。
- 趋势：区间内每个自然日的新增文章数、一级评论数；无数据日期返回 0。
- 热门文章：区间内按一级评论数降序的前 5 篇（含已删除文章标记），用于展示标题、发布时间、评论数。
- 待审核列表：按提交时间倒序、分页的最近待审核一级评论；详情需要评论人、所属文章、完整内容、该文已通过历史评论。
- 冲突处理：处理他人已处理/已删除评论时返回明确错误，前端提示「该评论已被处理或删除」并刷新。
- 现有 `GET /apis/api.console.halo.run/v1alpha1/stats` 只提供累计值，不支持时间窗口、按日聚合与上一周期对比。

## G. 构建与验收

```bash
cd prototype-preview
npm ci
npm run build        # vue-tsc 类型检查 + vite 生产构建 → dist/
npm run build:preview  # 仅构建（验收配置使用）
npm run preview      # http://localhost:4173/#/operations
```

标准验收（独立原型辅助 Skill，配置 `preview.json`，11 个场景）：

```bash
python3 <SKILL>/scripts/preview.py validate <abs>/prototype-preview/preview.json
python3 <SKILL>/scripts/preview.py build    <abs>/prototype-preview/preview.json
node <SKILL>/scripts/browser.mjs <abs>/prototype-preview/preview.json \
  --playwright-module <abs>/playwright-core/index.mjs \
  --executable /usr/bin/chromium-browser
python3 <SKILL>/scripts/preview.py package  <abs>/prototype-preview/preview.json --out <abs>/fresh-package
```

`playwright-core` 为验收工具依赖，本机使用 `/tmp/pw/node_modules/playwright-core`（`npm install --no-save`），不写入 `package.json`。

## H. 已知边界与待确认

- 首次发布时间：Mock 使用 `firstPublishedAt`；业务需按 PRD「待确认」决定是否补充存储（不阻塞评审）。
- 评论人：无显示名时按邮箱前缀展示（原型会在详情里同时展示邮箱），脱敏策略待安全/产品确认。
- 菜单分组：原型放在「仪表盘」分组；按 PRD 待界面评审确认。
- 弹层适配见 D 节，属于原型替身；真实控制台表现未验证。
- 图表为自绘 SVG（缩放自适应、逐点悬浮），未做图例开关以外的图表交互（缩放、导出）。
- 窄视口（1024px）已人工查看见卡 2 列、趋势与两张列表纵向堆叠；< 768px 未做正式验收。
- 访问量统计、数据导出、自定义时间范围不在范围。

---

# 附：上一需求 · 文章列表筛选标签（保留）

## 1. 本次业务来源

| 项 | 内容 |
| --- | --- |
| 需求正本 | `artifacts/设计设计/PRD 文档`（REQ-001 / REQ-002） |
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
| 改写（视觉等价） | `SearchInput` | FormKit 未纳入，使用原生 input 复刻「Enter 提交 / 清除按钮」语义（业务为 FormKit + `@halo-dev/ui-shared`） |
| 宿主替身 | `useRouteQuery` → `use-post-filters.ts` | 用 vue-router `replace` 实现 URL query 同步；`page` 在筛选变化时被移除以回到第 1 页 |
| 宿主替身 | `@tanstack/vue-query` → `use-resource-queries.ts` | 本地 Promise + `onMounted` 查询，返回结构与组件期望一致 |
| 前端 Mock | `src/mock/index.ts` / `src/mock/data.ts` | 模拟 `listPosts({ labelSelector, fieldSelector, sort, keyword, page, size })` 与分类/标签/作者查询；固定 40 篇文章 |
| 未迁移 | 批量操作、权限（`v-permission` / `HasPermission`）、插件扩展点、分类/标签/回收站页、文章编辑器、设置表单校验 | 不属本次需求；入口保留，点击提示“原型预览未接入” |

## 3. 上一需求的业务变化

1. **「当前筛选」标签行**（`PostListView.vue` 中 `data-testid="active-filters"`）
   - 位置：VCard body 顶部、筛选区下方；无筛选时整行不渲染。
   - 顺序固定：关键词 → 状态 → 可见性 → 分类 → 标签 → 作者；每类一个标签。
   - 文案：`条件名：可读值`。关键词取搜索词；状态/可见性取本地可选值映射；分类/标签取查询到的 `displayName`；作者当前取作者 name（与业务 `UserFilterDropdown` 的 `selectedValue` 相同，见“待确认”）。
   - 关闭标签：`clearActiveFilter(key)` → `updateFilter(key, undefined)`，仅删除该 query 键，其它条件与列表保持。
   - 「清除全部」：`clearAll()` 清空 6 个条件（保留 `page/size`），排序恢复默认（`sort` 为空即 `spec.publishTime,desc`），并回到第 1 页。
2. **筛选变化回到第 1 页**：`writeFilters()` 删除 `page`；分页变更则由 `handlePageChange` 写入新页码。
3. **筛选无结果空态**：`hasActiveFilters && total === 0` → `VEmpty`“没有符合筛选条件的文章”，仅一个「清除筛选」，等同「清除全部」。
4. **原空态保留**：无筛选且 0 篇 → 原「当前没有文章」+ 刷新/新建；用 `?scenario=empty` 模拟。

## 4. 上一需求回填顺序（研发）

1. 在业务 `PostList.vue` 新增标签派生：复用现有 6 个筛选 ref 与 `keyword`，按上面顺序生成标签；分类/标签/作者的可读名分别从 `usePostCategory()`、`useAllPostTagsQuery()`、用户详情查询获取，查不到时回退原值（原型 `readableFilterValue()` 即该行为）。
2. 关闭标签：设置对应 ref 为 `undefined`，并保留既有 `page.value = 1` watcher；标签区「清除全部」可调用 `VFilterDropdownGroup` 的 `clearAll`（`ref` 暴露）+ 清空 `keyword` + `selectedSort = undefined`。
3. 空态分支：`posts.length === 0` 时按 `hasActiveFilters` 切换两套 `VEmpty`，筛选无结果分支不渲染刷新/新建。
4. 文案：把 `src/locales/{zh-CN,en}.json` 中新增键并入 `ui/src/locales/*.json`：
   `core.post.filters.active.label|clear_all|remove|keyword.label`、`core.post.empty_filtered.title|message|clear`。
5. 删除宿主替身：`use-resource-queries.ts`、`i18n.ts`、`use-post-filters.ts`、`src/mock/*`、`src/components/halo/filter/*`（待 `@halo-dev/components` 发布 2.28.0 后）。自定义样式 `.filter-chip*` 可用 `VTag` + 允许单行/加高的属性替代，或直接沿用。

## 5. 上一需求前后端接口

- 后端无需改动：现有 `GET /apis/api.console.halo.run/v1alpha1/posts` 已支持 `keyword`、`labelSelector`（发布状态）、`fieldSelector`（分类/标签/作者/可见性）与 `sort`；筛选无结果由前端根据“是否有生效条件 + total = 0”判断。
- Mock 契约只用于预览：`listPosts` 入参与返回 `{ items, total, hasNext, hasPrevious }` 与业务调用形态一致，回填时替换实现即可。

## 6. 已知边界与待确认（上一需求）

- 作者标签当前显示作者 name（`ruibaby` 等）。Halo 的 `User` 在这里通常没有显示名，业务下拉也以 name 为主展示；若产品要求显示个人资料昵称，需要作者详情查询后再回填。
- 「重置」图标与「清除全部」并存：按 PRD 保留原重置图标，重置只清筛选组（不含关键词）；标签行「清除全部」清 6 类条件 + 排序。二者作用范围不同，文案上已区分。
