# 需求 ↔ 用例矩阵（文章收藏）

来源：`artifacts/Spec 设计/需求Spec/spec.md`（v1，SPEC-POST-FAVORITE-001，REQ-001～REQ-006）、产品设计文档、代码 commit `caeb05108`。
层级：**前端 E2E**（`ui/`，真实浏览器 + 真实后端）与 **后端 API E2E**（`api/`，真实服务，不 mock 认证/权限）。

> 选择器口径：role / `aria-label` / `aria-pressed` / 可见文案（读取 `ui/src/locales/zh-CN.json`）/ URL 参数，不依赖 Tailwind 类名（Spec 明确要求尺寸与位置时除外）。

## REQ-001 行内收藏 / 取消收藏（P0）

| Spec 验收点 | 用例 | 层级 |
| --- | --- | --- |
| 点击空心→实心，刷新后保持；再次点击恢复并持久化 | `ui/favorite.spec.ts` › 点击空心星标变为实心… | 前端 E2E |
| 不打开编辑器、不跳转标题、不改变复选框 | `ui/favorite.spec.ts` › 点击星标不打开编辑器… | 前端 E2E |
| 成功不弹 Toast | `ui/favorite.spec.ts` › 操作成功不弹 Toast | 前端 E2E |
| 处理中禁止重复提交、保持目标态 `opacity-60` `cursor-wait` | `ui/favorite.spec.ts` › 请求处理中星标… | 前端 E2E |
| 失败回滚 + 「操作失败，请重试」 | `ui/favorite.spec.ts` › 请求失败时星标回滚…；`异常与生命周期` › 收藏失败后…再次成功 | 前端 E2E |
| 快速连点 / 并发只产生一条关系 | `api/concurrency.spec.ts` › 并发收藏同一文章；并发取消收藏 | 后端 API E2E |
| 仅 `system:posts:view` 可收藏，不要求 manage | `api/favorite-contract.spec.ts` › 仅有 system:posts:view 的账号…；`ui/favorite.spec.ts` › view-only 账号可以收藏 | 两层 |
| 接口 204 幂等、收藏状态回写列表 | `api/favorite-contract.spec.ts` › 收藏后列表返回 favorite=true…；重复收藏与重复取消均为幂等 | 后端 API E2E |

## REQ-002 收藏状态展示（P0）

| Spec 验收点 | 用例 | 层级 |
| --- | --- | --- |
| 实心 `primary` / 空心 `gray-300`，常显 | `ui/accessibility.spec.ts` › 星标可聚焦…（图标/尺寸契约）；`ui/favorite.spec.ts` 各条 `aria-pressed` 断言 | 静态 + 前端 E2E |
| tooltip / `aria-label` 随状态变化 | `ui/favorite.spec.ts` › 星标可聚焦并可键盘触发… | 前端 E2E |
| 14×14 图标、约 22×22 热区 | `ui/favorite.spec.ts` › 星标尺寸 14px、点击热区约 22px… | 前端 E2E |
| 位于标题 extra、状态点与外链之前，不新增列/行高不变 | `ui/accessibility.spec.ts` › 星标位于标题 extra 区域…；`ui/favorite.spec.ts` › 星标尺寸…（同一行内定位） | 静态 + 前端 E2E |
| Tab 可聚焦、Enter/Space 触发、2px outline | `ui/favorite.spec.ts` › 星标可聚焦并可键盘触发…；`ui/accessibility.spec.ts`（outline-primary、outline-2） | 前端 E2E + 静态 |
| `aria-pressed`，不只靠颜色 | 同上 | 前端 E2E |
| 处理中 / 失败回滚 | 见 REQ-001 | 前端 E2E |

## REQ-003 收藏状态筛选（P0）

