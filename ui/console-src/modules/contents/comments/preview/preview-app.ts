import { coreApiClient } from "@halo-dev/api-client";
import { utils } from "@halo-dev/ui-shared";
import { createPinia } from "pinia";
import { createApp, defineComponent, h } from "vue";
import { i18n, setupI18n } from "@/locales";
import zhCN from "@/locales/zh-CN.json";
import { setupComponents } from "@/setup/setupComponents";
import { setupVueQuery } from "@/setup/setupVueQuery";
import "@/setup/setupStyles";
import ModerationWorkbench from "../ModerationWorkbench.vue";
import { getPreviewRouter } from "./preview-router";

/**
 * Prototype-only bootstrap.
 *
 * This entry is never loaded by `console.html`. It mounts the real workbench
 * with a minimal component/i18n/permission context so the page can be opened
 * from a static bundle without a backend, a login session or the plugin
 * manifest. Only safe GETs are stubbed as explicit failures in case a preview
 * branch is missed; no write request is ever fabricated.
 */
const app = createApp(
  defineComponent({
    name: "CommentModerationPreview",
    render: () => h(ModerationWorkbench, { previewOverride: true }),
  })
);

// The prototype always renders in Simplified Chinese, independent of the
// browser locale and of the (unavailable) backend language negotiation.
i18n.global.setLocaleMessage("zh-CN", zhCN);
i18n.global.locale.value = "zh-CN";
setupI18n(app);
setupVueQuery(app);
app.use(createPinia());
setupComponents(app);
const router = getPreviewRouter();
app.use(router);
void router.isReady().then(() => {
  app.mount("#app");
});
utils.permission.setUserPermissions([
  "system:comments:view",
  "system:comments:manage",
]);

function blockPreviewRequest() {
  const blocked = Promise.reject(
    new Error("Comment moderation preview must not call the business API")
  );
  // Avoid an unhandled rejection when a discarded code path triggers it.
  blocked.catch(() => {});
  return blocked;
}

// Preview mode disables the real queries; these stubs are a last-resort guard
// so a missed branch fails closed instead of reaching the backend.
coreApiClient.content.comment.patchComment = blockPreviewRequest;
coreApiClient.content.comment.deleteComment = blockPreviewRequest;

// Expose a stable readiness marker for browser acceptance checks.
document.documentElement.dataset.previewReady = "true";
