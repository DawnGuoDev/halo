import { createRouter, createWebHashHistory } from "vue-router";

const router = createRouter({
  // hash 路由：静态制品不依赖服务器 rewrite，深链接与刷新均可直接访问
  history: createWebHashHistory(),
  routes: [
    {
      path: "/",
      redirect: "/operations",
    },
    {
      path: "/operations",
      name: "OperationsOverview",
      component: () => import("@/views/operations/OperationsOverviewView.vue"),
      meta: { title: "站点运营概览" },
    },
    {
      path: "/comments",
      name: "CommentsPlaceholder",
      component: () => import("@/views/FakeCommentsView.vue"),
      meta: { title: "评论管理" },
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