| Spec 验收点 | 用例 | 层级 |
| --- | --- | --- |
| 位置：可见性之后、分类之前；标签「收藏」；全部=清除 | `ui/accessibility.spec.ts` › 筛选区顺序…；`ui/favorite.spec.ts` › 「已收藏」仅展示本人…（`全部`） | 静态 + 前端 E2E |
| 「已收藏」/「未收藏」结果正确 | `ui/favorite.spec.ts` › 「已收藏」仅展示本人…；`api/favorite-contract.spec.ts` › favorite=true/false 与服务端分页… | 两层 |
| 与状态筛选等组合为「且」 | `ui/favorite.spec.ts` › 收藏筛选与状态筛选为且关系；`api/favorite-contract.spec.ts` › favorite 组合其它筛选… | 两层 |
| total / hasNext / hasPrevious 与过滤结果一致 | `api/favorite-contract.spec.ts` › favorite=true/false 与服务端分页… | 后端 API E2E |
| 切换筛选回第 1 页、写 URL、刷新/前进后退保持 | `ui/favorite.spec.ts` › 切换收藏筛选回到第 1 页… | 前端 E2E |
| 「已收藏」下取消：行移除、总数 −1、切回全部重现 | `ui/favorite.spec.ts` › 「已收藏」下取消收藏… | 前端 E2E |
| 「未收藏」下收藏：行移除、总数 −1、切回全部重现 | `ui/favorite.spec.ts` › 「未收藏」下收藏… | 前端 E2E |
| 「全部」下仅图标变化、不重排 | `ui/favorite.spec.ts` › 「全部」下收藏不改变行位置与排序 | 前端 E2E |
| 同链接分享但结果按访问者本人计算 | `ui/favorite.spec.ts` › 双账号隔离；`api/favorite-contract.spec.ts` › A 的收藏对 B 不可见 | 两层 |

## REQ-004 个人维度与权限隔离（P0）

| Spec 验收点 | 用例 | 层级 |
| --- | --- | --- |
| A 收藏后 B 未见、不可影响 | `api/favorite-contract.spec.ts` › A 的收藏对 B 不可见…；`ui/favorite.spec.ts` › A 收藏后 B 看到未收藏 | 两层 |
| 同用户同文章唯一、重复收藏幂等 | `api/favorite-contract.spec.ts` › 重复收藏与重复取消均为幂等；`api/concurrency.spec.ts` › 并发收藏 | 后端 API E2E |
| 忽略/拒绝客户端用户标识（IDOR） | `api/favorite-contract.spec.ts` › 接口忽略客户端传入的用户名/用户 ID 参数 | 后端 API E2E |
| 无 `system:posts:view` 访问收藏接口 403 | `api/favorite-contract.spec.ts` › 无 system:posts:view 的账号… | 后端 API E2E |
| 未登录/会话失效不产生记录 | `api/favorite-contract.spec.ts` › 匿名请求不产生收藏记录 | 后端 API E2E |
| 收藏不授予编辑/发布/删除 | `api/favorite-contract.spec.ts` › 仅有 system:posts:view 的账号…；`ui/favorite.spec.ts` › view-only 账号…不提供编辑入口 | 两层 |
| 权限被回收后历史收藏保留 | **未覆盖**：需要角色回收 + 重新授予的双阶段编排，当前实现没有 UI 入口；建议在下游补充（见下「非 E2E / 未覆盖」） | — |

## REQ-005 空态与异常反馈（P1）

| Spec 验收点 | 用例 | 层级 |
| --- | --- | --- |
| 「已收藏」空态文案 + 「查看全部文章」 | `ui/favorite.spec.ts` › 「已收藏」空态展示专用文案… | 前端 E2E |
| 「未收藏」空态文案 | `ui/favorite.spec.ts` › 「未收藏」空态展示专用文案 | 前端 E2E |
| 「查看全部文章」只清除收藏筛选并回第 1 页 | `ui/favorite.spec.ts` › 「已收藏」空态…（断言 keyword 保留） | 前端 E2E |
| 收藏失败回滚 + 提示 | 见 REQ-001 | 前端 E2E |
| 原有通用空态、回收站空态与加载态不变 | `ui/favorite.spec.ts` › 文章列表为空时沿用通用空态…；`回收站无收藏入口（回收站页面本身也保持原样）` | 前端 E2E |
| 当前页变空但总数 > 0 时回退到最后一个有效页 | `ui/favorite.spec.ts` › 当前页因取消收藏变空… | 前端 E2E |

