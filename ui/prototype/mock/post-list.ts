import {
  axiosInstance,
  type Category,
  type CategoryTreeNode,
  type ListedPost,
  type ListedPostList,
  type Tag,
  type TagList,
  type User,
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

const releaseCategory: Category = {
  apiVersion: "content.halo.run/v1alpha1",
  kind: "Category",
  metadata: { name: "release-notes" },
  spec: {
    displayName: "版本发布",
    slug: "release-notes",
    priority: 1,
  },
  status: { permalink: "/categories/release-notes", postCount: 1 },
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
const reviewer = { name: "demo-reviewer", displayName: "评审同学" };

interface PostSeed {
  name: string;
  title: string;
  published: boolean;
  publishTime?: string;
  creationTimestamp?: string;
  schedulePublish?: boolean;
  tags?: Tag[];
  category?: Category;
  author?: { name: string; displayName: string };
  visible?: "PUBLIC" | "INTERNAL" | "PRIVATE";
  labels?: Record<string, string>;
}

function post(seed: PostSeed): ListedPost {
  const {
    name,
    title,
    published,
    publishTime,
    creationTimestamp = "2026-11-20T08:00:00Z",
    schedulePublish,
    tags = [],
    category: postCategory = category,
    author = owner,
    visible = "PUBLIC",
    labels: extraLabels = {},
  } = seed;
  const labels: Record<string, string> = {
    [postLabels.DELETED]: "false",
    [postLabels.PUBLISHED]: String(published),
  };
  if (schedulePublish) {
    labels[postLabels.SCHEDULING_PUBLISH] = "true";
  }
  Object.assign(labels, extraLabels);
  return {
    post: {
      apiVersion: "content.halo.run/v1alpha1",
      kind: "Post",
      metadata: {
        name,
        creationTimestamp,
        labels,
      },
      spec: {
        allowComment: false,
        categories: [postCategory.metadata.name],
        deleted: false,
        excerpt: { autoGenerate: false, raw: `${title}的演示摘要` },
        owner: author.name,
        pinned: false,
        priority: 0,
        publish: published,
        publishTime,
        slug: name,
        tags: tags.map((tag) => tag.metadata.name),
        title,
        visible,
      },
      status: { permalink: `/archives/${name}`, contributors: [author.name] },
    },
    categories: [postCategory],
    contributors: [author],
    owner: author,
    stats: { approvedComment: 0, totalComment: 0, upvote: 0, visit: 12 },
    tags,
  };
}

const posts: ListedPost[] = [
  post({
    name: "prototype-bootstrap",
    title: "Halo 原型初始化指南",
    published: true,
    publishTime: "2026-11-22T08:00:00Z",
    creationTimestamp: "2026-11-22T08:00:00Z",
    tags: [prototypeTag],
  }),
  post({
    name: "markdown-first-post",
    title: "使用 Markdown 创建第一篇博客",
    published: true,
    publishTime: "2026-11-21T08:00:00Z",
    creationTimestamp: "2026-11-21T08:00:00Z",
    tags: [frontendTag],
    author: reviewer,
  }),
  post({
    name: "frontend-checklist",
    title: "前端发布检查清单",
    published: false,
    creationTimestamp: "2026-11-20T08:00:00Z",
    tags: [frontendTag],
  }),
  post({
    name: "release-notes-2-28",
    title: "Halo 2.28 版本发布说明",
    published: true,
    publishTime: "2026-11-19T08:00:00Z",
    creationTimestamp: "2026-11-19T08:00:00Z",
    tags: [prototypeTag],
    category: releaseCategory,
    author: reviewer,
  }),
  post({
    name: "private-draft-plan",
    title: "私有：下季度内容规划",
    published: false,
    creationTimestamp: "2026-11-18T08:00:00Z",
    visible: "PRIVATE",
    labels: { [postLabels.VISIBLE]: "PRIVATE" },
  }),
  post({
    name: "scheduled-changelog",
    title: "定时发布的更新日志",
    published: false,
    schedulePublish: true,
    publishTime: "2026-12-01T08:00:00Z",
    creationTimestamp: "2026-11-17T08:00:00Z",
    tags: [frontendTag],
  }),
];

const categoryTree: CategoryTreeNode[] = [
  { category, children: [] },
  { category: releaseCategory, children: [] },
];
const categories = [category, releaseCategory];
const tags: Tag[] = [prototypeTag, frontendTag];
const users: User[] = [
  {
    apiVersion: "v1alpha1",
    kind: "User",
    metadata: { name: owner.name, creationTimestamp: "2026-11-01T08:00:00Z" },
    spec: { displayName: owner.displayName, email: "demo@example.com" },
  },
  {
    apiVersion: "v1alpha1",
    kind: "User",
    metadata: {
      name: reviewer.name,
      creationTimestamp: "2026-11-02T08:00:00Z",
    },
    spec: { displayName: reviewer.displayName, email: "reviewer@example.com" },
  },
];

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

function readPostField(post: ListedPost, field: string): string {
  if (field === "spec.publishTime") return post.post.spec.publishTime ?? "";
  if (field === "metadata.creationTimestamp") {
    return post.post.metadata.creationTimestamp ?? "";
  }
  return "";
}

function sorted(items: ListedPost[], sortValue: unknown): ListedPost[] {
  const [field, direction] = String(sortValue ?? "").split(",");
  if (!field || !["asc", "desc"].includes(direction)) {
    return items;
  }
  const result = [...items].sort((a, b) =>
    readPostField(a, field).localeCompare(readPostField(b, field))
  );
  return direction === "desc" ? result.reverse() : result;
}

function listPosts(params: Record<string, unknown>): ListedPostList {
  const keyword = String(params.keyword ?? "")
    .trim()
    .toLocaleLowerCase();
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
  const selectedContributor = fields
    .find((field) => field.startsWith("status.contributors="))
    ?.split("=", 2)[1];
  const published = labels
    .find((label) => label.startsWith(`${postLabels.PUBLISHED}=`))
    ?.split("=", 2)[1];
  const scheduling = labels
    .find((label) => label.startsWith(`${postLabels.SCHEDULING_PUBLISH}=`))
    ?.split("=", 2)[1];

  const filtered = posts.filter(({ post }) => {
    const searchable = `${post.spec.title} ${post.spec.slug} ${
      post.spec.excerpt.raw ?? ""
    }`.toLocaleLowerCase();
    return (
      (!keyword || searchable.includes(keyword)) &&
      (!visible || post.spec.visible === visible) &&
      (!selectedCategory || post.spec.categories?.includes(selectedCategory)) &&
      (!selectedTag || post.spec.tags?.includes(selectedTag)) &&
      (!selectedContributor ||
        post.status?.contributors?.includes(selectedContributor)) &&
      (published === undefined ||
        post.metadata.labels?.[postLabels.PUBLISHED] === published) &&
      (scheduling === undefined ||
        post.metadata.labels?.[postLabels.SCHEDULING_PUBLISH] === scheduling)
    );
  });
  return pageOf(sorted(filtered, params.sort), params.page, params.size);
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
    url.pathname === "/apis/api.console.halo.run/v1alpha1/categories"
  ) {
    const page = pageOf(categories, params.page, params.size);
    return response(config, page);
  }
  if (
    method === "GET" &&
    url.pathname === "/apis/api.console.halo.run/v1alpha1/tags"
  ) {
    const page = pageOf(tags, params.page, params.size) as TagList;
    return response(config, page);
  }
  if (
    method === "GET" &&
    url.pathname === "/apis/api.console.halo.run/v1alpha1/users"
  ) {
    const userKeyword = String(params.keyword ?? "").trim();
    const matched = users.filter(
      (user) =>
        !userKeyword ||
        user.metadata.name.includes(userKeyword) ||
        (user.spec.displayName ?? "").includes(userKeyword)
    );
    const page = pageOf(
      matched.map((user) => ({ user })),
      params.page,
      params.size
    );
    return response(config, page);
  }
  const userDetail =
    /^\/apis\/api\.console\.halo\.run\/v1alpha1\/users\/([^/]+)$/.exec(
      url.pathname
    );
  if (method === "GET" && userDetail) {
    const name = decodeURIComponent(userDetail[1]);
    const user = users.find((item) => item.metadata.name === name);
    if (!user) {
      throw new Error(
        `Prototype request is not covered: user ${name} is not in the demo data`
      );
    }
    return response(config, { user, roles: [], permissions: [] });
  }

  throw new Error(
    `Prototype request is not covered: ${method} ${url.pathname}; no network fallback is allowed`
  );
};

export function installPostListPreview() {
  axiosInstance.defaults.adapter = postListPreviewAdapter;
}
