/**
 * DEV ONLY: 内容发布日历的最小开发 Mock 数据。
 *
 * 仅当 `VITE_POST_CALENDAR_MOCK=true` 时启用（见 `use-calendar-data.ts`），
 * 不读写任何真实文章数据。默认关闭，生产构建走真实接口。
 *
 * 启用：`VITE_POST_CALENDAR_MOCK=true pnpm dev`
 * 移除：删除本文件，并移除 `use-calendar-data.ts` 中的 Mock 分支与
 * `calendar/__tests__` 之外对它的引用。
 */
import type { ListedPost } from "@halo-dev/api-client";
import { postLabels } from "@/constants/labels";

export interface MockCalendarRecord {
  name: string;
  title: string;
  categoryName: string;
  categoryDisplayName: string;
  publishTime?: string;
  published: boolean;
  scheduled: boolean;
  ownerDisplayName: string;
}

function iso(daysFromToday: number, hour: number, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function createRecords(): MockCalendarRecord[] {
  return [
    {
      name: "mock-post-01",
      title: "Halo 2.x 主题开发指南",
      categoryName: "mock-cat-tech",
      categoryDisplayName: "技术",
      publishTime: iso(-6, 9),
      published: true,
      scheduled: false,
      ownerDisplayName: "张三",
    },
    {
      name: "mock-post-02",
      title: "写给编辑的内容排期工作流",
      categoryName: "mock-cat-product",
      categoryDisplayName: "产品",
      publishTime: iso(-2, 10, 30),
      published: true,
      scheduled: false,
      ownerDisplayName: "李四",
    },
    {
      name: "mock-post-03",
      title: "11 月产品更新说明",
      categoryName: "mock-cat-product",
      categoryDisplayName: "产品",
      publishTime: iso(1, 9),
      published: false,
      scheduled: true,
      ownerDisplayName: "李四",
    },
    {
      name: "mock-post-04",
      title: "内容运营的季度复盘",
      categoryName: "mock-cat-ops",
      categoryDisplayName: "运营",
      publishTime: iso(2, 14),
      published: false,
      scheduled: true,
      ownerDisplayName: "王五",
    },
    {
      name: "mock-post-05",
      title: "多语言站点的 SEO 实践",
      categoryName: "mock-cat-tech",
      categoryDisplayName: "技术",
      publishTime: iso(3, 8, 30),
      published: false,
      scheduled: true,
      ownerDisplayName: "张三",
    },
    {
      name: "mock-post-06",
      title: "编辑器协作功能预告",
      categoryName: "mock-cat-product",
      categoryDisplayName: "产品",
      publishTime: iso(4, 20),
      published: false,
      scheduled: true,
      ownerDisplayName: "李四",
    },
    {
      name: "mock-post-07",
      title: "站点迁移检查清单",
      categoryName: "mock-cat-tech",
      categoryDisplayName: "技术",
      published: false,
      scheduled: false,
      ownerDisplayName: "张三",
    },
    {
      name: "mock-post-08",
      title: "图片压缩与访问速度",
      categoryName: "mock-cat-ops",
      categoryDisplayName: "运营",
      publishTime: iso(8, 11),
      published: false,
      scheduled: true,
      ownerDisplayName: "王五",
    },
  ];
}

const records = createRecords();

/** 时间改为相对“当前时间”生成，保证预览时排期落在本月附近。 */
export function getMockRecords() {
  return records.map((record) => ({ ...record }));
}

export function toListedPost(record: MockCalendarRecord): ListedPost {
  const now = Date.now();
  const publishTimeMs = record.publishTime
    ? new Date(record.publishTime).getTime()
    : undefined;
  const published =
    record.published ||
    (publishTimeMs !== undefined && publishTimeMs <= now && record.scheduled);

  return {
    categories: [
      {
        apiVersion: "content.halo.run/v1alpha1",
        kind: "Category",
        metadata: { name: record.categoryName },
        spec: {
          displayName: record.categoryDisplayName,
          slug: record.categoryName,
          priority: 0,
          children: [],
        },
        status: undefined,
      },
    ],
    contributors: [],
    owner: {
      displayName: record.ownerDisplayName,
      name: record.name,
      avatar: "",
    },
    post: {
      apiVersion: "content.halo.run/v1alpha1",
      kind: "Post",
      metadata: {
        name: record.name,
        labels: {
          [postLabels.DELETED]: "false",
          [postLabels.PUBLISHED]: published ? "true" : "false",
          [postLabels.SCHEDULING_PUBLISH]:
            !published && record.scheduled ? "true" : "false",
        },
      },
      spec: {
        title: record.title,
        slug: record.name,
        releaseSnapshot: "",
        headSnapshot: "",
        owner: record.name,
        template: "",
        cover: "",
        deleted: false,
        publish: record.scheduled || published,
        publishTime: record.publishTime,
        pinned: false,
        allowComment: true,
        visible: "PUBLIC" as never,
        priority: 0,
        excerpt: { autoGenerate: true, raw: "" },
        categories: [record.categoryName],
        tags: [],
        htmlMetas: [],
      },
      status: {
        phase: published ? "PUBLISHED" : "DRAFT",
        contributors: [],
        permalink: "",
      },
    },
    stats: { visit: 0, comment: 0, upvote: 0 },
  } as unknown as ListedPost;
}

export function updateMockPublishTime(name: string, publishTime: string) {
  const record = records.find((item) => item.name === name);
  if (!record) {
    throw new Error("Post not found");
  }
  record.publishTime = publishTime;
  record.published = false;
  record.scheduled = true;
}
