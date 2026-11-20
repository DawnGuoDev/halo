import type { CalendarDataSource, CalendarPost } from "./types";

/**
 * Preview-only data used when the console runs without a Halo backend
 * (e.g. inside the platform preview iframe). Production builds talk to the
 * real console API through `data-source.ts`.
 *
 * Mock dates are generated relative to the current month so the calendar
 * always has content in the visible range. Nothing here is persisted.
 */
const DAY = 24 * 60 * 60 * 1000;

function at(monthOffset: number, day: number, hour: number, minute = 0) {
  const now = new Date();
  const date = new Date(
    now.getFullYear(),
    now.getMonth() + monthOffset,
    day,
    hour,
    minute,
    0,
    0
  );
  return date.toISOString();
}

function inDays(days: number, hour: number, minute = 0) {
  const date = new Date(Date.now() + days * DAY);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

export function createMockPosts(): CalendarPost[] {
  const posts: CalendarPost[] = [
    {
      name: "mock-post-1",
      title: "Halo 2.28 版本亮点速览",
      slug: "halo-2-28-highlights",
      publishTime: inDays(-6, 9, 30),
      published: true,
      scheduled: false,
      categories: ["产品动态"],
      owner: "admin",
    },
    {
      name: "mock-post-2",
      title: "从零搭建个人知识库：目录与分类设计",
      slug: "knowledge-base-taxonomy",
      publishTime: inDays(-3, 10, 0),
      published: true,
      scheduled: false,
      categories: ["建站教程"],
      owner: "guqing",
    },
    {
      name: "mock-post-3",
      title: "主题开发指南：模板变量与内容查找器",
      slug: "theme-dev-guide",
      publishTime: inDays(-1, 14, 0),
      published: true,
      scheduled: false,
      categories: ["开发指南"],
      owner: "johnniang",
    },
    {
      name: "mock-post-4",
      title: "十一月社区问答精选",
      slug: "community-qa-november",
      publishTime: inDays(1, 9, 0),
      published: false,
      scheduled: true,
      categories: ["社区"],
      owner: "admin",
    },
    {
      name: "mock-post-5",
      title: "插件市场周报（第 46 周）",
      slug: "plugin-weekly-46",
      publishTime: inDays(2, 10, 30),
      published: false,
      scheduled: true,
      categories: ["产品动态"],
      owner: "guqing",
    },
    {
      name: "mock-post-6",
      title: "资源站启用对象存储：迁移步骤与注意事项",
      slug: "object-storage-migration",
      publishTime: inDays(4, 20, 0),
      published: false,
      scheduled: true,
      categories: ["建站教程"],
      owner: "johnniang",
    },
    {
      name: "mock-post-7",
      title: "如何在 Halo 中配置 CDN 与缓存策略",
      slug: "cdn-and-cache",
      publishTime: inDays(7, 9, 0),
      published: false,
      scheduled: true,
      categories: ["建站教程"],
      owner: "admin",
    },
    {
      name: "mock-post-8",
      title: "评论系统治理：审核队列与关键词过滤",
      slug: "comment-moderation",
      publishTime: inDays(9, 15, 0),
      published: false,
      scheduled: true,
      categories: ["开发指南"],
      owner: "guqing",
    },
    {
      name: "mock-post-9",
      title: "社区共建计划：十二月活动预告",
      slug: "community-plan-december",
      publishTime: inDays(14, 10, 0),
      published: false,
      scheduled: true,
      categories: ["社区"],
      owner: "admin",
    },
    {
      name: "mock-post-10",
      title: "全站搜索优化实践（下）",
      slug: "search-optimization-part-2",
      publishTime: inDays(20, 11, 0),
      published: false,
      scheduled: true,
      categories: ["开发指南"],
      owner: "johnniang",
    },
    {
      name: "mock-post-11",
      title: "上月回顾：站点性能数据观察",
      slug: "performance-review-last-month",
      publishTime: at(-1, 18, 10, 0),
      published: true,
      scheduled: false,
      categories: ["产品动态"],
      owner: "guqing",
    },
    {
      name: "mock-post-12",
      title: "下一页：十二月内容排期说明",
      slug: "december-editorial-plan",
      publishTime: at(1, 3, 9, 30),
      published: false,
      scheduled: true,
      categories: ["产品动态"],
      owner: "admin",
    },
  ];
  return posts.map((post) => ({ ...post }));
}

/** Simulated network latency so loading states are observable in preview. */
function delay<T>(value: T, ms: number, signal?: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve(value), ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });
}

const store = createMockPosts();

export const mockCalendarDataSource: CalendarDataSource = {
  async list(signal) {
    return delay(
      store.map((post) => ({ ...post })),
      450,
      signal
    );
  },
  async reschedule(name, publishTime) {
    const post = store.find((item) => item.name === name);
    if (!post) {
      throw new Error("POST_NOT_FOUND");
    }
    if (post.published) {
      throw new Error("POST_READ_ONLY");
    }
    await delay(undefined, 350);
    // Mutate only the in-memory store; the preview never writes to Halo.
    post.publishTime = publishTime;
  },
  async categories() {
    return delay(["产品动态", "建站教程", "开发指南", "社区"], 120);
  },
};
