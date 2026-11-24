# Halo 原型开发与预览指南

## 概述

本指南描述如何在 Halo 仓库 `ui` 前端工程中使用已初始化的原型预览基座。新沙箱无需旧 Session 文件即可照此操作。

- **仓库**：`DawnGuoDev/halo`
- **长期预览分支**：`improvement/prototype-preview`
- **基线主干**：`main` @ `f6c046cc`
- **限定页面**：`ui/console-src/modules/contents/posts/PostList.vue`（路由 `/posts`）
- **关键操作**：输入关键词"原型"并按 Enter，文章列表从 3 条过滤为 1 条（"Halo 原型初始化指南"）
- **不覆盖**：文章编辑、设置、批量操作、分类/标签管理及其他页面

## 配套 Skill

| Skill | 版本 | 用途 |
|---|---|---|
| prototype-repo-bootstrap | 0.9.0 | 仓库原型初始化、自检和交付 |
| prototype-workbench | 5.8.1 | 构建配置、浏览器验收和导出 |

两个 Skill 分别打包，由平台注入运行时工作区。执行时通过环境变量传递实际路径：

```bash
export BOOTSTRAP=<prototype-repo-bootstrap skill 根路径>
export WORKBENCH=<prototype-workbench skill 根路径>
```

## 环境准备

**前置条件**：POSIX shell、Python 3、Git、Corepack 兼容的 Node.js。

```bash
# 从仓库根目录执行
# 1. 确认 Node.js 版本满足 ui/package.json engines 要求
node --version   # 实测 v24.22.3

# 2. 确认 pnpm 版本
corepack pnpm --version  # 实测 12.4.2

# 3. 冻结锁安装（在 ui/ 目录）
cd ui/
corepack pnpm install --frozen-lockfile
cd ..
```

环境配方见 `.prototype/ui/environment.json`，安装回执见 `.prototype/ui/evidence/environment.json`。
新沙箱须重新执行同一配方，不可直接沿用旧 `node_modules`。

也可使用自动化脚本：`scripts/prototype/setup.sh`。

## 构建预览包

所有命令从**仓库根目录**执行。

### A 阶段：原生构建

```bash
export PATH="<node bin>:$PATH"

# 校验配置（不编译）
python3 "$WORKBENCH/scripts/build.py" .prototype/ui/native.json --validate

# 执行构建
python3 "$WORKBENCH/scripts/build.py" .prototype/ui/native.json
```

产物位于 `.prototype/ui/output/native/prototype/preview/post-list.html`。

### B 阶段：自包含导出

```bash
# 校验配置
python3 "$WORKBENCH/scripts/build.py" .prototype/ui/final.json --validate

# 执行构建（含 checks 编译 + build 装配）
python3 "$WORKBENCH/scripts/build.py" .prototype/ui/final.json
```

产物位于 `.prototype/ui/output/final/index.html`（自包含 HTML）。

**构建说明**：当前配置中 `final.json` 的 `checks` 会编译共享包（api-client/components/ui-shared）和预览入口，`build` 调用 `scripts/prototype/export.sh` 装配自包含 HTML。仅改 Mock 数据也需要完整重建，因为 Mock 代码在预览入口编译中被打包；不存在分层缓存跳过业务编译的机制。

## 浏览器验收

```bash
# standalone + iframe-srcdoc（origin=null, sandbox=allow-scripts）
node "$WORKBENCH/scripts/browser-cdp.mjs" .prototype/ui/final.json \
  --executable /usr/bin/chromium-browser
```

验收场景（定义在 `final.json` 的 `browser.scenarios`）：
1. 页面加载后 `tr.entity-wrapper` 行数为 3
2. 在 `input[name=keyword]` 输入"原型"并按 Enter
3. 行数变为 1，文本包含"Halo 原型初始化指南"

## 内置自检

自检计划已入库：`.prototype/ui/selfcheck-plan.json`。

