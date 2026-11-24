# 生产隔离审阅证据

## 代表性页面

`ui/console-src/modules/contents/posts/PostList.vue` — 真实控制台文章列表页面，未替换为近似页面或手写演示。

## 生产隔离措施

1. **预览入口隔离**：`ui/prototype/preview/main.ts` 是独立薄宿主入口，不进入生产 `main.ts`/`router`/`modules`。
2. **演示身份隔离**：预览仅授予 `system:posts:view` 只读权限，不写入正式鉴权缓存：
   ```ts
   utils.permission.setUserPermissions(["system:posts:view"]);
   ```
3. **写操作禁用**：通过 `inject("haloPrototypePreview", true)` 禁用 PostList 的设置弹层 actions 和 TitleField 的编辑路由/extra/description：
   - `PostList.vue`：`<template v-if="!prototypePreview" #actions>` 禁用前后切换按钮
   - `TitleField.vue`：`:route="prototypePreview ? undefined : {...}"` 禁用编辑跳转，`v-if="!prototypePreview"` 禁用 extra 和 description
4. **Mock 数据隔离**：`ui/prototype/mock/post-list.ts` 拦截文章列表/分类/标签请求，未匹配请求显式失败，不回落真实服务。
5. **构建配置隔离**：`.prototype/ui/native.json` 和 `final.json` 使用独立 Vite 配置 `prototype/preview/vite.config.ts`，不修改生产构建配置。

## 审阅结论

- 代表性页面为真实业务页面，非近似演示。
- 预览模式与生产模式隔离，演示身份不进入正式鉴权。
- 写操作在预览中禁用，Mock 不覆盖生产数据路径。
