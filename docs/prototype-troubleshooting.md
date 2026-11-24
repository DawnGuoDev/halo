# 原型预览排障记录

## 1. Mock adapter 未读取 URL query 关键词

- **适用版本**：prototype-repo-bootstrap 0.9.0, prototype-workbench 5.8.1
- **症状**：首次预览构建后，搜索框输入关键词并按 Enter，文章列表行数未变化。
- **根因**：首版 Mock adapter 把 keyword 放在 URL query string 中，但 adapter 只读取 `config.params`，未处理 query 参数。
- **修正**：修改 `ui/prototype/mock/post-list.ts` 中的 `postListPreviewAdapter`，从 `config.params` 读取 keyword 进行过滤。
- **复验**：`ui/prototype/mock/post-list.spec.ts` 单测通过真实 `consoleApiClient.content.post.listPosts({keyword:"原型"})` 验证 3→1 过滤。

## 2. rebuild 验收把 Vue 属性表达式当 DOM 文本断言

- **适用版本**：同上
- **症状**：run-002 changed-browser 失败（Condition timeout），但 `readyText` 已正确显示"Halo 文章（重建验证）"。
- **根因**：selfcheck plan 的 `rebuild.after` 使用了整段 Vue 属性表达式 `:title="'Halo 文章（重建验证）'"` 作为断言文本，而浏览器工具将其与 DOM 可见文字比较，两者不等。这是验收计划/工具契约问题，不是业务页面缺陷。
- **修正**：将 rebuild 标记改为真实业务依赖 `ui/src/locales/zh-CN.json` 中分页总文案"共 {total} 项数据"→"Halo 文章（重建验证）"，selector 改为 `.pagination__total`。
- **复验**：run-003 rebuild passed，changed 构建成功且 `.pagination__total` DOM 文本显示新文案。

## 3. 429 模型限流导致任务中断

- **适用版本**：运行时问题，与工程无关
- **症状**：子 Agent Turn 以 `acp_request_failed` (429 Too Many Requests) 失败。
- **根因**：模型服务限流，不是工程或构建失败。
- **处理**：根 Agent 在原任务和授权内接管，复用同一工作区完成剩余自检和交付。不新建会话或重装依赖。
