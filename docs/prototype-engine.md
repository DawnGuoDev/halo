# 原型工程说明

原型任务开始前先读取本说明，复用已准备的独立前端工程，再按需求增量实现。
原型源码保存在原型分支；`main` 仅保存本登记，不包含原型工程或构建产物。

## 工程位置与基线

| 项目 | 当前记录 |
| --- | --- |
| 仓库 | `DawnGuoDev/halo` |
| 关联远端 | `origin`：`git@github.com:DawnGuoDev/halo.git` |
| 登记所在基准分支 | `main` |
| 原型分支 | `prototype-preview` |
| 工程目录 | `prototype-preview/`，相对原型分支根目录 |
| 已有验收记录对应提交 | `03753dacd155d67b5c1fa44de0796509b70c1bcf`（文章信息速览修正与复验；其前 `350b845c1` 为速览首版、`1a64e4f65` 为筛选标签） |
| 初始基座提交 | `f05f3721afa84a8b598c013a2d8e1317896b4666` |
| 业务来源基线 | `main@f6c046cc27e2b5d61367b85792b6cd51bd9101f1` |
| 登记日期 | 2026-11-26（2026-11-26 更新：文章信息速览修正与复验） |

原型分支后续可能继续更新，最新 HEAD 不自动代表已经验证。
复用时核对远端、上述提交和本次涉及的业务源码变化；不要把原型源码指针当作最新业务基线。

## 获取与预览

在隔离 worktree 中使用原型工程，保留当前业务工作区及用户改动：

```bash
git ls-remote --heads origin prototype-preview
git fetch origin prototype-preview
# 目录已存在时先检查并复用，不覆盖；可按实际情况另选目录。
git worktree add --detach ../halo-prototype-preview 350b845c1825ee9963f61ff1761db82a33f69371
cd ../halo-prototype-preview/prototype-preview
npm ci
npm run build
npm run preview
```

构建成功后打开 `http://localhost:4173/#/posts`；组件示例为 `/#/demo`。
开发服务使用 `npm run dev`（端口 5173）。工程使用 Vue、TypeScript、Vite、Tailwind，
运行依赖 `@halo-dev/components@2.27.0`，部分筛选组件由业务仓库 2.28.0 源码迁入。
依赖和命令以指定提交的 `package.json`、锁文件及工程 README 为准。

只安装独立工程依赖，使用前端本地 Mock；不需要启动 Halo 后端、数据库、容器，
也不需要执行业务根工程的 Gradle 或完整前端构建。
需要持续写代码时，按任务分支约定建立普通分支，不将成果仅留在 detached 工作区。

## 复用资料与验收范围

以下路径均相对原型工程目录：

- `README.md`：启动方式、页面入口、能力及版本差异。
- `prototype-map.json`：源码迁移映射、业务来源提交和适配边界。
- `integration-guide.md`：业务回填、Mock 替换及接口接续说明。
- `design-notes.md`：已有验收结论与限制。
- `preview.json`：正式验收配置；工具调用参照工程说明和当前辅助 Skill。
- `src/mock/`：前端本地数据入口；`src/router/index.ts`：原型路由。

该提交的 `design-notes.md` 记录：构建通过（`npm run build` 含 vue-tsc）；1440×900 下 16 个场景通过
（文章列表筛选 7 个 + 速览功能与回归 9 个），并完成可见性、分类和作者下拉的代表性浮层抽查，
无运行错误或失败请求。本轮（速览修正）新增：抽屉仅在查看时渲染（`v-if`，关闭即卸载）、抽屉内
Esc 立即关闭、点击遮罩不关闭、`INTERNAL` 显示「内部」、草稿文案与列表统一为「未发布」、
「速览」入口始终可见。原型验证入口 `/#/posts`，编辑器占位路由 `/#/posts/edit`。
验收配置为 `preview.json`；`.prototype-evidence/` 回执未随该提交收录，需要复查时按配置执行
`preview.py build` + `browser.mjs`。平台原型制品与本次源码同源，发布 ID 记在节点交付记录中。

已知限制：采用独立外壳和本地 Mock；搜索框等存在适配，不能视作完整业务源码直搬。
速览抽屉的右侧定位为局部 CSS（业务建议由组件新增 placement 替代）；编辑器为占位页；
未模拟文章编辑权限与「发布中」真实轮询；分类/标签超长换行（PRD D-01）未专项验收。
批量操作、设置表单及英文视觉未纳入本次业务验收；国际化、组件版本与回填差异
应继续参考工程内说明，新增需求仍须读取目标业务页面源码。

## 后续维护

新增或迭代需求优先从已有工程增量实现，不重新创建一套依赖和预览基座。
记录失效或远端访问失败时报告具体缺口，不能当作工程不存在而直接初始化。
验证并保存新的原型提交后，同步更新 `main` 上本登记的指针、范围和限制；
文档改动单独提交，不将原型工程整体合入 `main`，也不因更新登记重复构建或发布原型。
