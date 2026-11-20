import { consoleApiClient, coreApiClient } from "@halo-dev/api-client";
import type { CategoryTreeNode, ListedPost } from "@halo-dev/api-client";
import { postLabels } from "@/constants/labels";
import { mockCalendarDataSource } from "./mock-data";
import { calendarPreviewConfig } from "./preview-config";
import type { CalendarDataSource, CalendarPost } from "./types";

/**
 * The calendar only shows live or scheduled posts. Drafts and recycled posts
 * are filtered out at the data source so every view shares one rule set.
 */
const deletedLabel = "content.halo.run/deleted=false";

function toCalendarPost(listed: ListedPost): CalendarPost {
  const post = listed.post;
  const labels = post.metadata?.labels || {};
  const categories = (listed.categories || [])
    .map((category) => category.spec?.displayName)
    .filter((name): name is string => !!name);
  return {
    name: post.metadata?.name ?? "",
    title: post.spec?.title ?? "",
    slug: post.spec?.slug,
    publishTime: post.spec?.publishTime,
    published: labels[postLabels.PUBLISHED] === "true",
    scheduled: labels[postLabels.SCHEDULING_PUBLISH] === "true",
    categories: categories.length ? categories : undefined,
    owner: listed.owner?.displayName || post.spec?.owner || undefined,
  };
}

function isCalendarPost(post: CalendarPost) {
  if (!post.publishTime) return false;
  if (post.published) return true;
  return post.scheduled;
}

async function fetchAllPosts(signal?: AbortSignal): Promise<CalendarPost[]> {
  // `publishPhase=PUBLISHED` narrows the server query; scheduled posts are
  // requested separately below so drafts never reach the calendar.
  const [publishedResult, scheduledResult] = await Promise.all([
    consoleApiClient.content.post.listPosts(
      {
        page: 1,
        size: 100,
        labelSelector: [deletedLabel, `${postLabels.PUBLISHED}=true`],
        sort: ["spec.publishTime,desc"],
      },
      { signal }
    ),
    consoleApiClient.content.post.listPosts(
      {
        page: 1,
        size: 100,
        labelSelector: [deletedLabel, `${postLabels.SCHEDULING_PUBLISH}=true`],
        sort: ["spec.publishTime,asc"],
      },
      { signal }
    ),
  ]);
  const merged = [...publishedResult.data.items, ...scheduledResult.data.items]
    .map(toCalendarPost)
    .filter(isCalendarPost);
  // A post can carry both labels briefly while publishing; keep one entry.
  return Array.from(new Map(merged.map((post) => [post.name, post])).values());
}

function toDatetimeLocal(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export const realCalendarDataSource: CalendarDataSource = {
  list: fetchAllPosts,
  async reschedule(name, publishTime) {
    const { data: post } = await coreApiClient.content.post.getPost({ name });
    if (post.metadata.labels?.[postLabels.PUBLISHED] === "true") {
      throw new Error("POST_READ_ONLY");
    }
    // Only the publish time and the scheduling label change. The reconciler
    // re-queues the post at the new time (see PostReconciler).
    const isScheduled = new Date(publishTime) > new Date();
    const labels = {
      ...post.metadata.labels,
      [postLabels.SCHEDULING_PUBLISH]: String(isScheduled),
    };
    await coreApiClient.content.post.updatePost({
      name,
      post: {
        ...post,
        metadata: { ...post.metadata, labels },
        spec: {
          ...post.spec,
          publish: isScheduled ? true : post.spec.publish,
          publishTime,
        },
      },
    });
  },
  async categories() {
    const { data } = await consoleApiClient.content.category.listCategoryTree();
    const names: string[] = [];
    const walk = (nodes: CategoryTreeNode[]) => {
      nodes.forEach((node) => {
        if (node.category?.spec?.displayName) {
          names.push(node.category.spec.displayName);
        }
        if (node.children?.length) walk(node.children);
      });
    };
    walk(data);
    return names;
  },
};

export function resolveCalendarDataSource(): {
  source: CalendarDataSource;
  mocked: boolean;
} {
  if (calendarPreviewConfig.mock) {
    return { source: mockCalendarDataSource, mocked: true };
  }
  return { source: realCalendarDataSource, mocked: false };
}

// Keep the helper referenced for the preview entry and future detail views.
export { toDatetimeLocal };
