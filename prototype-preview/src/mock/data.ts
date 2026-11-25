import type { MockPost } from "@/types";

// 预览用固定数据，仅用于独立网页演示，不作为产品需求或接口契约
export const mockPosts: MockPost[] = [
  {
    name: "post-hello-halo",
    title: "欢迎使用 Halo：五分钟完成站点搭建",
    slug: "hello-halo",
    visible: "PUBLIC",
    published: true,
    publishTime: "2026-11-20 10:24",
    categories: ["默认分类"],
    tags: ["入门"],
    contributor: "administrator",
    views: 1284,
    excerpt: "从安装到发布第一篇文章，快速了解 Halo 控制台的核心流程。",
    pinned: true,
  },
  {
    name: "post-theme-guide",
    title: "主题开发指南：模板变量与扩展点",
    slug: "theme-guide",
    visible: "PUBLIC",
    published: true,
    publishTime: "2026-11-18 16:02",
    categories: ["文档"],
    tags: ["主题", "开发"],
    contributor: "guqing",
    views: 932,
    excerpt: "介绍主题目录结构、Thymeleaf 模板变量以及常用扩展点的使用方式。",
    pinned: false,
  },
  {
    name: "post-release-2-28",
    title: "Halo 2.28 发布说明",
    slug: "release-2-28",
    visible: "PUBLIC",
    published: true,
    publishTime: "2026-11-12 09:30",
    categories: ["公告"],
    tags: ["发布"],
    contributor: "administrator",
    views: 2461,
    excerpt: "本次更新包含控制台列表筛选优化、附件管理与若干问题修复。",
    pinned: false,
  },
  {
    name: "post-draft-migration",
    title: "从 1.x 迁移到 2.x 的注意事项",
    slug: "migration-notes",
    visible: "INTERNAL",
    published: false,
    categories: ["文档"],
    tags: ["迁移"],
    contributor: "guqing",
    views: 0,
    excerpt: "迁移前的备份策略、插件兼容性与常见问题排查清单。",
    pinned: false,
  },
  {
    name: "post-private-draft",
    title: "内网环境部署 Halo 的实践",
    slug: "intranet-deploy",
    visible: "PRIVATE",
    published: false,
    categories: ["默认分类"],
    tags: ["部署"],
    contributor: "administrator",
    views: 0,
    excerpt: "离线镜像、私有镜像仓库和反向代理配置的说明。",
    pinned: false,
  },
];

export const mockCategories = ["默认分类", "文档", "公告"];
export const mockTags = ["入门", "主题", "开发", "发布", "迁移", "部署"];

export const mockCurrentUser = {
  username: "administrator",
  displayName: "Administrator",
};