```bash
# 预检（不构建、不启动浏览器、不改源码）
python3 "$BOOTSTRAP/scripts/selfcheck.py" --validate-only \
  --plan .prototype/ui/selfcheck-plan.json \
  --workbench "$WORKBENCH" \
  --out <仓库外输出目录>

# 正式运行（构建+浏览器+改码重建+恢复复验）
python3 "$BOOTSTRAP/scripts/selfcheck.py" \
  --plan .prototype/ui/selfcheck-plan.json \
  --workbench "$WORKBENCH" \
  --out <仓库外输出目录>
```

**注意**：`--out` 必须指向仓库外或 `.gitignore` 忽略的目录（如 `.workbench/`），不可在 Git 跟踪目录内。

改码标记说明：rebuild 标记来自真实业务依赖 `ui/src/locales/zh-CN.json` 的分页总文案"共 {total} 项数据"→"Halo 文章（重建验证）"，selector `.pagination__total`。自检完成后源码自动恢复。

## 预览架构

```
ui/prototype/
├── preview/
│   ├── main.ts          # 薄宿主入口：createApp + memoryRouter + PostList
│   ├── PreviewApp.vue   # 预览根组件
│   ├── post-list.html   # HTML 入口
│   └── vite.config.ts   # Vite 预览配置（mode=prototype）
├── mock/
│   ├── post-list.ts     # 内存 Mock：3 篇文章 + 分类 + 标签
│   └── post-list.spec.ts  # 单元测试
└── tsconfig.json
```

### 生产隔离机制

- 预览入口 `main.ts` 通过 `app.provide("haloPrototypePreview", true)` 注入标记
- 业务页面通过 `inject("haloPrototypePreview", false)` 读取，默认 `false`（生产模式不注入，保持原有行为）
- 标记为 `true` 时禁用：PostList 设置弹层 actions、TitleField 编辑路由/extra/description
- Mock 通过 `axiosInstance.defaults.adapter` 拦截请求，仅匹配文章列表/分类树/标签，未匹配请求显式失败
- 演示身份仅授予 `system:posts:view` 只读权限

### Mock adapter 工作方式

`postListPreviewAdapter` 解析请求 URL 和 params：
1. 使用 `new URL(config.url)` 解析 URL query 参数（`URLSearchParams`）
2. 合并 `config.params`（`Object.assign`）
3. 按路径匹配返回内存数据

这是因为真实 `consoleApiClient` 会将 keyword 拼进 URL query string，而非仅通过 `config.params` 传递。

## 后续需求开发步骤

### 1. 从预览分支创建需求分支

```bash
git checkout improvement/prototype-preview
git pull origin improvement/prototype-preview
git checkout -b feature/your-feature
```

### 2. 就地修改既有页面

直接修改 `ui/console-src/modules/contents/posts/PostList.vue` 或相关组件。不要新建近似页面替代真实页面修改。

### 3. 按调用链扩展最小前端 Mock

如果新交互需要额外数据，在 `ui/prototype/mock/post-list.ts` 中添加对应 Mock 响应：
- 仅提供目标页面显示和关键操作必需的本地数据
- 未匹配请求显式失败，不回落真实服务
- 不为可点击所有导航而 Mock 其他模块

### 4. 重新构建导出

```bash
# 源码变更后需完整重建（Mock 和业务在同一编译链中）
python3 "$WORKBENCH/scripts/build.py" .prototype/ui/final.json
```

### 5. 双环境验收

```bash
node "$WORKBENCH/scripts/browser-cdp.mjs" .prototype/ui/final.json \
  --executable /usr/bin/chromium-browser
```

验证 standalone 和 iframe（`srcdoc` + `sandbox=allow-scripts`、`origin=null`）两种环境。

### 6. 交付业务改动

- 业务改动提交到需求分支，不堆回 `improvement/prototype-preview` 共用基座
- 基础设施修复才经核对后回合预览分支
- 排除演示适配（Mock、预览入口、`haloPrototypePreview` 注入）不进入主干

## 交付回执

```bash
python3 "$BOOTSTRAP/scripts/delivery.py" \
  --repo . \
  --profile .prototype/ui/profile.json \
  --workbench "$WORKBENCH" \
  --selfcheck <自检运行目录> \
  --run-id <run-id> \
  --check-remote \
  --out <输出路径>
```

## 排障

参见 `docs/prototype-troubleshooting.md`。
