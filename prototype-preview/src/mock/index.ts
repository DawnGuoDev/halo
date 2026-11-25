import {
  mockCategories,
  mockPosts,
  mockTags,
  mockUsers,
} from "./data";
import type { MockCategory, MockPost, MockTag, MockUser } from "@/types";

// 本地 Mock 数据层：对齐业务仓库 PostList.vue 对
// consoleApiClient.content.post.listPosts({ labelSelector, fieldSelector, sort, keyword, page, size })
// 的调用形态（labelSelectorPublish / fieldSelectorCategories ...），回填时只需替换本文件实现。

export const postLabels = {
  PUBLISHED: "content.halo.run/published",
  SCHEDULING_PUBLISH: "content.halo.run/scheduling-publish",
} as const;

export const DEFAULT_SORT = "spec.publishTime,desc";

export interface ListPostsParams {
  labelSelector?: string[];
  fieldSelector?: string[];
  sort?: string[];
  keyword?: string;
  page: number;
  size: number;
}

export interface ListPostsResult {
  items: MockPost[];
  total: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export type MockScenario = "default" | "empty";

const scenario =
  new URLSearchParams(window.location.search).get("scenario") === "empty"
    ? "empty"
    : "default";

function delay(ms = 160) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseFieldSelector(fieldSelector: string[]) {
  const map = new Map<string, string[]>();
  fieldSelector.forEach((item) => {
    const [key, ...rest] = item.split("=");
    map.set(key, [...(map.get(key) || []), rest.join("=")]);
  });
  return map;
}

function sortPosts(items: MockPost[], sort?: string[]) {
  const rule = sort?.[0];
  if (!rule) return items;
  const [field, direction] = rule.split(",");
  const factor = direction === "asc" ? 1 : -1;
  const value = (post: MockPost) => {
    switch (field) {
      case "spec.publishTime":
        return post.publishTime || "";
      case "metadata.creationTimestamp":
        return post.publishTime || post.updateTime;
      case "status.lastModifyTime":
        return post.updateTime;
      case "stats.visit":
        return post.views;
      case "stats.totalComment":
        return post.comments;
      default:
        return "";
    }
  };
  return [...items].sort((a, b) => {
    const av = value(a);
    const bv = value(b);
    if (typeof av === "number" && typeof bv === "number") {
      return (av - bv) * factor;
    }
    return String(av).localeCompare(String(bv)) * factor;
  });
}

export async function listPosts(params: ListPostsParams): Promise<ListPostsResult> {
  await delay();
  // 站点本身没有文章：仅在 ?scenario=empty 下模拟，用于验证“原有空态”
  let items: MockPost[] = scenario === "empty" ? [] : [...mockPosts];

  const fields = parseFieldSelector(params.fieldSelector || []);
  const labels = params.labelSelector || [];

  const categories = fields.get("spec.categories") || [];
  if (categories.length) {
    items = items.filter((post) =>
      categories.some((category) => post.categories.includes(category))
    );
  }

  const tags = fields.get("spec.tags") || [];
  if (tags.length) {
    items = items.filter((post) => tags.some((tag) => post.tags.includes(tag)));
  }

  const contributors = fields.get("status.contributors") || [];
  if (contributors.length) {
    items = items.filter((post) => contributors.includes(post.contributor));
  }

  const visibles = fields.get("spec.visible") || [];
  if (visibles.length) {
    items = items.filter((post) => visibles.includes(post.visible));
  }

  if (labels.includes(`${postLabels.PUBLISHED}=true`)) {
    items = items.filter((post) => post.published);
  }
  if (labels.includes(`${postLabels.PUBLISHED}=false`)) {
    items = items.filter((post) => !post.published && !post.scheduling);
  }
  if (labels.includes(`${postLabels.SCHEDULING_PUBLISH}=true`)) {
    items = items.filter((post) => post.scheduling);
  }

  const keyword = params.keyword?.trim().toLowerCase();
  if (keyword) {
    items = items.filter(
      (post) =>
        post.title.toLowerCase().includes(keyword) ||
        post.slug.toLowerCase().includes(keyword)
    );
  }

  items = sortPosts(items, params.sort);

  const start = (params.page - 1) * params.size;
  return {
    items: items.slice(start, start + params.size),
    total: items.length,
    hasNext: start + params.size < items.length,
    hasPrevious: params.page > 1,
  };
}

export async function listCategoryTree(): Promise<MockCategory[]> {
  await delay(60);
  return mockCategories;
}

export async function listAllTags(): Promise<MockTag[]> {
  await delay(60);
  return mockTags;
}

export async function listUsers(params?: {
  keyword?: string;
}): Promise<MockUser[]> {
  await delay(120);
  const keyword = params?.keyword?.trim().toLowerCase();
  return mockUsers.filter(
    (user) =>
      !keyword ||
      user.displayName.toLowerCase().includes(keyword) ||
      user.name.toLowerCase().includes(keyword)
  );
}

export async function getUserDetail(name: string): Promise<MockUser | undefined> {
  await delay(40);
  return mockUsers.find((user) => user.name === name);
}

export async function publishPost(name: string): Promise<void> {
  await delay();
  const post = mockPosts.find((item) => item.name === name);
  if (post) {
    post.published = true;
    post.scheduling = false;
    post.publishTime = "2026-11-25 12:00";
  }
}

export async function recyclePost(name: string): Promise<void> {
  await delay();
  const index = mockPosts.findIndex((post) => post.name === name);
  if (index >= 0) {
    mockPosts.splice(index, 1);
  }
}
