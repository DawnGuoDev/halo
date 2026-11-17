# Halo E2E 测试基线（TestNG + Playwright Java + Allure）

本目录是 Halo 的隔离 E2E 测试子项目，不参与根工程默认的 `check` / `build`，也不进入
`api` / `application` / `ui` 的生产依赖和发布产物。

| 层级 | 框架 | 覆盖内容 | 用例 |
| --- | --- | --- | --- |
| 后端 E2E | TestNG + JDK `HttpClient`，直连真实实例 | 系统初始化、Basic Auth、文章创建/查询/更新/发布/删除、401 失败路径 | TC-BE-001、TC-BE-002 |
| 前端 E2E | Playwright Java + Chromium | `/console` 未登录重定向、真实表单登录、新建文章、发布、列表校验 | TC-FE-001 |
| 报告 | Allure（`allure-testng`） | 两类套件同一份结果目录、单份 HTML 报告、步骤、耗时、失败附件 | TC-REPORT-001 |

## 1. 环境准备

- JDK 21（与仓库 `AGENTS.md` / Gradle toolchain 一致）。
- 仓库已有的 Gradle Wrapper（`./gradlew`），无需单独安装 Gradle。
- 前端资源：`application` 的 `classes` 任务依赖 `:ui:doBuild`，因此首次执行需要 Node + pnpm（仓库既有版本）。
- Chromium（仅前端 E2E 需要），两种方式任选其一：

```bash
# A. 使用 Playwright 官方下载（默认，与 Playwright Java 版本匹配）
./gradlew :e2e:playwrightInstall

# B. 复用机器已有 Chromium（离线/受限网络）
./gradlew :e2e:testFrontend -De2e.chromium.executable=/path/to/chrome
```

网络受限时可以把浏览器缓存目录（`~/.cache/ms-playwright`）预先打包到执行环境。若未安装浏览器，
`TC-FE-001` 会以 **BLOCKED** 结束并提示安装命令，不会被记为业务失败。

## 2. 被测实例与数据准备

每个测试方法都会自启动一个临时 Halo 实例（当前工作区代码，不使用已发布镜像）：

| 项 | 说明 |
| --- | --- |
| 端口 | 每次随机空闲端口 |
| 数据库 | H2 内存库（`r2dbc:h2:mem:///halo-e2e-<port>;MODE=MySQL;DB_CLOSE_DELAY=-1`） |
| 工作目录 | `e2e/build/e2e-tmp/halo-<port>-<nanos>/`，测试结束删除；失败时保留用于排查 |
| 就绪信号 | 轮询 `/actuator/health` 为 `UP`，超时（默认 180s）记为 BLOCKED 并输出启动日志 |
| 管理员 | 固定测试账号 `e2e-admin`（仅临时实例使用，不写入报告） |
| 数据隔离 | 每轮生成唯一 scope token（`e2e-<UTC 时间戳>-<随机串>`）作为标题/ slug 前缀 |
| 清理 | 用例通过 API 删除创建的文章；实例停止后删除临时工作目录；清理失败会在报告中显式标记 |

可用配置（系统属性或环境变量均可，如 `-De2e.ready.timeout.seconds=240` / `E2E_READY_TIMEOUT_SECONDS=240`）：

| 属性 | 默认值 | 作用 |
| --- | --- | --- |
| `e2e.ready.timeout.seconds` | `180` | 实例就绪超时 |
| `e2e.publish.timeout.seconds` | `90` | 发布状态轮询上限 |
| `e2e.temp.dir` | `build/e2e-tmp` | 临时实例目录根 |
| `e2e.frontend.screenshot.dir` | `build/e2e-screenshots` | 失败截图目录 |
| `e2e.chromium.executable` | 空 | 指定已有 Chromium 路径 |
| `e2e.headed` | `false` | `true` 时以有头模式打开浏览器，便于调试 |
| `e2e.slowmo` | `0` | 有头调试时的操作放慢毫秒数 |
| `e2e.lang` | `zh-CN` | 前端断言使用的界面语言 |

## 3. 执行命令

命令均在仓库根目录执行：

```bash
# 只编译 E2E 源码（不启动实例、不启动浏览器、不执行用例）
./gradlew :e2e:e2eCheck

# 后端 E2E（TestNG，无浏览器）
./gradlew :e2e:testBackend

# 前端 E2E（Playwright Java，无头 Chromium）
./gradlew :e2e:testFrontend

# 前端有头调试
./gradlew :e2e:testFrontend -De2e.headed=true -De2e.slowmo=200

# 全量 + 生成报告（两个套件都会尝试执行，任一失败仍会生成报告）
./gradlew :e2e:e2eAllureReport
```

上述 E2E 任务会自动依赖 `:application:classes`、`:api:classes` 和
`application:writeE2eRuntimeClasspath`，以便用当前工作树启动实例；`./gradlew build` /
`./gradlew check` 不会触发它们。

## 4. 报告查看

