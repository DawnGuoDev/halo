import {
  axiosInstance,
  type Category,
  type CategoryTreeNode,
  type ListedPost,
  type ListedPostList,
  type Tag,
  type TagList,
} from "@halo-dev/api-client";
import type {
  AxiosAdapter,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import { postLabels } from "@/constants/labels";

const category: Category = {
  apiVersion: "content.halo.run/v1alpha1",
  kind: "Category",
  metadata: { name: "prototype-guides" },
  spec: {
    displayName: "原型指南",
    slug: "prototype-guides",
    priority: 0,
  },
  status: { permalink: "/categories/prototype-guides", postCount: 3 },
};

const prototypeTag: Tag = {
  apiVersion: "content.halo.run/v1alpha1",
  kind: "Tag",
  metadata: { name: "prototype" },
  spec: { displayName: "原型", slug: "prototype", color: "#4ccba0" },
  status: { permalink: "/tags/prototype", postCount: 1 },
};

const frontendTag: Tag = {
  apiVersion: "content.halo.run/v1alpha1",
  kind: "Tag",
  metadata: { name: "frontend" },
  spec: { displayName: "前端", slug: "frontend", color: "#0e1731" },
  status: { permalink: "/tags/frontend", postCount: 2 },
};

const owner = { name: "demo-author", displayName: "演示作者" };

function post(
  name: string,
  title: string,
  published: boolean,
  publishTime: string | undefined,
  tags: Tag[]
): ListedPost {
  return {
    post: {
      apiVersion: "content.halo.run/v1alpha1",
      kind: "Post",
      metadata: {
        name,
        creationTimestamp: "2026-11-20T08:00:00Z",
        labels: {
          [postLabels.DELETED]: "false",
          [postLabels.PUBLISHED]: String(published),
        },
      },
      spec: {
        allowComment: false,
        categories: [category.metadata.name],
        deleted: false,
        excerpt: { autoGenerate: false, raw: `${title}的演示摘要` },
        owner: owner.name,
        pinned: false,
        priority: 0,
        publish: published,
        publishTime,
        slug: name,
        tags: tags.map((tag) => tag.metadata.name),
        title,
        visible: "PUBLIC",
      },
      status: { permalink: `/archives/${name}`, contributors: [owner.name] },
    },
    categories: [category],
    contributors: [owner],
    owner,
    stats: { approvedComment: 0, totalComment: 0, upvote: 0, visit: 12 },
    tags,
  };
}

const posts: ListedPost[] = [
  post(
    "prototype-bootstrap",
    "Halo 原型初始化指南",
    true,
    "2026-11-22T08:00:00Z",
    [prototypeTag]
  ),
  post(
    "markdown-first-post",
    "使用 Markdown 创建第一篇博客",
    true,
    "2026-11-21T08:00:00Z",
    [frontendTag]
  ),
  post("frontend-checklist", "前端发布检查清单", false, undefined, [
    frontendTag,
  ]),
];

const categoryTree: CategoryTreeNode[] = [{ category, children: [] }];
const tags: Tag[] = [prototypeTag, frontendTag];

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function arrayParameter(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  return value === undefined || value === null ? [] : [String(value)];
}

function pageOf<T>(
  items: T[],
  pageValue: unknown,
  sizeValue: unknown
): Omit<ListedPostList, "items"> & { items: T[] } {
  const page = Math.max(1, Number(pageValue) || 1);
  const size = Math.max(1, Number(sizeValue) || 20);
  const totalPages = Math.ceil(items.length / size);
  const start = (page - 1) * size;
  return {
    items: items.slice(start, start + size),
    total: items.length,
    page,
    size,
    totalPages,
    first: page === 1,
    last: page >= totalPages,
    hasPrevious: page > 1,
    hasNext: page < totalPages,
  };
}

function listPosts(params: Record<string, unknown>): ListedPostList {
  const keyword = String(params.keyword ?? "").trim().toLocaleLowerCase();
  const fields = arrayParameter(params.fieldSelector);
  const labels = arrayParameter(params.labelSelector);
  const visible = fields
    .find((field) => field.startsWith("spec.visible="))
    ?.split("=", 2)[1];
  const selectedCategory = fields
    .find((field) => field.startsWith("spec.categories="))
    ?.split("=", 2)[1];
  const selectedTag = fields
    .find((field) => field.startsWith("spec.tags="))
    ?.split("=", 2)[1];
  const published = labels
    .find((label) => label.startsWith(`${postLabels.PUBLISHED}=`))
    ?.split("=", 2)[1];

  const filtered = posts.filter(({ post }) => {
    const searchable = `${post.spec.title} ${post.spec.slug} ${
      post.spec.excerpt.raw ?? ""
    }`.toLocaleLowerCase();
    return (
      (!keyword || searchable.includes(keyword)) &&
      (!visible || post.spec.visible === visible) &&
      (!selectedCategory ||
        post.spec.categories?.includes(selectedCategory)) &&
      (!selectedTag || post.spec.tags?.includes(selectedTag)) &&
      (published === undefined ||
        post.metadata.labels?.[postLabels.PUBLISHED] === published)
    );
  });
  return pageOf(filtered, params.page, params.size);
}

function response<T>(
  config: InternalAxiosRequestConfig,
  data: T
): AxiosResponse<T> {
  return {
    data: clone(data),
    status: 200,
    statusText: "OK",
    headers: {},
    config,
  };
}

export const postListPreviewAdapter: AxiosAdapter = async (config) => {
  const method = (config.method ?? "GET").toUpperCase();
  const url = new URL(config.url ?? "", "http://prototype.invalid");
  const params: Record<string, unknown> = {};
  for (const key of new Set(url.searchParams.keys())) {
    const values = url.searchParams.getAll(key);
    params[key] = values.length > 1 ? values : values[0];
  }
  Object.assign(params, config.params ?? {});

  if (
    method === "GET" &&
    url.pathname === "/apis/api.console.halo.run/v1alpha1/posts"
  ) {
    return response(config, listPosts(params));
  }
  if (
    method === "GET" &&
    url.pathname === "/apis/api.console.halo.run/v1alpha1/categories/-/tree"
  ) {
    return response(config, categoryTree);
  }
  if (
    method === "GET" &&
    url.pathname === "/apis/api.console.halo.run/v1alpha1/tags"
  ) {
    const page = pageOf(tags, params.page, params.size) as TagList;
    return response(config, page);
  }

  throw new Error(
    `Prototype request is not covered: ${method} ${url.pathname}; no network fallback is allowed`
  );
};

export function installPostListPreview() {
  axiosInstance.defaults.adapter = postListPreviewAdapter;
}
