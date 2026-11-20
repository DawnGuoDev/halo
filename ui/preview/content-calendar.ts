import RootApp from "@console/App.vue";
/**
 * Standalone preview entry for the content publication calendar.
 *
 * It reuses the console app shell, router, layout, design-system components
 * and the real calendar page (`console-src/modules/contents/calendar`), then
 * applies preview-only shims so the page can boot without a Halo backend.
 */
import modules from "@console/modules";
import { createMVP } from "@console/modules/contents/calendar/setup-preview";
import router from "@console/router";
import { stores, utils } from "@halo-dev/ui-shared";
import { createPinia } from "pinia";
import { createApp } from "vue";
import "@/setup/setupStyles";
import "@/setup/setupFormKitRuntime";
import {
  createMemoryHistory,
  createRouter,
  type RouteRecordRaw,
} from "vue-router";
import { setLanguage } from "@/locales";
import { setupI18n } from "@/locales";
import { setupComponents } from "@/setup/setupComponents";
import { setupCoreModules } from "@/setup/setupModules";
import { setupVueQuery } from "@/setup/setupVueQuery";

// Entry diagnostics surface as window.__HALO_PREVIEW_ERROR__ so a blank
// preview can be diagnosed from the browser console.
window.addEventListener("error", (event) => {
  const stack = (event.error as Error | undefined)?.stack || event.message;
  window.__HALO_PREVIEW_ERROR__ = String(stack)
    .split("\n")
    .slice(0, 4)
    .join(" | ");
});
window.addEventListener("unhandledrejection", (event) => {
  // Keep the message only: the preview is a static artifact.
  const reason = event.reason as Error | undefined;
  window.__HALO_PREVIEW_ERROR__ = String(reason?.message || reason);
});

createMVP();

const app = createApp(RootApp);

// The preview usually sits in a nested iframe whose layout height comes from
// CSS. Prevent the page body from scrolling so only the calendar area scrolls.
document.documentElement.style.height = "100%";
document.body.style.height = "100%";
document.body.style.overflow = "hidden";
// Static previews may be mounted from a nested (origin=null) iframe or served
// under a path prefix. Make the build's absolute `/ui-assets/...` references
// relative to this page so styles and preloads resolve in those contexts.
function relativizePreviewAssets() {
  const baseUrl = new URL("./", window.location.href);
  document.head.querySelectorAll('link[href^="/ui-assets/"]').forEach((el) => {
    el.setAttribute("href", new URL(el.getAttribute("href")!, baseUrl).href);
  });
  document.body.querySelectorAll('script[src^="/ui-assets/"]').forEach((el) => {
    el.setAttribute("src", new URL(el.getAttribute("src")!, baseUrl).href);
  });
}

relativizePreviewAssets();

setupI18n(app);
setupVueQuery(app);
setupComponents(app);

app.use(createPinia());

// Must be set before the first navigation: the permission guard reads it.
utils.permission.setUserPermissions(["*", "system:posts:manage"]);

app.use(router);

const currentUserStore = stores.currentUser();
currentUserStore.currentUser = {
  user: {
    apiVersion: "v1alpha1",
    kind: "User",
    metadata: { name: "preview-admin" },
    spec: { displayName: "预览管理员" },
  },
  roles: [
    {
      apiVersion: "v1alpha1",
      kind: "Role",
      metadata: { name: "super-role" },
      rules: [],
    },
  ],
};
currentUserStore.isAnonymous = false;

setupCoreModules({
  app,
  router,
  platform: "console",
  modules,
});

function canUseHistory() {
  try {
    window.history.replaceState(window.history.state, "");
    return true;
  } catch {
    return false;
  }
}

/**
 * Replace history-based routing with an in-memory equivalent so filters and
 * month navigation never need to write to the URL. Business state lives in
 * component state, so only the current route needs to be remembered.
 */
async function replaceWithMemoryHistory(target: typeof router) {
  // Configure a fresh router with memory history. It keeps the same route
  // records (already registered) and never touches `window.history`.
  const memoryRouter = createRouter({
    history: createMemoryHistory(),
    routes: target.options.routes as RouteRecordRaw[],
  });
  Object.assign(target, {
    push: (to: Parameters<typeof memoryRouter.push>[0]) =>
      memoryRouter.push(to),
    replace: (to: Parameters<typeof memoryRouter.replace>[0]) =>
      memoryRouter.replace(to),
    go: (delta = 0) => memoryRouter.go(delta),
    back: () => memoryRouter.back(),
    forward: () => memoryRouter.forward(),
  });
  await memoryRouter.replace(target.currentRoute.value.fullPath);
}

// Menu and page titles resolve from locale JSON files, so load zh-CN first.
await setLanguage("zh-CN");

// A sandboxed iframe may block History API writes. Keep the route in memory
// in that case; the real site keeps using its own history implementation.
if (!canUseHistory()) {
  await replaceWithMemoryHistory(router);
  await router.replace("/content-calendar");
} else {
  await router.replace("/content-calendar");
}
await router.isReady();

app.mount("#app");
