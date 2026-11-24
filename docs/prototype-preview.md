# Halo 原型开发与预览指南

## 基座身份与范围

- 仓库：`DawnGuoDev/halo`；长期分支：`improvement/prototype-preview`。
- 应用：`ui`；机器配置：`.prototype/ui/profile.json`；可同步的定位记录：`.prototype/registry.json`。
- 基线主干：`main@f6c046cc27e2b5d61367b85792b6cd51bd9101f1`。
- 限定页面：真实 `ui/console-src/modules/contents/posts/PostList.vue`，内存路由 `/posts`。
- 演示：3 篇文章，关键词“原型”+ Enter 后显示 1 篇。其他页面、写入及全站接口未覆盖。
- 后续需求从这个分支的已验证提交派生，不直接堆到长期基座；不新增替代文章列表。

以下命令均从仓库根目录执行，不需要后端、数据库、JDK 或全栈启动。

## 新沙箱准备

前置：环境已有的 Python 3（安全解压按能力选择实现，不要求安装 Python 3.12）、POSIX shell、Git、访问 Node 官方及 npm 官方源的 HTTPS 网络。支持的工具下载目标为 macOS/Linux 的 arm64/x64；本轮实测为 macOS arm64。Linux 沙箱恢复须在平台实际验证，不能把本地结果当 Linux 已通过。

```bash
# 先静态检查配方/cwd/安装叶子；不安装、不改 PATH
python3 scripts/prototype/preflight.py

# 准备工具并按冻结锁安装；成功返回 0
bash scripts/prototype/setup.sh

# 只检查工具实际版本及配方，不安装依赖
bash scripts/prototype/setup.sh --check
```

Node 约束只读取 `ui/package.json` 的 `engines.node`；优先复用 PATH 或预览缓存中满足范围的实际 Node，不额外锁补丁版本。仅缺少兼容版本时，setup 从官方发布索引选择满足范围的 LTS 并校验下载。pnpm 精确版本来自仓库 `packageManager`（当前 12.4.2），不是预览工具另定的版本。实际工具路径和版本保存在忽略目录的选择记录与环境回执，不能当通用最低版本。

工具保存在忽略的 `.prototype/tools/`，Node/pnpm 缓存按版本、OS、架构隔离。可通过 `PROTOTYPE_TOOLS_DIR` 指定独立缓存。Node 压缩包使用官方 SHA256 校验；pnpm npm 包使用官方元数据 SHA512，官方 pnpm JS 引导器负责首次取得其原生二进制。所有下载只发生在 `prepare/setup`，`check/run/build/browser` 不下载工具。已有 pnpm 通过实际版本探测后可复用（check/run 禁止 Corepack 网络下载）；不读取 Corepack 私人缓存结构，不修改用户全局 Node、pnpm 或 shell 配置。

新目录缺工具时需执行 setup。工具与依赖存在时 setup 可安全重跑，pnpm 按 frozen lock 复用，不能把历史环境回执当当前成功。`--check` 的 `tools-ready` 仅证明运行时，不证明依赖、构建或浏览器已通过。工具下载有超时及字节进度；setup 应直接输出到执行工具，勿整段重定向后等待结束才读。依赖安装有总超时/静默超时，日志在 `.workbench/environment/`；失败保留错误，不反复换安装方式。

### 安装调用关系

`setup.sh → runtime.py prepare → environment.py run → ui.sh install --frozen-lockfile`。

配方 root 相对配方文件，app 相对仓库根；runner 的 probes/install cwd 是 `ui/`。install 仅调用 `../scripts/prototype/ui.sh` 这一安装叶子，不得回调 setup 或 runner。`preflight.py` 验证本仓库固定调用契约和 probe 文件路径，不声称能分析任意 shell 脚本调用环。

## 固定检查、构建和浏览器命令

平台须分别提供 `prototype-workbench` Skill；当前配置实测版本为 **5.9.0**。填写实际安装根目录，不能猜旧 Session 路径：

```bash
export PROTOTYPE_WORKBENCH=/实际路径/prototype-workbench

# 预览相关类型、ESLint、Mock 单元测试；不编译业务包
# 首次运行须先 build，让必要 workspace 声明文件存在
python3 scripts/prototype/preview.py check

# 配置预检 → 必要 workspace → 预览类型/ESLint → 原生编译 → 自包含导出
python3 scripts/prototype/preview.py build

# 必须已有当前有效构建；不会自动重建或下载浏览器
python3 scripts/prototype/preview.py browser
```

