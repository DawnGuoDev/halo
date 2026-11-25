# Halo 控制台 · 独立原型工程

面向 Halo 控制台的轻量独立前端工程，用于在**不启动后端**的前提下快速新增和预览业务页面。

- 业务仓库：`DawnGuoDev/halo`
- 业务基线：`main@f6c046cc27e2b5d61367b85792b6cd51bd9101f1`
- 工程分支：`prototype-preview`
- 工程目录：`prototype-preview/`
- 迁移映射：见 [prototype-map.json](./prototype-map.json)

## 快速开始

```bash
cd prototype-preview
npm install
npm run dev       # http://localhost:5173/#/posts
npm run build     # vue-tsc 类型检查 + 生产构建到 dist/
npm run preview   # 预览构建产物 http://localhost:4173/#/posts
```

路由使用 hash 模式、构建使用相对 `base`，`dist/` 可直接作为静态目录托管（含制品平台预览），不依赖服务器 rewrite。

只使用 npm 与独立 `package-lock.json`，不依赖仓库根工程的 Gradle / pnpm / vite-plus 安装链，也不需要后端、数据库或容器。

## 页面与入口

| 路由 | 文件 | 说明 |
| --- | --- | --- |
| `/#/posts`（默认） | `src/views/PostListView.vue` | 参考真实「文章」列表页：页头 + 筛选 + 实体列表 + 分页 + 设置弹层 |
| `/#/demo` | `src/views/ComponentDemoView.vue` | 常用组件示例：按钮、标签、Alert、Tabs、描述列表、开关、Toast |

- 布局与侧栏：`src/layouts/BasicLayout.vue`
- 路由表：`src/router/index.ts`（新增页面时在此追加懒加载路由，并在布局菜单中加一项）
- 样式入口：`src/styles.css`（Tailwind 三层 + 控制台骨架类），组件样式来自 `@halo-dev/components/dist/style.css`
- 本地 Mock：`src/mock/index.ts`（唯一数据入口）+ `src/mock/data.ts`（固定数据）

## 本次需求 · 文章列表筛选标签

当前工程承载「Halo 控制台文章列表筛选体验优化」原型：在筛选区下方显示「当前筛选」可关闭标签、
「清除全部」，筛选无结果时提供「清除筛选」空态。业务规则见 PRD；实现与回填步骤见
[integration-guide.md](./integration-guide.md)，验收记录与截图见 [design-notes.md](./design-notes.md)。

验收数据入口：`preview.json`（独立原型辅助 Skill 的 preview.py / browser.mjs 配置），
`.prototype-evidence/preview/` 保存构建日志与浏览器报告。

## 已支持能力

- Vue 3 + TypeScript + Vite + TailwindCSS 3 独立工具链，`npm run build` 含 `vue-tsc` 类型检查
- 真实 `@halo-dev/components@2.27.0` 主题与组件：按钮、卡片、页头、实体列表、分页、筛选、状态点、标签、弹层（Modal）、Alert、Tabs、描述列表、开关、Toast、下拉菜单
- 控制台骨架：固定 16rem 侧栏、菜单分组、主内容区与页脚
- 从业务源码迁入的 `VFilterDropdown` / `VFilterDropdownGroup`（见下方「版本差异」）
- 本地 Mock 数据层：搜索、状态/可见性/分类/标签/作者筛选、排序、分页、发布、删除均可交互
- 文章列表筛选标签：可关闭标签、清除全部、筛选无结果空态、筛选变化回到第 1 页、URL query 同步
- 迁入真实筛选控件：分类 / 标签 / 作者下拉（源码见 `src/components/filter/`），搜索框按 Enter 提交

## 尚未纳入的能力

- 登录、权限（`v-permission`、`useUserPermissions`）、全局搜索、UI 插件运行时
- 后端接口（`@halo-dev/api-client`）与 `@tanstack/vue-query` 数据层（本地以 Promise 适配替代）
- 文章编辑器（富文本）、分类/标签/回收站管理页、批量操作
- 移动端菜单、国际化（vue-i18n）、FormKit 表单与校验
- 用户中心（`uc-src`）与主题渲染
- 非 npm 发布的私有组件/组合式函数（`@halo-dev/console-shared`、`ui-shared`、`api-client`）

## 版本差异与兼容策略

- 仓库 `ui/` 内组件包版本为未发布的 **2.28.0**，npm latest 为 **2.27.0**。工程使用 2.27.0，不整体升级。
- 2.27.0 缺少 `VFilterDropdown` / `VFilterDropdownGroup` 与其 `IconCheck` 导出：按基线源码迁入 `src/components/halo/filter/`，图标内联替代。上游发包后可直接换回 `@halo-dev/components` 导入并删除该目录。
- 其余组件均直接使用 npm 包，未做视觉替换。

## 新增业务页面步骤

1. 在 `src/views/` 新建页面，参考相邻真实页面与 `PostListView.vue` 的组合方式。
2. 若依赖新的共享组件/组合式函数，从 `ui/packages/components` 或 `ui/src` 迁入必要闭包，并在 `prototype-map.json` 的 `sources` 中登记来源路径、revision 与适配原因。
3. 在 `src/router/index.ts` 增加路由，在 `src/layouts/BasicLayout.vue` 菜单中增加条目。
4. 数据走 `src/mock/`，业务行为与演示适配分离，便于后续研发回填。
