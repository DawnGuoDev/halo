/**
 * Presentation model for the content publishing calendar.
 *
 * It is a view-only projection of a post. The mock data source and the real
 * `listPosts` integration both produce this shape so the calendar components
 * stay independent from the API client contract.
 */
export interface CalendarPost {
  /** metadata.name of the post. */
  name: string;
  /** Post title. */
  title: string;
  /** URL slug / alias used for keyword matching. */
  slug?: string;
  /** Publish time or planned publish time, ISO 8601. */
  publishTime?: string;
  /** Published means the post is live and read-only in the calendar. */
  published: boolean;
  /** Scheduled means the publish job will run at publishTime in the future. */
  scheduled: boolean;
  categories?: string[];
  owner?: string;
}

export type CalendarStatusFilter = "ALL" | "PUBLISHED" | "SCHEDULED";

export type CalendarView = "month" | "list";

export interface CalendarFilters {
  keyword: string;
  category?: string;
  status: CalendarStatusFilter;
}

export interface CalendarDataSource {
  /** Returns all posts that can appear on the calendar. */
  list: (signal?: AbortSignal) => Promise<CalendarPost[]>;
  /** Persists a new planned publish time for a scheduled post. */
  reschedule: (name: string, publishTime: string) => Promise<void>;
  /** Category name for filtering, parent categories include child posts. */
  categories: () => Promise<string[]>;
}

export function statusOf(post: CalendarPost): "PUBLISHED" | "SCHEDULED" {
  return post.published ? "PUBLISHED" : "SCHEDULED";
}
