import type {
  CheckProgress,
  ContentQualityDataSource,
  IssueFilters,
  ListResult,
  QualityStats,
} from "../types";

/**
 * axios 兼容的最小请求器（Halo 的 @halo-dev/api-client 导出同款实例）。
 * 使用无泛型的 request 签名，以便与 axiosInstance 的结构直接兼容。
 */
export interface ContentQualityRequest {
  get<T = unknown>(
    url: string,
    config?: { params?: Record<string, unknown> }
  ): Promise<{ data: T }>;
  post<T = unknown>(url: string, data?: unknown): Promise<{ data: T }>;
}

export interface ContentQualityServiceOptions {
  request: ContentQualityRequest;
  /**
   * 资源接口基址（通常为 /api/v1alpha1）。质量检查端点与权限尚未在 Halo
   * 中定义，路径集中在 baseUrl 便于后续按 Spec 调整。
   */
  baseUrl?: string;
}

/**
 * 真实接口适配（拟议契约，尚未在 Halo 后端实现）。
 * 页面仅依赖 ContentQualityDataSource；Mock 与真实接口可替换注入。
 */
export function createContentQualityDataSource(
  options: ContentQualityServiceOptions
): ContentQualityDataSource {
  const baseUrl = options.baseUrl ?? "/api/v1alpha1";
  const { request } = options;
  return {
    async list(filters: IssueFilters, page: number, size: number) {
      const { data } = await request.get<ListResult>(
        `${baseUrl}/contentqualityissues`,
        { params: { ...filters, page, size } }
      );
      return data;
    },
    async getSummary() {
      const { data } = await request.get<QualityStats>(
        `${baseUrl}/contentqualityissues/-/summary`
      );
      return data;
    },
    async markFixed(ids: string[]) {
      await request.post(`${baseUrl}/contentqualityissues/-/mark-fixed`, {
        ids,
      });
    },
    async ignore(ids: string[], reason: string) {
      const { data } = await request.post<{
        ignored: number;
        skipped: number;
      }>(`${baseUrl}/contentqualityissues/-/ignore`, { ids, reason });
      return data;
    },
    async restore(ids: string[]) {
      await request.post(`${baseUrl}/contentqualityissues/-/restore`, { ids });
    },
    async startRecheck() {
      const { data } = await request.post<{ scanId: string }>(
        `${baseUrl}/contentqualitychecks`,
        {}
      );
      return data;
    },
    async getRecheckStatus(scanId: string): Promise<CheckProgress> {
      const { data } = await request.get<CheckProgress>(
        `${baseUrl}/contentqualitychecks/${scanId}/status`
      );
      return data;
    },
  };
}
