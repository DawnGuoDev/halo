/**
 * Development-only preview entry for the publish calendar page.
 *
 * Mounts the real `PostCalendar` component (the same source the console route
 * `/posts/calendar` renders) against local mock data, so the page can be opened
 * directly without a running Halo backend:
 *
 *   pnpm -C ui dev
 *   http://localhost:3000/console-src/modules/contents/posts/calendar/__dev-entry.html
 *
 * This entry is not referenced by the console production entry.
 */
import "@/setup/setupStyles";
import { VueQueryPlugin } from "@tanstack/vue-query";
import { createPinia } from "pinia";
import { createApp } from "vue";
import { createI18n } from "vue-i18n";
import { createMemoryHistory, createRouter } from "vue-router";
import zhCN from "@/locales/zh-CN.json";
import { setupComponents } from "@/setup/setupComponents";
import { createCalendarMockPosts } from "./composables/use-post-calendar-mock";
import PostCalendar from "./index.vue";

const app = createApp(PostCalendar, {
  mockPosts: createCalendarMockPosts(),
});

app.use(createPinia());
const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    {
      path: "/:pathMatch(.*)*",
      name: "Posts",
      component: { template: "<div />" },
    },
  ],
});
const i18n = createI18n({
  legacy: false,
  locale: "zh-CN",
  fallbackLocale: "zh-CN",
  messages: { "zh-CN": zhCN },
});

setupComponents(app);
app.use(VueQueryPlugin);
app.use(i18n);
app.use(router);
app.mount("#app");
