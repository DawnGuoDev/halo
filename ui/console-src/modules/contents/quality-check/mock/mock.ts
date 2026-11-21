import type {
  CheckProgress,
  ContentQualityDataSource,
  IssueFilters,
  IssueRecord,
  IssueCopy,
  ListResult,
  QualityIssue,
  QualityStats,
} from "../types";
import { issueCopyZhCN } from "./issue-copy.zh-CN";

type SeedIssue = Pick<
  QualityIssue,
  | "id"
  | "description"
  | "articleTitle"
  | "articleSlug"
  | "location"
  | "type"
  | "severity"
  | "status"
  | "detectedAt"
  | "snippet"
  | "suggestion"
  | "ignoreReason"
  | "records"
>;

const detected = (at: string): IssueRecord => ({
  id: `detected-${at}`,
  action: "detected",
  operator: "system",
  at,
  note: "系统巡检发现",
});

const seed: SeedIssue[] = [
  {
    id: "q-01",
    description: "正文第 3 段外链已返回 404",
    articleTitle: "使用 Halo 搭建个人知识库的完整指南",
    articleSlug: "halo-knowledge-base-guide",
    location: "正文 · 第 3 段",
    type: "broken-link",
    severity: "critical",
    status: "pending",
    detectedAt: "2026-11-20 09:12",
    snippet: "参考链接：https://example.com/halo-docs-v1（已失效，HTTP 404）",
    suggestion: "将链接更新为最新文档地址，或移除失效引用。",
    records: [detected("2026-11-20 09:12")],
  },
  {
    id: "q-02",
    description: "封面图资源缺失，文章首屏显示占位",
    articleTitle: "我的 2026 年度写作计划",
    articleSlug: "writing-plan-2026",
    location: "封面 · 头图",
    type: "missing-image",
    severity: "critical",
    status: "pending",
    detectedAt: "2026-11-20 09:12",
    snippet: "封面图：/upload/2026/plan-cover.png（返回 404）",
    suggestion: "重新上传封面图，或在编辑器中选择已有附件。",
    records: [detected("2026-11-20 09:12")],
  },
  {
    id: "q-03",
    description: "文章未填写摘要，列表页直接截取正文",
    articleTitle: "如何为 Halo 主题编写自定义模板",
    articleSlug: "halo-theme-custom-template",
    location: "文章设置 · 摘要",
    type: "missing-excerpt",
    severity: "normal",
    status: "pending",
    detectedAt: "2026-11-20 09:12",
    snippet: "摘要在文章设置中为空，列表将回退到正文前 160 个字符。",
    suggestion: "在文章设置中补充 1-2 句摘要，说明文章解决的问题。",
    records: [detected("2026-11-20 09:12")],
  },
  {
    id: "q-04",
    description: "友情链接「旧博客归档」域名已过期",
    articleTitle: "友链与常用资源整理",
    articleSlug: "friends-links",
    location: "正文 · 友链列表",
    type: "broken-link",
    severity: "normal",
    status: "pending",
    detectedAt: "2026-11-20 09:12",
    snippet: "旧博客归档 → http://old-blog.example.org/",
    suggestion: "删除该条目，或替换为新的可访问地址。",
    records: [detected("2026-11-20 09:12")],
  },
  {
    id: "q-05",
    description: "正文中的截图文件名带空格，加载失败",
    articleTitle: "评论组件迁移踩坑记录",
    articleSlug: "comment-widget-migration",
    location: "正文 · 第 5 段插图",
    type: "missing-image",
    severity: "normal",
    status: "pending",
    detectedAt: "2026-11-20 09:12",
    snippet: "插图：/upload/comment migration 01.png",
    suggestion: "重命名文件并重新插入，避免文件名中的空格。",
    records: [detected("2026-11-20 09:12")],
  },
  {
    id: "q-06",
    description: "摘要超过推荐长度，首页卡片展示被截断",
    articleTitle: "站点性能优化实践合集",
    articleSlug: "performance-optimization",
    location: "文章设置 · 摘要",
    type: "missing-excerpt",
    severity: "tip",
    status: "pending",
    detectedAt: "2026-11-20 09:12",
    snippet: "当前摘要 286 字，推荐不超过 120 字。",
    suggestion: "精简摘要，保留结论和适用场景。",
    records: [detected("2026-11-20 09:12")],
  },
  {
    id: "q-07",
    description: "文末参考链接不可访问",
    articleTitle: "R2DBC 与响应式数据访问入门",
    articleSlug: "r2dbc-reactive-data",
    location: "正文 · 参考资料",
    type: "broken-link",
    severity: "normal",
    status: "fixed",
    detectedAt: "2026-11-19 18:40",
    snippet: "参考链接：https://example.org/reactive-guide（连接超时）",
    suggestion: "替换为 Spring 官方响应式文档地址。",
    records: [
      detected("2026-11-19 18:40"),
      {
        id: "fixed-q07",
        action: "fixed",
        operator: "current",
        at: "2026-11-20 10:05",
        note: "已替换为官方文档地址",
      },
    ],
  },
  {
    id: "q-08",
    description: "正文插图地址指向草稿附件，无法公开访问",
    articleTitle: "插件开发快速上手",
    articleSlug: "plugin-dev-quickstart",
    location: "正文 · 第 2 段插图",
    type: "missing-image",
    severity: "critical",
    status: "fixed",
    detectedAt: "2026-11-19 18:40",
    snippet: "插图：/upload/draft/plugin-flow.png（草稿附件）",
    suggestion: "从公开附件库重新选择图片。",
    records: [
      detected("2026-11-19 18:40"),
      {
        id: "fixed-q08",
        action: "fixed",
        operator: "current",
        at: "2026-11-20 10:20",
        note: "已重新上传为公开附件",
      },
    ],
  },
  {
    id: "q-09",
    description: "文章未填写摘要",
    articleTitle: "写给新手的 Markdown 排版建议",
    articleSlug: "markdown-tips",
    location: "文章设置 · 摘要",
    type: "missing-excerpt",
    severity: "tip",
    status: "fixed",
    detectedAt: "2026-11-19 18:40",
    snippet: "摘要在文章设置中为空。",
    suggestion: "补充摘要以改善列表可读性。",
    records: [
      detected("2026-11-19 18:40"),
      {
        id: "fixed-q09",
        action: "fixed",
        operator: "current",
        at: "2026-11-20 11:02",
        note: "已补充摘要",
      },
    ],
  },
  {
    id: "q-10",
    description: "文中外链被目标站点标记为风险，已忽略保留",
    articleTitle: "常用设计资源清单",
    articleSlug: "design-resources",
    location: "正文 · 资源列表",
    type: "broken-link",
    severity: "tip",
    status: "ignored",
    detectedAt: "2026-11-18 15:30",
    snippet: "https://example.net/icons（目标站点拒绝访问）",
    suggestion: "如后续恢复访问可更新，否则移除。",
    ignoreReason: "资源站维护中，链接暂时不可用但会恢复",
    records: [
      detected("2026-11-18 15:30"),
      {
        id: "ignored-q10",
        action: "ignored",
        operator: "current",
        at: "2026-11-19 09:00",
        note: "资源站维护中，链接暂时不可用但会恢复",
      },
    ],
  },
  {
    id: "q-11",
    description: "旧版封面图已删除，暂以文字标题代替",
    articleTitle: "2025 年度回顾",
    articleSlug: "annual-review-2025",
    location: "封面 · 头图",
    type: "missing-image",
    severity: "normal",
    status: "ignored",
    detectedAt: "2026-11-18 15:30",
    snippet: "封面图：/upload/2025/annual-cover.jpg",
    suggestion: "归档文章保留现状即可。",
    ignoreReason: "归档文章，不再维护配图",
    records: [
      detected("2026-11-18 15:30"),
      {
        id: "ignored-q11",
        action: "ignored",
        operator: "current",
        at: "2026-11-18 16:12",
        note: "归档文章，不再维护配图",
      },
    ],
  },
  {
    id: "q-12",
    description: "摘要为空，但文章为草稿",
    articleTitle: "未命名草稿：关于缓存",
    articleSlug: "draft-cache",
    location: "文章设置 · 摘要",
    type: "missing-excerpt",
    severity: "tip",
    status: "ignored",
    detectedAt: "2026-11-18 15:30",
    snippet: "摘要为空。",
    suggestion: "发布前补充摘要。",
    ignoreReason: "草稿整理中，待发布前补齐",
    records: [
      detected("2026-11-18 15:30"),
      {
        id: "ignored-q12",
        action: "ignored",
        operator: "current",
        at: "2026-11-18 17:00",
        note: "草稿整理中，待发布前补齐",
      },
    ],
  },
  {
    id: "q-13",
    description: "外部图床返回 403",
    articleTitle: "Halo 插件市场使用体验",
    articleSlug: "plugin-market-review",
    location: "正文 · 第 4 段插图",
    type: "missing-image",
    severity: "normal",
    status: "pending",
    detectedAt: "2026-11-20 09:12",
    snippet: "插图：https://img.example.io/market-01.png（HTTP 403）",
    suggestion: "下载图片后上传到本地附件库。",
    records: [detected("2026-11-20 09:12")],
  },
  {
    id: "q-14",
    description: "文内锚点链接指向已合并的章节",
    articleTitle: "主题开发常见问题",
    articleSlug: "theme-dev-faq",
    location: "正文 · 目录",
    type: "broken-link",
    severity: "tip",
    status: "pending",
    detectedAt: "2026-11-20 09:12",
    snippet: "链接：#安装主题（章节已并入“快速开始”）",
    suggestion: "更新锚点为 #快速开始。",
    records: [detected("2026-11-20 09:12")],
  },
  {
    id: "q-15",
    description: "摘要与正文开头高度重复",
    articleTitle: "从零开始部署 Halo",
    articleSlug: "deploy-halo",
    location: "文章设置 · 摘要",
    type: "missing-excerpt",
    severity: "normal",
    status: "pending",
    detectedAt: "2026-11-20 09:12",
    snippet: "摘要与正文首段前 80 字重复。",
    suggestion: "改写摘要，突出部署收益与前置条件。",
    records: [detected("2026-11-20 09:12")],
  },
  {
    id: "q-16",
    description: "两处图片链接使用 http，混合内容被拦截",
    articleTitle: "HTTPS 迁移检查清单",
    articleSlug: "https-migration",
    location: "正文 · 第 2、6 段",
    type: "missing-image",
    severity: "critical",
    status: "pending",
    detectedAt: "2026-11-20 09:12",
    snippet: "图片地址仍以 http:// 开头，浏览器阻止加载。",
    suggestion: "将图片地址改为 https，或迁移至附件库。",
    records: [detected("2026-11-20 09:12")],
  },
  {
    id: "q-17",
    description: "导航栏外链拼写错误",
    articleTitle: "关于本站",
    articleSlug: "about",
    location: "页面 · 导航区域",
    type: "broken-link",
    severity: "tip",
    status: "pending",
    detectedAt: "2026-11-20 09:12",
    snippet: "github.com/dawnguodev/hlalo → 不存在的仓库",
    suggestion: "修正拼写为 /halo。",
    records: [detected("2026-11-20 09:12")],
  },
  {
    id: "q-18",
    description: "文章列表中的缩略图丢失",
    articleTitle: "博客写作的 10 个小习惯",
    articleSlug: "writing-habits",
    location: "列表 · 缩略图",
    type: "missing-image",
    severity: "normal",
    status: "fixed",
    detectedAt: "2026-11-19 18:40",
    snippet: "缩略图：/upload/habits.png（返回 404）",
    suggestion: "重新上传缩略图。",
    records: [
      detected("2026-11-19 18:40"),
      {
        id: "fixed-q18",
        action: "fixed",
        operator: "current",
        at: "2026-11-20 09:30",
        note: "已上传新的缩略图",
      },
    ],
  },
  {
    id: "q-19",
    description: "未填写摘要，但设置了自定义 SEO 描述",
    articleTitle: "Halo 站点 SEO 设置",
    articleSlug: "halo-seo",
    location: "文章设置 · 摘要",
    type: "missing-excerpt",
    severity: "tip",
    status: "pending",
    detectedAt: "2026-11-20 09:12",
    snippet: "摘要为空；SEO 描述已填写。",
    suggestion: "如站点使用摘要生成卡片，请补充摘要。",
    records: [detected("2026-11-20 09:12")],
  },
  {
    id: "q-20",
    description: "附件下载链接使用内网地址",
    articleTitle: "内网部署经验分享",
    articleSlug: "intranet-deploy",
    location: "正文 · 附件下载",
    type: "broken-link",
    severity: "critical",
    status: "fixed",
    detectedAt: "2026-11-19 18:40",
    snippet: "附件：http://192.168.1.20/files/guide.pdf",
    suggestion: "替换为公开可访问的附件地址。",
    records: [
      detected("2026-11-19 18:40"),
      {
        id: "fixed-q20",
        action: "fixed",
        operator: "current",
        at: "2026-11-20 08:55",
        note: "已改为公网附件地址",
      },
    ],
  },
];

