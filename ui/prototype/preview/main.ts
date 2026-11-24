import { utils } from "@halo-dev/ui-shared";
import { createPinia } from "pinia";
import { createApp, type DirectiveBinding } from "vue";
import {
  createMemoryHistory,
  createRouter,
  RouterView,
} from "vue-router";
import PostList from "@console/modules/contents/posts/PostList.vue";
import { setLanguage, setupI18n } from "@/locales";
import { setupComponents } from "@/setup/setupComponents";
import { setupVueQuery } from "@/setup/setupVueQuery";
import { installPostListPreview } from "../mock/post-list";
import PreviewApp from "./PreviewApp.vue";
import "@halo-dev/components/dist/style.css";
import "@/styles/tailwind.css";
import "@/styles/index.css";
import "overlayscrollbars/overlayscrollbars.css";

installPostListPreview();

const app = createApp(PreviewApp);
app.use(createPinia());
setupI18n(app);
setupVueQuery(app);
setupComponents(app);

// Preview identity grants read-only post access and never enters production stores.
utils.permission.setUserPermissions(["system:posts:view"]);
app.directive(
  "permission",
  (element: HTMLElement, binding: DirectiveBinding<string[]>) => {
    if (!utils.permission.has(binding.value, binding.modifiers.any ?? false)) {
      element.remove();
    }
  }
);
app.provide("haloPrototypePreview", true);
app.component("RouterView", RouterView);

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: "/", redirect: "/posts" },
    { path: "/posts", name: "Posts", component: PostList },
  ],
});
app.use(router);

await setLanguage("zh-CN");
await router.isReady();
app.mount("#app");
