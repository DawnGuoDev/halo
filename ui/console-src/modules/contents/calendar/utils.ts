import type { CalendarPost } from "./types";

export interface CalendarDay {
  /** Local date key in YYYY-MM-DD. */
  key: string;
  day: number;
  inCurrentMonth: boolean;
  isToday: boolean;
}

const pad = (value: number) => String(value).padStart(2, "0");

/** Format a Date as a local YYYY-MM-DD key. */
export function dateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Format an ISO string as local HH:mm. */
export function timeLabel(publishTime?: string): string {
  if (!publishTime) return "";
  const date = new Date(publishTime);
  if (Number.isNaN(date.getTime())) return "";
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Format an ISO string as a local date key. */
export function publishTimeKey(publishTime?: string): string {
  if (!publishTime) return "";
  const date = new Date(publishTime);
  if (Number.isNaN(date.getTime())) return "";
  return dateKey(date);
}

/** First day of the month containing `date`. */
export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/** Add a number of months, keeping the first day. */
export function addMonths(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

export function monthTitle(date: Date, locale: "zh" | "en" = "zh"): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  return locale === "zh" ? `${year}年${month}月` : `${year}-${pad(month)}`;
}

/**
 * Build the 6x7 grid for a month. Weeks start on Monday so the calendar
 * stays consistent with the Chinese console.
 */
export function buildMonthGrid(month: Date, today = new Date()): CalendarDay[] {
  const first = startOfMonth(month);
  // getDay(): Sunday = 0. Shift so Monday = 0.
  const offset = (first.getDay() + 6) % 7;
  const gridStart = new Date(first.getFullYear(), first.getMonth(), 1 - offset);
  const todayKey = dateKey(today);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(
      gridStart.getFullYear(),
      gridStart.getMonth(),
      gridStart.getDate() + index
    );
    const key = dateKey(date);
    return {
      key,
      day: date.getDate(),
      inCurrentMonth: date.getMonth() === month.getMonth(),
      isToday: key === todayKey,
    };
  });
}

export function monthRange(month: Date): { from: string; to: string } {
  const first = startOfMonth(month);
  const next = addMonths(first, 1);
  return { from: dateKey(first), to: dateKey(next) };
}

export function isInMonth(
  publishTime: string | undefined,
  month: Date
): boolean {
  return (
    !!publishTime &&
    publishTimeKey(publishTime).startsWith(
      `${month.getFullYear()}-${pad(month.getMonth() + 1)}`
    )
  );
}

export function compareByPublishTime(a: CalendarPost, b: CalendarPost): number {
  return (a.publishTime || "").localeCompare(b.publishTime || "");
}

export function groupByDay(
  posts: CalendarPost[]
): Record<string, CalendarPost[]> {
  return posts.reduce<Record<string, CalendarPost[]>>((acc, post) => {
    const key = publishTimeKey(post.publishTime);
    if (!key) return acc;
    (acc[key] ||= []).push(post);
    return acc;
  }, {});
}
