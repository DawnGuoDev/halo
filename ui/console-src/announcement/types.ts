export type AnnouncementPosition = "HOME_BANNER" | "SITE_WIDE_NOTICE";

export type AnnouncementStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "PUBLISHED"
  | "FINISHED"
  | "DISABLED";

export interface AnnouncementDraft {
  title: string;
  content: string;
  position: AnnouncementPosition;
  startTime: string;
  endTime: string;
}

export interface Announcement extends AnnouncementDraft {
  /**
   * 模拟数据使用稳定 id；接入正式接口后由后端生成。
   */
  id: string;
  status: AnnouncementStatus;
  updateTime: string;
  publishTime?: string;
}

export interface AnnouncementFormErrors {
  title?: string;
  content?: string;
  position?: string;
  startTime?: string;
  endTime?: string;
}

export const POSITION_OPTIONS: {
  label: string;
  value: AnnouncementPosition;
  description: string;
}[] = [
  {
    label: "首页横幅",
    value: "HOME_BANNER",
    description: "展示在站点首页顶部，高识别度的横幅样式",
  },
  {
    label: "全站通知",
    value: "SITE_WIDE_NOTICE",
    description: "展示在所有页面顶部的通知条样式",
  },
];

export const STATUS_OPTIONS: {
  label: string;
  value: AnnouncementStatus;
  theme: "default" | "primary" | "secondary" | "danger";
}[] = [
  { label: "草稿", value: "DRAFT", theme: "default" },
  { label: "待生效", value: "SCHEDULED", theme: "primary" },
  { label: "展示中", value: "PUBLISHED", theme: "secondary" },
  { label: "已结束", value: "FINISHED", theme: "default" },
  { label: "已停用", value: "DISABLED", theme: "danger" },
];

export function positionLabel(position: AnnouncementPosition): string {
  return POSITION_OPTIONS.find((item) => item.value === position)?.label ?? "-";
}

export function statusLabel(status: AnnouncementStatus): string {
  return STATUS_OPTIONS.find((item) => item.value === status)?.label ?? "-";
}

export function statusTheme(
  status: AnnouncementStatus
): "default" | "primary" | "secondary" | "danger" {
  return (
    STATUS_OPTIONS.find((item) => item.value === status)?.theme ?? "default"
  );
}

export function statusDotState(
  status: AnnouncementStatus
): "default" | "success" | "warning" | "error" {
  switch (status) {
    case "PUBLISHED":
      return "success";
    case "SCHEDULED":
      return "warning";
    case "DISABLED":
      return "error";
    default:
      return "default";
  }
}

/**
 * 已发布 = 待生效 / 展示中 / 已结束。已发布公告不可直接编辑，需先停用。
 */
export function isPublishedStatus(status: AnnouncementStatus): boolean {
  return (
    status === "SCHEDULED" || status === "PUBLISHED" || status === "FINISHED"
  );
}

export function isEditableStatus(status: AnnouncementStatus): boolean {
  return status === "DRAFT" || status === "DISABLED";
}

export function isDeletableStatus(status: AnnouncementStatus): boolean {
  return status === "DRAFT" || status === "DISABLED";
}
