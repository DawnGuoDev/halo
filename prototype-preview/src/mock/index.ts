import { mockPosts } from "./data";
import type { MockPost } from "@/types";

export interface ListPostsParams {
  page: number;
  size: number;
  keyword?: string;
  status?: string;
  visible?: string;
  category?: string;
  sort?: string;
}

export interface ListPostsResult {
  items: MockPost[];
  total: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// 本地 Mock 数据入口：后续接真实接口时只替换本文件的实现
function delay(ms = 180) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function listPosts(
  params: ListPostsParams
): Promise<ListPostsResult> {
  await delay();
  let items = [...mockPosts];

  if (params.keyword) {
    const kw = params.keyword.trim().toLowerCase();
    items = items.filter(
      (post) =>
        post.title.toLowerCase().includes(kw) ||
        post.slug.toLowerCase().includes(kw)
    );
  }
  if (params.status === "published") {
    items = items.filter((post) => post.published);
  }
  if (params.status === "draft") {
    items = items.filter((post) => !post.published);
  }
  if (params.visible) {
    items = items.filter((post) => post.visible === params.visible);
  }
  if (params.category) {
    items = items.filter((post) => post.categories.includes(params.category!));
  }
  if (params.sort === "views") {
    items.sort((a, b) => b.views - a.views);
  }

  const start = (params.page - 1) * params.size;
  return {
    items: items.slice(start, start + params.size),
    total: items.length,
    hasNext: start + params.size < items.length,
    hasPrevious: params.page > 1,
  };
}

export async function recyclePost(name: string): Promise<void> {
  await delay();
  const index = mockPosts.findIndex((post) => post.name === name);
  if (index >= 0) {
    mockPosts.splice(index, 1);
  }
}

export async function publishPost(name: string): Promise<void> {
  await delay();
  const post = mockPosts.find((item) => item.name === name);
  if (post) {
    post.published = true;
    post.publishTime = new Date().toISOString().slice(0, 16).replace("T", " ");
  }
}
