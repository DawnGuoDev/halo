import type { ListedPost } from "@halo-dev/api-client";
import { consoleApiClient } from "@halo-dev/api-client";
import { useQuery } from "@tanstack/vue-query";
import type { Ref } from "vue";
import { computed, ref } from "vue";
import { postLabels } from "@/constants/labels";

/**
 * Posts shown in the "Content publish calendar".
 *
 * Per product decision only published posts and scheduled (待发布) posts are
 * included; drafts are out of scope. The post list API only accepts a single
 * label selector for the publish state, so the two groups are requested
 * separately and merged by metadata.name.
 */
export type PostCalendarStatus = "published" | "scheduled";

export interface PostCalendarFilters {
  keyword: string;
  category?: string;
  status?: PostCalendarStatus;
}

const FETCH_SIZE = 100;
const MAX_PAGES = 20;

function isScheduled(post: ListedPost) {
  return post.post.metadata.labels?.[postLabels.SCHEDULING_PUBLISH] === "true";
}

function toStatus(post: ListedPost): PostCalendarStatus {
  return isScheduled(post) ? "scheduled" : "published";
}

async function listByStatus(
  status: PostCalendarStatus,
  filters: PostCalendarFilters
) {
  const labelSelector = [
    `${postLabels.DELETED}=false`,
    status === "published"
      ? `${postLabels.PUBLISHED}=true`
      : `${postLabels.SCHEDULING_PUBLISH}=true`,
  ];
  const fieldSelector: string[] = [];

  if (filters.category) {
    fieldSelector.push(`spec.categories=${filters.category}`);
  }

  const items: ListedPost[] = [];
  let page = 1;

  while (page <= MAX_PAGES) {
    const { data } = await consoleApiClient.content.post.listPosts({
      labelSelector,
      fieldSelector,
      keyword: filters.keyword || undefined,
      sort: ["spec.publishTime,asc"],
      page,
      size: FETCH_SIZE,
    });

    items.push(...data.items);

    if (!data.hasNext) {
      break;
    }
    page++;
  }

  return items;
}

export function usePostCalendar(filters: Ref<PostCalendarFilters>) {
  const total = ref(0);

  const query = useQuery({
    queryKey: ["post-calendar", filters],
    queryFn: async () => {
      const wanted: PostCalendarStatus[] = filters.value.status
        ? [filters.value.status]
        : ["published", "scheduled"];

      const groups = await Promise.all(
        wanted.map((status) => listByStatus(status, filters.value))
      );

      const byName = new Map<string, ListedPost>();
      groups.flat().forEach((post) => {
        byName.set(post.post.metadata.name, post);
      });

      const items = Array.from(byName.values());
      total.value = items.length;
      return items;
    },
    refetchOnWindowFocus: false,
  });

  const posts = computed(
    () =>
      (query.data.value || []).map((post) => ({
        post,
        status: toStatus(post),
        publishTime: post.post.spec.publishTime
          ? new Date(post.post.spec.publishTime)
          : undefined,
      })) || []
  );

  return {
    posts,
    total,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    refetch: query.refetch,
  };
}

/** Posts without a publish time belong to the "未排期" (unscheduled) area. */
export function splitBySchedule<T extends { publishTime?: Date }>(items: T[]) {
  const scheduled: T[] = [];
  const unscheduled: T[] = [];

  items.forEach((item) => {
    if (item.publishTime) {
      scheduled.push(item);
    } else {
      unscheduled.push(item);
    }
  });

  return { scheduled, unscheduled };
}

/** Build the 6x7 month grid (Monday first), including adjacent month days. */
export function buildMonthGrid(cursor: Date) {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - startOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate() + index
    );
    return {
      date,
      key: dateKey(date),
      inMonth: date.getMonth() === month && date.getFullYear() === year,
    };
  });
}

export function dateKey(date: Date) {
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}
