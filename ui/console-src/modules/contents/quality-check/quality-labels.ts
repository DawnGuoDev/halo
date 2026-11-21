import type { IssueType, Severity, IssueStatus } from "./types";

export const typeLabels: Record<IssueType, string> = {
  "broken-link": "失效链接",
  "missing-image": "图片缺失",
  "missing-excerpt": "缺少摘要",
};

export const severityLabels: Record<Severity, string> = {
  critical: "严重",
  normal: "一般",
  tip: "提示",
};

export const statusLabels: Record<IssueStatus, string> = {
  pending: "待处理",
  fixed: "已修复",
  ignored: "已忽略",
};

export const recordLabels = {
  detected: "系统发现",
  fixed: "标记已修复",
  ignored: "忽略问题",
  restored: "恢复为待处理",
} as const;

export const severityClass: Record<Severity, string> = {
  critical: "inline-flex items-center gap-1 text-red-600",
  normal: "inline-flex items-center gap-1 text-orange-600",
  tip: "inline-flex items-center gap-1 text-gray-500",
};

export const statusClass: Record<IssueStatus, string> = {
  pending: "inline-flex items-center gap-1.5 text-gray-700",
  fixed: "inline-flex items-center gap-1.5 text-emerald-600",
  ignored: "inline-flex items-center gap-1.5 text-gray-400",
};

export const dotClass: Record<IssueStatus, string> = {
  pending: "bg-orange-400",
  fixed: "bg-emerald-500",
  ignored: "bg-gray-300",
};

export const severityDotClass: Record<Severity, string> = {
  critical: "bg-red-500",
  normal: "bg-orange-400",
  tip: "bg-gray-300",
};

export const typeDotClass: Record<IssueType, string> = {
  "broken-link": "bg-red-400",
  "missing-image": "bg-blue-400",
  "missing-excerpt": "bg-orange-300",
};
