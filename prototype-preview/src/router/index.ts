import { createRouter, createWebHashHistory } from "vue-router";

const router = createRouter({
  // hash 路由：静态制品不依赖服务器 rewrite，深链接与刷新均可直接访问
  history: createWebHashHistory(),
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
      // 真实业务为 PostEditor（文章编辑器），原型以占位页验证跳转与返回
      path: "/posts/edit",
      name: "PostEditor",
      component: () => import("@/views/PostEditPlaceholderView.vue"),
      meta: { title: "编辑文章" },
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
