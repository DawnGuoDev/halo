/**
 * DEV ONLY: 内容发布日历页面预览适配。
 *
 * 触发条件：`import.meta.env.DEV` + `localStorage["halo-calendar-preview"] === "1"`。
 * 作用：在没有后端 / 未登录的开发环境中，让页面可直达并渲染。
 * 生产构建不会启用（不满足 DEV 条件），也不会修改任何真实请求。
 */
const PREVIEW_KEY = "halo-calendar-preview";

export const calendarPreviewEnabled =
  import.meta.env.DEV && window.localStorage.getItem(PREVIEW_KEY) === "1";

export function previewUser() {
  const user = {
    apiVersion: "v1alpha1",
    kind: "User",
    metadata: {
      name: "calendar-preview",
      labels: { "halo.run/role": "admin" },
    },
    spec: { displayName: "预览账号", email: "", avatar: "", bio: "" },
  };
  return {
    user,
    roles: [
      { metadata: { name: "super-role" }, spec: { displayName: "超级管理员" } },
    ],
  };
}

export function previewPermissions() {
  return { uiPermissions: ["*"], nonUiPermissions: ["*"] };
}

export function previewGlobalInfo() {
  return { siteTitle: "Halo", externalAssets: {} };
}