首次请先执行 `build` 再执行独立 `check`。build 已将预览类型和 ESLint 放在入口编译前，`check` 额外执行 Mock 单测。它们是限定原型验证，不能替代需求代码所触发的仓库全量 typecheck/lint/test 规则。

输出为 `.prototype/ui/output/final/index.html`，默认自包含；原生入口为 `.prototype/ui/output/native/prototype/preview/post-list.html`。不得更名入口后靠临时环境变量碰运气。原生/最终配置分别为 `native.json`/`final.json`。业务、Mock 尚未分层，源码变化要重建；`--ensure` 只复用输入与输出指纹匹配的构建。

浏览器优先使用已安装 Playwright；否则使用共享 CDP 适配器，二者都不是重新研发的对象。显式选择示例：

```bash
python3 scripts/prototype/preview.py browser --adapter playwright \
  --playwright-module /已安装/playwright/index.mjs --executable /实际路径/chrome
python3 scripts/prototype/preview.py browser --adapter cdp --executable /实际路径/chromium
```

也可设置 `PROTOTYPE_BROWSER`、`PROTOTYPE_PLAYWRIGHT_MODULE`。未传可执行文件时仅探测现有 Chrome/Chromium（包括 macOS Chrome），不下载。适配器生成并核对真实网页及 `srcdoc + sandbox=allow-scripts`、`origin=null` 的业务步骤报告；报告在 `.workbench/browser/` 或 `.workbench/browser-cdp/`。本地等价 iframe 不是平台实际验收。

## 实现与交接

1. 核对干净工作区和远端基座；已有未提交改动不要直接切换或覆盖。
2. 从确认的基座提交创建符合仓库规则的 `feat/<需求>` 分支。
3. 修改真实页面/引用模块，复用主题和组件；在 `ui/prototype/mock/post-list.ts` 按调用链补最小数据。普通模式不加载 Mock，未覆盖请求显式失败。
4. 修改后使用固定 build/check/browser 入口。保留构建输入和输出证据，源变则重建，selector/文档变化不重复业务编译。
5. 按平台协议只发布已验收入口原字节及可编辑源码材料，回读核对。每用途保持一个最新有效记录，不因同名而假定更新了旧 ID。
6. 业务代码和预览适配分开审查，Mock、演示身份和宿主不得直接合入生产主干。基座修复另行验证回合长期分支。

工具、包管理器或导出器失效时，保存版本、命令、退出码、原始错误和最后有效结果，转基座维护；不要研究 Corepack 内部实现、复制修改 CDP 客户端或在产品设计节点造新打包器。

## 初始化专用自检

仅初始化/基座维护时使用 `prototype-repo-bootstrap@0.9.0` 的完整改码重建自检；普通需求不要每次重做。

入库计划 `.prototype/ui/selfcheck-plan.json` 记录初始化历史基线与 Linux 浏览器路径。执行者须先生成忽略目录中的本轮计划，填实际仓库、当前 HEAD、浏览器可执行文件；保持原始计划及来源，不直接把旧 revision 当当前。`node` 必须使用托管工具的 PATH。先按脚本 `--help` 和 schema 预检，再执行一次完整自检；不要仅为修改文档重跑此矩阵。

业务改码标记来自真实语言依赖中的分页文案，不是宿主横幅；恢复后重新构建。执行范围、源码哈希、原始报告与截图应以可获取证据交付，最终 HEAD/发布回执留包外。

## 定位与维护

`.prototype/registry.json` 和本指南位于预览分支，主干未增加定位入口。平台须把该登记同步为空间仓库上下文或保存预览分支关联；仅在预览分支放文件不能保证从主干自动发现。找不到已知基座时应询问，不能直接重新初始化。

排障见 [prototype-troubleshooting.md](prototype-troubleshooting.md)。未改生产启动入口、构建配置、鉴权或后端契约。

维护自检会使用临时配置并改写本地构建状态；自检结束后，再执行一次固定 `preview.py build` 和 `browser`，恢复正常配置的门禁与报告，不拿临时配置的 sourceHash 冒充正常候选。
