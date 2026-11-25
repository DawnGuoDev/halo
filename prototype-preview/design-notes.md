# 设计说明与验收记录 · 站点运营概览

## 基线
- 业务来源：`DawnGuoDev/halo` @ `02a4adf3b6404dbb5e1431b0106ae85d68e8b1a3`（工作分支 `feat/08ab0c6c-8jfv`）；页面参考 `ui/console-src/modules/dashboard/*`、`ui/console-src/modules/contents/comments/*`、`ui/console-src/modules/contents/posts/PostList.vue`。
- 原型来源：`prototype-preview@1a64e4f65b97a1c49559e0a02636ae5477b045c3`（登记基线 `main@f6c046cc2`）；本次在任务分支 `feat/proto-site-ops-overview` 的 `prototype-preview/` 工程内增量实现。
- 工程：Vue 3.5 + TypeScript + Vite 7 + Tailwind 3.4 + `@halo-dev/components@2.27.0`（**未升级依赖、未新增依赖、锁文件未变**）。
- 设计系统：Halo v2.28.0（`knowledge/design-system/halo`，OD catalog `user:halo` 已按导出 zip restore 且内容一致）：主色 #4CCBA0、深色辅助 #0E1731、4px 圆角、12px 辅助文本、图金/状态色需与文字或图标共同表达。

## 保留 / 变化
- 保留：控制台骨架（16rem 侧栏、菜单分组、页脚）、文章列表筛选标签页、组件示例页；npm 组件版本与既有适配（`VFilterDropdown*` 迁入）不变。
- 新增：`/operations` 路由与「仪表盘」分组菜单「运营概览」（`IconRocketLine`）；页头 + 时间范围切换 + 三指标 + 趋势 + 热门文章 + 待审核评论；两个抽屉（互动摘要、评论详情）与驳回二次确认；`/comments` 占位页。
- 默认入口：`/` 重定向由 `/posts` 调整为 `/operations`（原型演示入口，回填不影响业务路由）。

## 视觉选择
- 卡片沿用仪表盘 `WidgetCard` 表面：白色、4px 圆角、`shadow-sm`、`ring-1 #eaecf0`、12px 行高标题；标题右侧为「描述 + 操作/刷新」。
- 指标卡：图标 8×8 灰底圆，数字 28px/500，环比徽标 12px（上升 green-50/green-600、下降 red-50/red-600、持平 gray-100/gray-500），待审核显示「当前存量」不参与对比。
- 趋势：新增文章 #4CCBA0、评论 #0E1731，2px 折线 + 2.5r 数据点；坐标轴 10px 灰字；悬浮显示当日两项数值；30 天横轴约 6 个刻度。
- 热门文章：序号气泡（第 1 名主色实心，其余灰底），标题截断，右侧「N 条评论」；删除文章为灰色不可点击文字。
- 待审核：标题摘要单行截断，第二行「评论人 评论了 文章」；右侧 `VStatusDot warning` + 相对时间；行点击打开抽屉。
- 时间切换：分段按钮（选中 #0E1731 深底白字），右侧灰字显示区间与对比周期。
- 抽屉：业务 `VModal` 结构与样式（`modal-header/content/body/footer`），宽 600/640。

## 弹层适配（原型替身）
- 事实：npm `@halo-dev/components@2.27.0` 的 `VModal` 打开后外壳 `display:none`（`<Transition>` 的 `@before-enter` 设置 `rootVisible` 未触发）；基线文章列表的「设置」弹层同样复现，说明不是本页引入；同页 `<Teleport to="body">` 正常挂载。
- 处理：`src/components/halo/modal/Modal.vue` 保留业务 props/emits/插槽、结构与 `.modal-*` 样式，显隐改 `v-show`、内联渲染、补回 Esc / 层点击 / 焦点恢复 / Tab 陷阱；不锁 body 滚动、不接 overlayScrollbars。
- 未验证：业务控制台（vue-i18n、全局 Transition 等 setup 下）的真实行为；回填时使用真实组件并复验。

## 浏览器检查（HTTP 独立页面，构建产物 dist，工具 `preview.py` + `browser.mjs`）
- 工具版本：`independent-prototype-assistant` 0.3.4（`preview.py` toolVersion 0.3.0）；Chromium `/usr/bin/chromium-browser`；视口 1440×900。
- 构建：`preview.py build` → `status: passed`（`npm run build` = vue-tsc 类型检查 + vite 构建）。
- 浏览器：`browser.mjs` 11 个场景 **全部通过**，每个场景 `errors: []`：
  1. 默认最近 7 天：新增文章 7（↑3）、收到评论 28（↑6）、待审核 26；两条折线均存在；热门 5 条（post-06 = 6 条评论）；待审核 5 条。
  2. 关闭「新增文章」→ 切 30 天：指标 19 / 75 / 26，热门变为 post-12 = 8 条，折线仅剩评论（开关状态保持）。
  3. 两只开关都关 → 「请选择至少一项要显示的指标」，切 30 天仍保持提示。
  4. 点击热门文章 → 互动摘要显示评论总数 11、最近 5 条一级评论、无审批按钮；关闭后回列表。
  5. 驳回点「取消」：抽屉保持打开，待审核仍为 26，列表 5 条不变。
  6. 驳回点「确认驳回」：抽屉关闭，待审核 25，列表仍 5 条，第 6 条待处理评论（comment-011）补入。
  7. 「通过」：抽屉关闭，待审核 25（并有「已通过该评论」Toast，人工截图确认）。
  8. `?permission=view`：抽屉可看内容，通过/驳回按钮均不存在。
  9. `?scenario=pending-error`：待审核区域显示「加载失败，点击重试」，热门文章正常；重试后仍为失败（模拟持续失败）。
  10. `?scenario=pending-empty`：待审核「当前没有待审核评论」，指标 0，无列表。
  11. `?scenario=empty`：趋势「所选时间范围内暂无数据」、热门「所选时间范围内暂无文章评论」、指标 0 且「持平」，切 30 天仍为空。
- 资源与运行：无 4xx/5xx 请求、无页面异常（`bad responses/errors: []`）。
- 人工视觉/交互补充（截图在本包内）：
  - `screenshot-ops-7d.png`（7 天全页）、`screenshot-ops-30d.png`（30 天全页，横轴 10/27–11/25）
  - `screenshot-ops-summary.png`（互动摘要抽屉）、`screenshot-ops-comment-drawer.png`（评论详情抽屉）
  - `screenshot-ops-reject-confirm.png`（驳回二次确认 Dialog，含「驳回后评论不会公开显示，可在评论管理中重新审核」）
  - `screenshot-ops-empty.png`（四类空态）
  - 趋势悬浮 tooltip（11/23：新增文章 1、评论 5）已人工核对。
  - 1024px 视口人工查看：指标卡 2 列、趋势自适应、两张列表纵向堆叠，无横向溢出。

## 受限与未覆盖
- 业务控制台真实 Modal 行为未实测（见上）；回填时使用真实组件。
- 首次发布时间、评论人邮箱脱敏、菜单分组归属仍为 PRD 待确认项，原型按默认建议实现。
- 英文文案已补 `core.operations.*`，但原型无语言切换入口，未做英文视觉验收。
- < 768px 窄屏未做正式验收；浮层（抽屉、Dialog）在 1440 与 1024 视口均完整可见、未被裁切。
- 范围外：访问量、数据导出、自定义时间范围。