export function seedIssues(
  copy: Record<string, IssueCopy> = issueCopyZhCN
): QualityIssue[] {
  return seed.map((issue) => ({
    ...issue,
    description: copy[issue.id]?.description ?? issue.description,
    articleTitle: copy[issue.id]?.articleTitle ?? issue.articleTitle,
    snippet: copy[issue.id]?.snippet ?? issue.snippet,
    suggestion: copy[issue.id]?.suggestion ?? issue.suggestion,
    ignoreReason: copy[issue.id]?.ignoreReason ?? issue.ignoreReason,
    records: issue.records.map((record) => ({ ...record })),
  }));
}

function matchKeyword(issue: QualityIssue, keyword: string) {
  const q = keyword.trim().toLowerCase();
  if (!q) return true;
  return (
    issue.articleTitle.toLowerCase().includes(q) ||
    issue.description.toLowerCase().includes(q)
  );
}

export const CURRENT_TIME = "2026-11-21 10:30";

export interface QualityApi {
  list(filters: IssueFilters, page: number, size: number): ListResult;
  stats(): QualityStats;
  markFixed(ids: string[]): void;
  ignore(ids: string[], reason: string): number;
  restore(ids: string[]): void;
  runCheck(state: CheckProgress): void;
  reset(): void;
}

