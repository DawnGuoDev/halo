/**
 * 发布日历演示数据（本轮不读取真实文章）。
 * 在接入真实接口时删除本文件，并改用 consoleApiClient.content.post.listPosts。
 */
export type CalendarPostStatus =
  | "published"
  | "scheduled"
  | "draft"
  | "recycled";

export interface CalendarPost {
  name: string;
  title: string;
  excerpt: string;
  categories: string[];
  author: string;
  status: CalendarPostStatus;
  /** ISO 字符串；草稿为空 */
  publishTime?: string;
  createdAt: string;
}

export const mockCategories = ["产品动态", "使用教程", "行业观察", "团队故事"];

function iso(dayOffset: number, hour = 9, minute = 0) {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  date.setDate(date.getDate() + dayOffset);
  return date.toISOString();
}

export const mockPosts: CalendarPost[] = [
  {
    name: "welcome-to-halo",
    title: "欢迎使用 Halo：从一篇博客开始",
    excerpt: "介绍 Halo 的安装、主题与插件生态，帮助新用户完成第一篇博客。",
    categories: ["使用教程"],
    author: "Dawn",
    status: "published",
    publishTime: iso(-9, 10, 0),
    createdAt: iso(-20),
  },
  {
    name: "halo-2-28-release",
    title: "Halo 2.28 版本发布说明",
    excerpt: "本次版本更新聚焦内容编辑体验与插件运行时稳定性。",
    categories: ["产品动态"],
    author: "Dawn",
    status: "published",
    publishTime: iso(-4, 9, 30),
    createdAt: iso(-12),
  },
  {
    name: "scheduled-product-roadmap",
    title: "2026 年第四季度产品路线图",
    excerpt: "面向站点运营者的下一阶段功能规划与交付节奏。",
    categories: ["产品动态"],
    author: "Lin",
    status: "scheduled",
    publishTime: iso(1, 10, 0),
    createdAt: iso(-3),
  },
  {
    name: "scheduled-theme-guide",
    title: "主题开发进阶：自定义模板与布局",
    excerpt: "从模板结构到局部布局覆盖，逐步完成一个定制主题。",
    categories: ["使用教程"],
    author: "Lin",
    status: "scheduled",
    publishTime: iso(1, 16, 30),
    createdAt: iso(-2),
  },
  {
    name: "scheduled-plugin-best-practice",
    title: "插件开发最佳实践清单",
    excerpt: "整理插件注册、配置项管理与升级兼容的常见问题。",
    categories: ["使用教程", "产品动态"],
    author: "Chen",
    status: "scheduled",
    publishTime: iso(3, 11, 0),
    createdAt: iso(-1),
  },
  {
    name: "scheduled-industry-insight",
    title: "独立建站工具的一年：趋势观察",
    excerpt: "基于公开数据回顾建站工具市场的演进。",
    categories: ["行业观察"],
    author: "Chen",
    status: "scheduled",
    publishTime: iso(4, 9, 0),
    createdAt: iso(-6),
  },
  {
    name: "scheduled-team-story",
    title: "我们如何维护一个开源项目",
    excerpt: "分享 issue 处理、版本规划和社区协作的日常。",
    categories: ["团队故事"],
    author: "Dawn",
    status: "scheduled",
    publishTime: iso(6, 14, 0),
    createdAt: iso(-5),
  },
  {
    name: "scheduled-more-1",
    title: "内容运营周报模板（示例）",
    excerpt: "示例文章，用于演示同一天多篇文章的折叠展示。",
    categories: ["团队故事"],
    author: "Lin",
    status: "scheduled",
    publishTime: iso(6, 18, 0),
    createdAt: iso(-4),
  },
  {
    name: "scheduled-more-2",
    title: "站点 SEO 常见问题答疑",
    excerpt: "示例文章，用于演示同一天多篇文章的折叠展示。",
    categories: ["使用教程"],
    author: "Chen",
    status: "scheduled",
    publishTime: iso(6, 20, 0),
    createdAt: iso(-4),
  },
  {
    name: "scheduled-next-month",
    title: "下月排期：编辑器插件评测",
    excerpt: "跨越月份的排期示例。",
    categories: ["行业观察"],
    author: "Chen",
    status: "scheduled",
    publishTime: iso(35, 10, 0),
    createdAt: iso(-2),
  },
  {
    name: "draft-quick-start",
    title: "草稿：新手建站检查清单",
    excerpt: "尚未排期，按创建日期显示在日历中。",
    categories: ["使用教程"],
    author: "Lin",
    status: "draft",
    createdAt: iso(-1, 15, 0),
  },
  {
    name: "draft-newsletter",
    title: "草稿：十一月社区通讯",
    excerpt: "汇总本月社区贡献与活动。",
    categories: ["团队故事"],
    author: "Dawn",
    status: "draft",
    createdAt: iso(0, 9, 20),
  },
  {
    name: "recycled-old-post",
    title: "已删除：旧版安装指南",
    excerpt: "已进入回收站的内容。",
    categories: ["使用教程"],
    author: "Dawn",
    status: "recycled",
    publishTime: iso(-2, 10, 0),
    createdAt: iso(-30),
  },
];
