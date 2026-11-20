import type {
  Announcement,
  AnnouncementFormErrors,
  AnnouncementPosition,
  AnnouncementStatus,
} from "./types";

export function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

/**
 * 本地时间格式化，兼容 iframe / origin=null（不使用 window.location、同源存储）。
 */
export function toLocalInputValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

export function formatDateTime(value?: string): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

export function formatRange(startTime: string, endTime: string): string {
  return `${formatDateTime(startTime)} ~ ${formatDateTime(endTime)}`;
}

/**
 * 发布时按当前时间判定状态：
 * 当前 < 开始 → 待生效；开始 ≤ 当前 ≤ 结束 → 展示中；当前 > 结束 → 已结束。
 */
export function resolvePublishStatus(
  startTime: string,
  endTime: string,
  now: Date = new Date()
): AnnouncementStatus {
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  const current = now.getTime();
  if (current < start) return "SCHEDULED";
  if (current < end) return "PUBLISHED";
  return "FINISHED";
}

/**
 * 依据时间实时刷新展示中公告的状态：
 * 待生效到期转为展示中，展示中超过结束时间转为已结束。
 */
export function refreshStatusByTime(
  announcement: Announcement,
  now: Date = new Date()
): Announcement {
  if (
    announcement.status !== "SCHEDULED" &&
    announcement.status !== "PUBLISHED"
  ) {
    return announcement;
  }
  const current = now.getTime();
  const start = new Date(announcement.startTime).getTime();
  const end = new Date(announcement.endTime).getTime();
  if (
    announcement.status === "SCHEDULED" &&
    current >= start &&
    current < end
  ) {
    return { ...announcement, status: "PUBLISHED" };
  }
  if (
    (announcement.status === "SCHEDULED" ||
      announcement.status === "PUBLISHED") &&
    current >= end
  ) {
    return { ...announcement, status: "FINISHED" };
  }
  return announcement;
}

/**
 * 同一位置仅展示最新一条：多条展示中时按开始时间倒序取最新。
 */
export function findActiveAnnouncementByPosition(
  announcements: Announcement[],
  position: AnnouncementPosition
): Announcement | undefined {
  return announcements
    .filter((item) => item.status === "PUBLISHED" && item.position === position)
    .sort(
      (a, b) =>
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    )[0];
}

export function isShadowed(
  announcement: Announcement,
  all: Announcement[]
): boolean {
  if (announcement.status !== "PUBLISHED") return false;
  const active = findActiveAnnouncementByPosition(all, announcement.position);
  return !!active && active.id !== announcement.id;
}

export function validateForm(
  values: {
    title: string;
    content: string;
    position?: AnnouncementPosition | "";
    startTime: string;
    endTime: string;
  },
  now: Date = new Date()
): AnnouncementFormErrors {
  const errors: AnnouncementFormErrors = {};
  if (!values.title.trim()) errors.title = "请输入公告标题";
  if (!values.content.trim()) errors.content = "请输入公告正文";
  if (!values.position) errors.position = "请选择展示位置";
  if (!values.startTime) errors.startTime = "请选择开始时间";
  if (!values.endTime) errors.endTime = "请选择结束时间";
  if (values.startTime && values.endTime) {
    const start = new Date(values.startTime).getTime();
    const end = new Date(values.endTime).getTime();
    if (start >= end) {
      errors.endTime = "结束时间必须晚于开始时间";
    }
  }
  if (
    !errors.endTime &&
    values.endTime &&
    new Date(values.endTime).getTime() < now.getTime()
  ) {
    errors.endTime = "结束时间不能早于当前时间，否则发布后将直接结束";
  }
  return errors;
}

export function hasErrors(errors: AnnouncementFormErrors): boolean {
  return Object.values(errors).some(Boolean);
}

export function sortAnnouncements(items: Announcement[]): Announcement[] {
  return [...items].sort(
    (a, b) =>
      new Date(b.updateTime).getTime() - new Date(a.updateTime).getTime()
  );
}
