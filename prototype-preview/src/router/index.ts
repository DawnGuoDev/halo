import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      redirect: "/posts",
    },
    {
      path: "/posts",
      name: "Posts",
      component: () => import("@/views/PostListView.vue"),
      meta: { title: "文章" },
    },
    {
      path: "/demo",
      name: "ComponentDemo",
      component: () => import("@/views/ComponentDemoView.vue"),
      meta: { title: "组件示例" },
    },
  ],
  scrollBehavior() {
    return { top: 0 };
  },
});

router.afterEach((to) => {
  document.title = to.meta.title
    ? `${to.meta.title} · Halo 原型预览`
    : "Halo 原型预览";
});

export default router;