| 产物 | 路径 |
| --- | --- |
| Allure 原始结果（两类套件共用） | `e2e/build/allure-results/` |
| Allure HTML 报告 | `e2e/build/reports/allure-report/index.html` |
| 失败截图 | `e2e/build/e2e-screenshots/` |
| 临时实例日志 | `e2e/build/e2e-tmp/halo-*/logs/instance.log`（仅失败或未清理时保留） |

`e2eAllureReport` 使用固定版本 Allure CLI（`allure-commandline`，仅作为独立配置）生成静态报告，
无需额外安装 Allure。也可以直接打开 `index.html`，或用 `allure open e2e/build/reports/allure-report`（如本地已装 Allure）。

报告内容：用例名称与状态、开始/结束时间、耗时、步骤（含请求/响应摘要或 UI 步骤）、失败堆栈；
后端失败附加脱敏后的请求/响应，前端失败附加全页截图与页面 URL/标题。
`allure-results`、报告、截图和临时目录都在 `.gitignore` 中，不提交。

## 5. 失败排查

| 现象 | 判定 | 处理 |
| --- | --- | --- |
| 实例未在超时内变成 UP | BLOCKED（环境/启动阻塞） | 查看报告中的 `instance-startup-log` 与 `e2e/build/e2e-tmp/*/logs/instance.log`；常见原因是端口占用、内存不足或前端资源未构建 |
| Chromium 未安装 / 无法启动 | BLOCKED | 执行 `./gradlew :e2e:playwrightInstall` 或设置 `-De2e.chromium.executable` |
| 状态码/字段/列表断言不符 | FAIL（业务失败） | 报告中定位步骤名（如 `断言 HTTP 状态码为 201`、`PUT publish post`），对照请求/响应摘要 |
| 发布状态长时间未收敛 | FAIL | 先看响应中 `spec.publish` / `spec.releaseSnapshot`；必要时调大 `e2e.publish.timeout.seconds` 并复核 Reconciler 日志 |
| 清理失败 | 显式阻塞提示 | 报告附件 `cleanup-problems` 会写明残留文章或目录，手工清理后可重跑 |
| 界面文案变更导致找不到元素 | FAIL（选择器失效） | 失败截图为第一证据；文案集中在 `src/test/java/run/halo/e2e/pages/`，只改 Page Object |

`PASS / FAIL / BLOCKED` 判定口径：

- **PASS**：用例被实际执行，所有断言通过，清理无异常。
- **FAIL**：用例已执行，但状态码、字段、页面状态等断言不成立（含发布状态超时）。
- **BLOCKED**：前置条件不满足（实例未就绪、浏览器不可用、清理失败等），用例未真正完成验证；不计入业务失败。

## 6. 需求 ↔ 用例覆盖矩阵

| 需求 / 验收项 | 用例 ID | 覆盖内容 |
| --- | --- | --- |
| REQ-002 后端主链路（AC1） | TC-BE-001 `PostLifecycleE2ETest` | 初始化（204 / 已初始化 302）→ Basic Auth 身份 → 草稿创建（201）→ 单条与列表查询 → 更新标题并发布 → 已发布校验 → 删除后 404 与列表不含 |
| REQ-002 失败路径 | TC-BE-002 `AuthenticationE2ETest` | 未认证访问 `/apis/**` 返回 401、错误密码 401、正确凭据对照 200 |
| REQ-003 控制台主流程（AC2） | TC-FE-001 `ConsolePostE2ETest` | `/console` 未登录重定向 `/login` → 真实表单登录 → 新建文章 → 发布（含设置弹窗分支）→ 列表出现且 API 显示已发布 → API 清理 |
| REQ-004 统一报告（AC3） | `e2eAllureReport` | 两类结果进入 `e2e/build/allure-results`，单份报告含状态/耗时/失败信息/截图 |
| REQ-005 数据准备与清理（AC4） | 所有用例 | 唯一 scope token、独立内存库与工作目录、API 清理、清理失败显式标记 |
| REQ-001 / REQ-007 隔离与回归（AC5、AC8） | `e2e/build.gradle`、`settings.gradle`、`.gitignore` | 独立子项目、仅测试作用域依赖、不挂 `check`、不改业务代码与 CI |

非 E2E 覆盖项：富文本全部格式、主题渲染细节、插件生命周期与市场、OAuth2/2FA、邮件/短信、对象存储、
性能/压测、视觉回归、无障碍专项、多浏览器矩阵。

## 7. 已知限制

- 前端用例以 Chromium 单浏览器、`zh-CN` 文案为准；其他语言需覆盖 Page Object 中的文案，暂不在本期范围。
- 控制台编辑器为第三方富文本组件，正文输入使用 `[contenteditable=true]` 契约；断言以标题、列表与 API 状态为准。
- 发布校验不依赖前台主题渲染（Q4 结论：本期仅控制台状态 + API 已发布）。
- 默认不修改 `.github/workflows`，CI 接入、报告归档保留策略由后续需求决定。
- 首次执行需要下载 Gradle 依赖与前端构建依赖；离线环境需预先准备 Maven/Gradle 缓存与 Playwright 浏览器缓存。
- 建议单轮全量 E2E 在本地 10 分钟内完成；实际耗时以报告中用例耗时为准。