export function createMockApi(copy?: Record<string, IssueCopy>): QualityApi {
  const issues: QualityIssue[] = seedIssues(copy);
  return {
    list(filters, page, size) {
      const filtered = issues.filter(
        (issue) =>
          matchKeyword(issue, filters.keyword) &&
          (!filters.type || issue.type === filters.type) &&
          (!filters.severity || issue.severity === filters.severity) &&
          (!filters.status || issue.status === filters.status)
      );
      const start = (page - 1) * size;
      return {
        items: filtered.slice(start, start + size),
        total: filtered.length,
      };
    },
    stats() {
      const pending = issues.filter((issue) => issue.status === "pending");
      return {
        pending: pending.length,
        articles: new Set(pending.map((issue) => issue.articleSlug)).size,
        critical: pending.filter((issue) => issue.severity === "critical")
          .length,
        ignored: issues.filter((issue) => issue.status === "ignored").length,
      };
    },
    markFixed(ids) {
      issues.forEach((issue) => {
        if (ids.includes(issue.id) && issue.status === "pending") {
          issue.status = "fixed";
          issue.records.push({
            id: `fixed-${issue.id}-${issue.records.length}`,
            action: "fixed",
            operator: "current",
            at: CURRENT_TIME,
            note: "编辑人员在问题详情中标记已修复",
          });
        }
      });
    },
    ignore(ids, reason) {
      let count = 0;
      issues.forEach((issue) => {
        if (ids.includes(issue.id) && issue.status === "pending") {
          issue.status = "ignored";
          issue.ignoreReason = reason;
          issue.records.push({
            id: `ignored-${issue.id}-${issue.records.length}`,
            action: "ignored",
            operator: "current",
            at: CURRENT_TIME,
            note: reason,
          });
          count += 1;
        }
      });
      return count;
    },
    restore(ids) {
      issues.forEach((issue) => {
        if (ids.includes(issue.id) && issue.status === "ignored") {
          issue.status = "pending";
          issue.ignoreReason = undefined;
          issue.records.push({
            id: `restored-${issue.id}-${issue.records.length}`,
            action: "restored",
            operator: "current",
            at: CURRENT_TIME,
            note: "恢复为待处理",
          });
        }
      });
    },
    runCheck(state) {
      if (state.state === "success") {
        const pendingIssues = issues.filter(
          (issue) => issue.status === "pending"
        );
        const target = pendingIssues[pendingIssues.length - 1];
        if (target) {
          target.detectedAt = CURRENT_TIME;
          target.records.push({
            id: `detected-${target.id}-${target.records.length}`,
            action: "detected",
            operator: "system",
            at: CURRENT_TIME,
            note: "重新检查再次发现该问题",
          });
        }
      }
    },
    reset() {
      issues.splice(0, issues.length, ...seedIssues(copy));
    },
  };
}

/** 异步适配器，接口形状与真实 ContentQualityDataSource 一致。 */
export function createMockDataSource(
  api: QualityApi
): ContentQualityDataSource {
  return {
    async list(filters, page, size) {
      return api.list(filters, page, size);
    },
    async getSummary() {
      return api.stats();
    },
    async markFixed(ids) {
      api.markFixed(ids);
    },
    async ignore(ids, reason) {
      const eligible = ids.filter(
        (id) =>
          api
            .list({ keyword: "", type: "", severity: "", status: "" }, 1, 100)
            .items.find((i) => i.id === id)?.status === "pending"
      );
      api.ignore(eligible, reason);
      return {
        ignored: eligible.length,
        skipped: ids.length - eligible.length,
      };
    },
    async restore(ids) {
      api.restore(ids);
    },
    async startRecheck() {
      return { scanId: "mock-scan" };
    },
    async getRecheckStatus() {
      return { state: "idle", percent: 0, message: "" };
    },
  };
}
