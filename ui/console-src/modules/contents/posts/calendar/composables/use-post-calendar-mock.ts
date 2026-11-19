/**
 * Development-only mock for the publish calendar.
 *
 * The calendar page keeps its data access behind `usePostCalendar`. When the
 * backend cannot provide calendar data yet (or during UI development), pass
 * `calendarMockPosts` into `PostCalendar`. The mock never touches the API and
 * only lives in the browser; it can be removed once the real contract exists.
 */
import type { ListedPost } from "@halo-dev/api-client";
import { postLabels } from "@/constants/labels";

function createPost(
  name: string,
  title: string,
  category: string,
  published: boolean,
  publishTime?: string
): ListedPost {
  return {
    post: {
      apiVersion: "content.halo.run/v1alpha1",
      kind: "Post",
      metadata: {
        name,
        labels: {
          [postLabels.PUBLISHED]: published ? "true" : "false",
          [postLabels.SCHEDULING_PUBLISH]: published ? "false" : "true",
        },
      },
      spec: {
        title,
        slug: name,
        deleted: false,
        publish: published,
        publishTime,
        pinned: false,
        allowComment: true,
        visible: "PUBLIC",
        priority: 0,
        categories: [],
        tags: [],
        htmlMetas: [],
        excerpt: { autoGenerate: true, raw: "" },
      },
    },
    categories: [category],
  } as unknown as ListedPost;
}

export function createCalendarMockPosts(now = new Date()): ListedPost[] {
  const at = (days: number, hour: number) => {
    const date = new Date(now);
    date.setDate(date.getDate() + days);
    date.setHours(hour, 0, 0, 0);
    return date.toISOString();
  };

  return [
    createPost(
      "calendar-mock-published-1",
      "版本更新说明",
      "产品动态",
      true,
      at(-3, 9)
    ),
    createPost(
      "calendar-mock-published-2",
      "主题使用指南",
      "教程",
      true,
      at(-1, 14)
    ),
    createPost(
      "calendar-mock-scheduled-1",
      "年末内容盘点",
      "运营",
      false,
      at(1, 10)
    ),
    createPost(
      "calendar-mock-scheduled-2",
      "插件开发入门",
      "开发",
      false,
      at(3, 15)
    ),
    createPost(
      "calendar-mock-scheduled-3",
      "十二月排期草案",
      "运营",
      false,
      at(10, 9)
    ),
    createPost(
      "calendar-mock-unscheduled",
      "待定稿的选题清单",
      "访谈",
      false,
      undefined
    ),
  ];
}
