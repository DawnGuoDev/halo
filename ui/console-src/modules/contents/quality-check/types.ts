export type IssueType = "broken-link" | "missing-image" | "missing-excerpt";
export type Severity = "critical" | "normal" | "tip";
export type IssueStatus = "pending" | "fixed" | "ignored";

export interface IssueCopy {
  description: string;
  articleTitle: string;
  snippet: string;
  suggestion: string;
  ignoreReason?: string;
}

export interface QualityIssue {
  id: string;
  description: string;
  articleTitle: string;
  articleSlug: string;
  location: string;
  type: IssueType;
  severity: Severity;
  status: IssueStatus;
  detectedAt: string;
  snippet: string;
  suggestion: string;
  ignoreReason?: string;
  records: IssueRecord[];
}

export interface IssueRecord {
  id: string;
  action: "detected" | "fixed" | "ignored" | "restored";
  operator: string;
  at: string;
  note?: string;
}

export interface IssueFilters {
  keyword: string;
  type: IssueType | "";
  severity: Severity | "";
  status: IssueStatus | "";
}

export type CheckState = "idle" | "running" | "failed" | "success";

export interface CheckProgress {
  state: CheckState;
  percent: number;
  message: string;
  finishedAt?: string;
}

export interface QualityStats {
  pending: number;
  articles: number;
  critical: number;
  ignored: number;
}

export interface ListResult {
  items: QualityIssue[];
  total: number;
}

/**
 * 质量检查数据契约（拟议）。
 * Halo 仓库当前没有该接口；接入时由后端按此形状实现或由 Spec 节点调整。
 */
export interface ContentQualityDataSource {
  list(filters: IssueFilters, page: number, size: number): Promise<ListResult>;
  getSummary(): Promise<QualityStats>;
  markFixed(ids: string[]): Promise<void>;
  ignore(
    ids: string[],
    reason: string
  ): Promise<{ ignored: number; skipped: number }>;
  restore(ids: string[]): Promise<void>;
  startRecheck(): Promise<{ scanId: string }>;
  getRecheckStatus(scanId: string): Promise<CheckProgress>;
}