## REQ-006 生命周期与数据一致性（P0）

| Spec 验收点 | 用例 | 层级 |
| --- | --- | --- |
| 草稿/未发布/私有/已发布均可收藏，范围与列表一致 | `api/favorite-contract.spec.ts` › 草稿、未发布、私有与已发布文章均可收藏 | 后端 API E2E |
| 回收站无入口；移入后不出现在「已收藏」 | `ui/favorite.spec.ts` › 回收站无收藏入口…；`api/favorite-contract.spec.ts` › favorite 组合…始终排除回收站 | 两层 |
| 恢复后重新出现且仍为已收藏 | `ui/favorite.spec.ts` › 回收站无收藏入口…（restore 后可见）；API 同上 | 两层 |
| 永久删除后关系清理 | `api/favorite-contract.spec.ts` › 永久删除文章后收藏关系被清理 | 后端 API E2E |
| 删除中（`spec.deleted=true`）不展示可操作星标 | `ui/accessibility.spec.ts` › 星标可聚焦…（`v-if="!post.post.spec.deleted"`）；回收站用例验证回收站页面无星标 | 静态 + 前端 E2E |
| 轮询不回跳 | `ui/favorite.spec.ts` › 轮询刷新不会把已成功的收藏状态回跳 | 前端 E2E |
| 不改变文章字段、排序、权限视图 | `api/concurrency.spec.ts` › 收藏不修改文章自身的任何字段 | 后端 API E2E |

## 兼容与质量（§5.1 / §6）

| 验收点 | 用例 | 层级 |
| --- | --- | --- |
| 用户中心响应不含 `favorite` | `api/favorite-contract.spec.ts` › 用户中心「我的文章」响应不包含 favorite 字段 | 后端 API E2E |
| OpenAPI 生成物包含 favorite 契约、未泄漏 | `api/favorite-contract.spec.ts` › OpenAPI 生成物包含 favorite 契约… | 契约静态检查（读生成物） |
| 4 语言文案完整、无裸露 key | `ui/i18n.spec.ts` | 静态 |
| 非法 `favorite` 值 400、缺省与显式等价 | `api/favorite-contract.spec.ts` › 非法 favorite 值返回 4xx… | 后端 API E2E |
| 键盘可访问、`aria-pressed` | 见 REQ-002 | 前端 E2E |

## 非 E2E 覆盖项 / 未覆盖项

| 项 | 原因 | 建议责任方 |
| --- | --- | --- |
| 100 条/页响应时间、无 N+1 查询 | 性能基准与慢查询属于 NFR/性能专项，E2E 不替代 | 性能评审（`nfr-performance`） |
| 代码级无阻塞 I/O、清理链路实现方式 | 代码 Review 范畴 | 代码评审 |
| 视觉像素比对（颜色值、hover 加深、focus ring 具体形态） | 几何与 token 已做契约断言，像素级差异属视觉走查 | 前端/设计 |
| 权限回收后历史收藏保留 | 需要多阶段角色编排；当前无 UI 入口 | 后续补集成测试 |
| `zh-TW`/`es` 运行时渲染走查 | 断言了文案文件完整性，浏览器仅走 `zh-CN` | 发布走查 |
| 主题渲染、公开 API、插件回归 | 本套用例只覆盖控制台；由既有回归流水线覆盖 | CI 回归 |

## 数据与清理

- 所有文章名以 `e2e-fav-` 开头，按测试随机 scope 生成，互不干扰；每个用例通过列表 `keyword` 限定在自己 scope 内。
- 账号按 scope 创建（`*-viewer` / `*-manager` / `*-plain`），不修改内置管理员以外的角色模板。
- 实例运行在 `build/.e2e-runtime`（含 H2 库与工作目录），删除该目录即可得到干净环境。
