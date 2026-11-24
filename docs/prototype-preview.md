# Halo 原型开发与预览指南

## 概述

本指南描述如何在 Halo 仓库 `ui` 前端工程中使用已初始化的原型预览基座。

- **仓库**：`DawnGuoDev/halo`
- **长期预览分支**：`improvement/prototype-preview`
- **基线主干**：`main` @ `f6c046cc`
- **限定页面**：`ui/console-src/modules/contents/posts/PostList.vue`（路由 `/posts`）
- **关键操作**：输入关键词"原型"并按 Enter，文章列表从 3 条过滤为 1 条（"Halo 原型初始化指南"）
- **不覆盖**：文章编辑、设置、批量操作、分类/标签管理及其他页面

## 环境准备

执行目录：`ui/`

```bash
# 1. 确保 Node.js（满足 package.json engines）和 Corepack 可用
node --version   # 实测 v24.22.3
corepack pnpm --version  # 实测 12.4.2

# 2. 冻结锁安装
corepack pnpm install --frozen-lockfile
```

环境配方见 `.prototype/ui/environment.json`，安装回执见 `.prototype/ui/evidence/environment.json`。
新沙箱须重新执行同一配方，不可直接沿用旧 `node_modules`。

## 构建预览包

工具依赖 `prototype-workbench`（`PROTOTYPE_WORKBENCH`）和 `prototype-repo-bootstrap`（`BOOTSTRAP`）。

### A 阶段：原生构建

```bash
# 从仓库根目录执行
export PROTOTYPE_WORKBENCH=<prototype-workbench skill 根路径>
export PATH="<node bin>:$PATH"

python3 "$PROTOTYPE_WORKBENCH/scripts/build.py" .prototype/ui/native.json --validate
python3 "$PROTOTYPE_WORKBENCH/scripts/build.py" .prototype/ui/native.json
```

产物位于 `.prototype/ui/output/native/prototype/preview/post-list.html`。

### B 阶段：自包含导出

```bash
python3 "$PROTOTYPE_WORKBENCH/scripts/build.py" .prototype/ui/final.json --validate
python3 "$PROTOTYPE_WORKBENCH/scripts/build.py" .prototype/ui/final.json
```

产物位于 `.prototype/ui/output/final/index.html`（自包含 HTML）。

## 浏览器验收

```bash
# standalone + iframe-srcdoc（origin=null, sandbox=allow-scripts）
node "$PROTOTYPE_WORKBENCH/scripts/browser-cdp.mjs" .prototype/ui/final.json \
  --executable /usr/bin/chromium-browser
```

验收场景：
1. 页面加载后 `tr.entity-wrapper` 行数为 3
2. 在 `input[name=keyword]` 输入"原型"并按 Enter
3. 行数变为 1，文本包含"Halo 原型初始化指南"

## 改码重建验证

自检计划（`.workbench/selfcheck-plan.json`）使用 `ui/src/locales/zh-CN.json` 中分页总文案"共 {total} 项数据"作为业务依赖标记：

- **before**：`共 {total} 项数据`
- **after**：`Halo 文章（重建验证）`
- **selector**：`.pagination__total`

修改后重建 final 包，验证 DOM 中出现新文案；恢复后重建复验。

## 预览架构说明

```
ui/prototype/
├── preview/
│   ├── main.ts          # 薄宿主入口：createApp + memoryRouter + PostList
│   ├── PreviewApp.vue   # 预览根组件
│   ├── post-list.html   # HTML 入口
│   └── vite.config.ts   # Vite 预览配置
├── mock/
│   ├── post-list.ts     # 内存 Mock：3 篇文章 + 分类 + 标签
│   └── post-list.spec.ts  # 单元测试
└── tsconfig.json
```

- 预览入口通过 `inject("haloPrototypePreview", true)` 隔离生产写操作
- Mock 仅拦截文章列表、分类树、标签请求；未匹配请求显式失败
- 演示身份仅授予 `system:posts:view` 只读权限

## 重建预览包

源码变更后重新构建：

```bash
# 仅改 Mock 不需重编业务层；改业务源码需完整重建
python3 "$PROTOTYPE_WORKBENCH/scripts/build.py" .prototype/ui/final.json
```

## 自检

```bash
export BOOTSTRAP=<prototype-repo-bootstrap skill 根路径>
export WORKBENCH="$PROTOTYPE_WORKBENCH"

# 预检
python3 "$BOOTSTRAP/scripts/selfcheck.py" --validate-only \
  --plan .workbench/selfcheck-plan.json \
  --workbench "$WORKBENCH" \
  --out .workbench/preflight-check

# 正式运行
python3 "$BOOTSTRAP/scripts/selfcheck.py" \
  --plan .workbench/selfcheck-plan.json \
  --workbench "$WORKBENCH" \
  --out .workbench/selfcheck-run
```

当前有效自检：`.workbench/selfcheck-run-003-v2`（runtime-passed）。

## 排障

参见 `docs/prototype-troubleshooting.md`。
