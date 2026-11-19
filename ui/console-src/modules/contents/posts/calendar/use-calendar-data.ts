import type { Category, ListedPost } from "@halo-dev/api-client";
import { consoleApiClient, coreApiClient } from "@halo-dev/api-client";
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import type { Ref } from "vue";
import { computed } from "vue";
import { postLabels } from "@/constants/labels";
import {
  getMockRecords,
  toListedPost,
  updateMockPublishTime,
} from "@/dev/post-calendar-mock";

/**
 * DEV ONLY: 显式开启时才使用 Mock 数据（VITE_POST_CALENDAR_MOCK=true）。
 * 默认关闭，生产构建与环境变量未开启时只走真实 ListPosts / updatePost。
 */
export const CALENDAR_MOCK_ENABLED: boolean =
  import.meta.env.DEV && import.meta.env.VITE_POST_CALENDAR_MOCK === "true";

export type CalendarStatusFilter = "ALL" | "SCHEDULED" | "PUBLISHED" | "DRAFT";

export interface CalendarItem {
  name: string;
  title: string;
  categories: Category[];
  publishTime?: string;
  published: boolean;
  scheduled: boolean;
  owner?: ListedPost["owner"];
  raw: ListedPost;
}

export function toCalendarItem(post: ListedPost): CalendarItem {
  const labels = post.post.metadata.labels || {};
  return {
    name: post.post.metadata.name,
    title: post.post.spec.title,
    categories: post.categories || [],
    publishTime: post.post.spec.publishTime,
    published: labels[postLabels.PUBLISHED] === "true",
    scheduled:
      labels[postLabels.PUBLISHED] !== "true" &&
      labels[postLabels.SCHEDULING_PUBLISH] === "true",
    owner: post.owner,
    raw: post,
  };
}

export function matchesStatus(
  item: CalendarItem,
  status: CalendarStatusFilter
) {
  switch (status) {
    case "PUBLISHED":
      return item.published;
    case "SCHEDULED":
      return item.scheduled;
    case "DRAFT":
      return !item.published && !item.scheduled;
    default:
      return true;
  }
}

/** DEV ONLY: `localStorage["halo-calendar-mock-error"]="1"` 时模拟加载失败。 */
function shouldSimulateError() {
  return (
    CALENDAR_MOCK_ENABLED &&
    window.localStorage.getItem("halo-calendar-mock-error") === "1"
  );
}

async function listMock(keyword: string, category: string) {
  await new Promise((resolve) => setTimeout(resolve, 350));
  if (shouldSimulateError()) {
    throw new Error("Simulated calendar loading failure");
  }
  return getMockRecords()
    .filter((record) => {
      if (
        keyword &&
        !record.title.toLowerCase().includes(keyword.toLowerCase())
      ) {
        return false;
      }
      if (category && record.categoryName !== category) {
        return false;
      }
      return true;
    })
    .map((record) => toListedPost(record));
}

export function usePostCalendarData(options: {
  keyword: Ref<string>;
  category: Ref<string | undefined>;
}) {
  const queryClient = useQueryClient();

  const queryKey = computed(() => [
    "post-calendar",
    options.keyword.value,
    options.category.value,
  ]);

  const query = useQuery<ListedPost[]>({
    queryKey,
    queryFn: async () => {
      if (CALENDAR_MOCK_ENABLED) {
        return listMock(options.keyword.value, options.category.value || "");
      }

      const fieldSelector: string[] = [];
      if (options.category.value) {
        fieldSelector.push(`spec.categories=${options.category.value}`);
      }

      const { data } = await consoleApiClient.content.post.listPosts({
        labelSelector: [`${postLabels.DELETED}=false`],
        fieldSelector,
        page: 1,
        size: 100,
        sort: ["spec.publishTime,desc"],
        keyword: options.keyword.value || undefined,
      });

      return data.items;
    },
  });

  const items = computed<CalendarItem[]>(
    () => query.data.value?.map(toCalendarItem) || []
  );

  const updatePublishTime = async (name: string, publishTime: string) => {
    if (CALENDAR_MOCK_ENABLED) {
      updateMockPublishTime(name, publishTime);
      await queryClient.invalidateQueries({ queryKey: ["post-calendar"] });
      return;
    }

    const { data: post } = await coreApiClient.content.post.getPost({ name });
    post.spec.publishTime = publishTime;
    await coreApiClient.content.post.updatePost({
      name,
      post: { ...post, spec: { ...post.spec, publishTime } },
    });
    await queryClient.invalidateQueries({ queryKey: ["post-calendar"] });
  };

  return {
    query,
    items,
    updatePublishTime,
    isMock: CALENDAR_MOCK_ENABLED,
  };
}
