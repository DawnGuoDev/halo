# 原型预览排障记录

## 1. Mock adapter 未读取 URL query 关键词

- **适用版本**：prototype-repo-bootstrap 0.9.0, prototype-workbench 5.8.1
- **症状**：首次预览构建后，搜索框输入关键词并按 Enter，文章列表行数未变化。
- **根因**：首版 Mock adapter 只读取 `config.params`，但真实 `consoleApiClient.content.post.listPosts` 将 keyword 拼进 URL query string（`config.url`），adapter 未解析 URL query。
- **修正**：修改 `ui/prototype/mock/post-list.ts` 中的 `postListPreviewAdapter`，先使用 `new URL(config.url)` 解析 `URLSearchParams` 提取 URL query 参数，再用 `Object.assign` 合并 `config.params`，确保两种传参方式都能被读取。
- **复验**：`ui/prototype/mock/post-list.spec.ts` 单测通过真实 `consoleApiClient.content.post.listPosts({keyword:"原型"})` 验证 3→1 过滤。

## 2. rebuild 验收把 Vue 属性表达式当 DOM 文本断言

- **适用版本**：同上
- **症状**：run-002 changed-browser 失败（Condition timeout），但 `readyText` 已正确显示"Halo 文章（重建验证）"。
- **根因**：selfcheck plan 的 `rebuild.after` 使用了整段 Vue 属性表达式 `:title="'Halo 文章（重建验证）'"` 作为断言文本，而浏览器工具将其与 DOM 可见文字比较，两者不等。这是验收计划/工具契约问题，不是业务页面缺陷。
- **修正**：将 rebuild 标记改为真实业务依赖 `ui/src/locales/zh-CN.json` 中分页总文案"共 {total} 项数据"→"Halo 文章（重建验证）"，selector 改为 `.pagination__total`。
- **复验**：run-003-v2 rebuild passed，changed 构建成功且 `.pagination__total` DOM 文本显示新文案。

## 3. 429 模型限流导致任务中断

- **适用版本**：运行时问题，与工程无关
- **症状**：子 Agent Turn 以 `acp_request_failed` (429 Too Many Requests) 失败。
- **根因**：模型服务限流，不是工程或构建失败。
- **处理**：根 Agent 在原任务和授权内接管，复用同一工作区完成剩余自检和交付。不新建会话或重装依赖。

## 4. provide/inject 隔离机制说明

- 预览入口 `ui/prototype/preview/main.ts` 通过 `app.provide("haloPrototypePreview", true)` 向整个预览应用注入标记。
- 业务页面 `PostList.vue` 和 `TitleField.vue` 通过 `inject("haloPrototypePreview", false)` 读取标记，默认值为 `false`（生产模式下不注入，保持原有行为）。
- 当标记为 `true`（预览模式）时，禁用写操作相关 UI：PostList 的设置弹层 actions、TitleField 的编辑路由/extra/description。

## 4. 新沙箱的 Node 与 Corepack 入口不一致

- 现象：初始化历史为 Node 24，但新沙箱默认 Node 22；Corepack shim 与 pnpm 新版本的 native bin 入口可能不匹配。
- 本分支处理：`runtime.py prepare` 从官方源校验取得独立 Node，pnpm 版本读取 packageManager，使用官方包的引导器准备原生入口。`ui.sh` 此后只运行这套已准备工具，不在构建/验收时下载或猜 Corepack 内部路径。
- `setup --check` 不安装依赖；实际冻结锁安装与回执由 setup 的正常模式完成。不要为写回执反复安装。
- 实测范围：macOS arm64，本轮初次工具下载/冻结锁安装及重复准备；Linux 下载分支尚需实际沙箱验证，不以历史 Linux 回执冒充。

## 5. 配方 cwd 与递归安装

- root 相对 `.prototype/ui/environment.json`，app=ui；probes/install 均在 ui 下执行，因此脚本路径用 `../scripts/...`。
- 所有 probe 逐个必过，不是多路径 fallback。install 指向 setup 会递归，必须指向 ui.sh 安装叶子。
- `preflight.py` 对本仓库已审阅配方执行结构门禁；单元测试覆盖错误 cwd、递归 setup 拒绝、缺工具只读检查和压缩包越界拒绝。

## 6. 浏览器适配器与类型检查

- `preview.py build` 先检查预览 vue-tsc 和 ESLint，再编译/装配；转译成功不代表类型正确。
- `preview.py browser` 先 verify 当前构建，再选择现成 Playwright 或共享 CDP。没有浏览器就明确失败，不新造客户端。
- hover/portal 导致一次点击未生效，先保留用例与原始结果做对照，不能直接归因 CDP。临时驱动的 WebSocket/contextId 错误不等于业务页面有缺陷，工具问题转维护。

## 工具实测版本不能变成额外环境门槛（2026-11-24）

- 症状：业务节点从主干开始调查 Corepack 私有缓存，人工提供预览分支后才读取已有指南；setup 全量重定向使网页看不到下载阶段。另有 Python 3.12+ 文档要求，来自辅助解压 API，而非前端工程。
- 修正：Node 仅遵守 ui/package.json 的 engines；复用 PATH/缓存中的兼容 Node，不另锁补丁版本。pnpm 仍严格遵循仓库 packageManager。缺工具才获取官方兼容版本；保存实际选择而非新增版本约束。下载输出字节进度并限时，setup 不要整段隐藏输出。
- 安全解压按能力选择 tarfile.data_filter；旧 Python 的实现先校验全归档路径、链接和文件类型，再解压。不能通过去掉路径保护兼容旧环境。
- 复验：现有 Python 3.9.6 与当前 Python 均通过 7 项回归；setup 冻结锁安装、前端 scoped checks/build、导出与浏览器报告以本轮 evidence 为准。Linux 下载恢复仍须在实际沙箱验证。
- 使用：`python3 -m unittest discover -s scripts/prototype -p test_runtime.py`；`bash scripts/prototype/setup.sh`；依指南运行 build 和 browser。
- 关联仍需平台同步：registry 位于预览分支，不自动使主干发现分支。给产品设计节点投递仓库/应用/预览分支/profile 与验证提交；缺少关联不应重新造基座。
