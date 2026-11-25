interface OperationalArticle {
  name: string;
  title: string;
  /** 首次从非公开变为公开的时间（PRD 待确认的开发口径） */
  firstPublishedAt: string;
  deleted: boolean;
}

interface OperationalComment {
  name: string;
  content: string;
  authorDisplayName: string;
  authorEmail: string;
  articleName: string;
  submittedAt: string;
  approved: boolean;
  processedState: "pending" | "rejected-off-page";
}

// 站点运营概览 · 本地 Mock（仅预览用，不作为产品需求或接口契约）
// 对齐回填所需的控制台查询能力：
//   getOverview({ rangeDays, includePending }) -> 指标 + 每日趋势 + 热门文章 + 待审核计数与最近 5 条
//   getArticleSummary(articleName)             -> 互动摘要（只读）
//   approveComment(name) / rejectComment(name) -> 通过（PATCH spec.approved）/ 驳回（仅移出本页列表）
// 回填时以控制台新增查询端点替换本文件实现，业务组件不感知 Mock。
//
// 场景参数（URL ?scenario=）：
//   default        正常数据
//   empty          7 天内无新增文章、无评论（30 天有数据，用于验证空态与区间切换）
//   pending-empty  没有待审核评论
//   hot-empty      区间内无文章评论（热门文章空态）
//   pending-error  待审核区域加载失败（验证局部失败与重试）
//   hot-error      热门文章区域加载失败
// 权限参数（URL ?permission=view）：无 system:comments:manage，隐藏通过/驳回。

const TODAY = new Date();
TODAY.setHours(12, 0, 0, 0);

const ARTICLES: OperationalArticle[] = [
  { name: "post-01", title: "欢迎使用 Halo：五分钟完成站点搭建", firstPublishedAt: dayOffset(0), deleted: false },
  { name: "post-02", title: "Halo 2.28 发布说明：评论审核与站点概览", firstPublishedAt: dayOffset(1), deleted: false },
  { name: "post-03", title: "主题开发指南：模板变量与扩展点", firstPublishedAt: dayOffset(2), deleted: false },
  { name: "post-04", title: "如何为博客配置独立域名与 HTTPS", firstPublishedAt: dayOffset(3), deleted: false },
  { name: "post-05", title: "我的写作工作流：从草稿到发布", firstPublishedAt: dayOffset(4), deleted: false },
  { name: "post-06", title: "秋季新品上架：页面搭建与商品组件", firstPublishedAt: dayOffset(5), deleted: false },
  { name: "post-07", title: "使用 Lucene 全文检索让站内搜索更快", firstPublishedAt: dayOffset(6), deleted: false },
  { name: "post-08", title: "关于我们：站点与作者介绍", firstPublishedAt: dayOffset(8), deleted: false },
  { name: "post-09", title: "插件开发入门：第一个插件", firstPublishedAt: dayOffset(9), deleted: false },
  { name: "post-10", title: "旧版迁移说明（已下线）", firstPublishedAt: dayOffset(10), deleted: true },
  { name: "post-11", title: "国庆假期运营安排", firstPublishedAt: dayOffset(12), deleted: false },
  { name: "post-12", title: "读者问答合集（第一期）", firstPublishedAt: dayOffset(14), deleted: false },
  { name: "post-13", title: "备份与恢复：保护你的站点数据", firstPublishedAt: dayOffset(17), deleted: false },
  { name: "post-14", title: "内容运营复盘：九月数据小结", firstPublishedAt: dayOffset(19), deleted: false },
  { name: "post-15", title: "评论组件接入指南", firstPublishedAt: dayOffset(21), deleted: false },
  { name: "post-16", title: "站点外观改版记录", firstPublishedAt: dayOffset(23), deleted: false },
  { name: "post-17", title: "九月中旬更新日志", firstPublishedAt: dayOffset(25), deleted: false },
  { name: "post-18", title: "订阅功能上线公告", firstPublishedAt: dayOffset(27), deleted: false },
  { name: "post-19", title: "机房维护通知（已完成）", firstPublishedAt: dayOffset(29), deleted: false },
  { name: "post-20", title: "九月主题模板推荐", firstPublishedAt: dayOffset(31), deleted: false },
];

// [文章 name, 距今天数, 评论数]，仅生成一级评论；提交时间按当天若干时刻分布
const COMMENT_PLAN: Array<[string, number, number]> = [
  ["post-06", 0, 1],
  ["post-02", 0, 2],
  ["post-01", 1, 6],
  ["post-06", 1, 2],
  ["post-03", 2, 4],
  ["post-02", 3, 1],
  ["post-04", 4, 2],
  ["post-06", 5, 3],
  ["post-05", 6, 2],
  ["post-07", 6, 1],
  ["post-08", 6, 1],
  // 上一周期（7–13 天前）
  ["post-08", 7, 4],
  ["post-09", 8, 3],
  ["post-11", 9, 2],
  ["post-10", 10, 2],
  ["post-12", 11, 3],
  ["post-06", 12, 3],
  ["post-01", 13, 5],
  // 更早（仅 30 天视图）
  ["post-12", 15, 4],
  ["post-13", 17, 3],
  ["post-14", 19, 2],
  ["post-15", 21, 6],
  ["post-16", 23, 2],
  ["post-17", 25, 3],
  ["post-18", 27, 4],
  ["post-19", 29, 1],
  ["post-02", 30, 2],
];

function dayOffset(daysAgo: number, hour = 10, minute = 0) {
  const d = new Date(TODAY);
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

const AUTHORS = [
  { displayName: "林小满", email: "lin.xiaoman@example.com" },
  { displayName: "", email: "suyang.blog@example.com" },
  { displayName: "Kai", email: "kai@example.com" },
  { displayName: "", email: "reader2025@example.com" },
  { displayName: "青柠", email: "sn0w.qingning@example.com" },
];

const COMMENT_BODIES = [
  "文章里的分步截图很清晰，按着做一遍就完成了，谢谢作者！",
  "请问主题升级后自定义样式会被覆盖吗？我这边改了 CSS 变量。",
  "这个思路很好用，已经转给团队的同事一起参考。",
  "先收藏了，周末慢慢实践。另外希望能出一期评论组件的进阶用法。",
  "文档中提到的目录结构和我本地不太一样，是版本差异吗？",
  "支持！希望后续能加上自定义时间范围的统计。",
  "第一段有个错别字：「布署」应为「部署」。",
  "已经按教程配置好域名和 HTTPS，证书自动续期也正常。",
  "想问下插件市场和这里说的扩展点是什么关系？",
  "内容很实用，期待下一期关于备份恢复的文章。",
  "这条评论包含一段可疑内容：<img src=x onerror=alert('xss')>，用于验证纯文本转义。",
  "缓存清理之后站点快了很多，性能配置的建议很到位。",
  "我们团队也是类似的写作流程，草稿和快照功能帮了大忙。",
  "能不能补充一下移动端排版需要注意的点？",
  "整体不错，但是示例里的接口路径好像少了一级版本号。",
  "感谢分享，正在把旧站迁移到 Halo，省了很多时间。",
  "评论附件支持图片吗？想补充截图。",
  "打卡学习，第一次用 Halo 建站。",
  "这个主题配色很舒服，已经换上了。",
  "转载的话需要注明出处吗？",
];

function buildComments(): OperationalComment[] {
  const comments: OperationalComment[] = [];
  let seq = 0;
  // 第 1、5、9 条为近期待审核；第 12、16 条与追加的 3 条更早，用于验证第 6 条补位
  const pendingFlags = new Set([1, 5, 9, 13, 16]);

  COMMENT_PLAN.forEach(([articleName, daysAgo, count]) => {
    for (let i = 0; i < count; i++) {
      const body = COMMENT_BODIES[seq % COMMENT_BODIES.length];
      const author =
        AUTHORS[(seq * 3 + daysAgo) % AUTHORS.length] || AUTHORS[0];
      const hour = 9 + ((seq * 7) % 10);
      const minute = (seq * 13) % 60;
      const pending = pendingFlags.has(seq) ? true : seq % 4 === 2;
      comments.push({
        name: `comment-${String(seq + 1).padStart(3, "0")}`,
        content: body,
        authorDisplayName: author.displayName,
        authorEmail: author.email,
        articleName,
        submittedAt: dayOffset(daysAgo, hour, minute),
        approved: !pending,
        processedState: "pending",
      });
      seq++;
    }
  });

  // 追加 3 条更早的待审核评论（用于验证「第 6 条补位」：初始列出最近 5 条，处理后由第 6 条补入）
  const extraPending: Array<[string, number, number]> = [
    ["post-03", 1, 0],
    ["post-04", 2, 0],
    ["post-12", 4, 0],
  ];
  extraPending.forEach(([articleName, daysAgo, i]) => {
    comments.push({
      name: `comment-pending-${i + 1}`,
      content: COMMENT_BODIES[(seq + i + 3) % COMMENT_BODIES.length],
      authorDisplayName: i === 1 ? "老读者" : "",
      authorEmail: `oldreader${i + 1}@example.com`,
      articleName,
      submittedAt: dayOffset(daysAgo, 8, 30 + i * 5),
      approved: false,
      processedState: "pending",
    });
  });

  return comments.sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
  );
}

let comments = buildComments();

// 演示初态：每次页面加载重置评论状态（页面内通过 / 驳回会改变内存数据）
export function resetOperationalMock() {
  comments = buildComments();
}

function currentScenario(): string {
  return (
    new URLSearchParams(window.location.search).get("scenario") || "default"
  );
}

export function canManageComments() {
  return new URLSearchParams(window.location.search).get("permission") !== "view";
}

function delay(ms = 220) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function startOfDay(d: Date) {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function dayKey(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${m}-${day}`;
}

function inRange(iso: string, from: Date, to: Date) {
  const t = new Date(iso).getTime();
  return t >= from.getTime() && t < to.getTime();
}

function rangeBounds(days: number) {
  const end = new Date(TODAY);
  end.setDate(end.getDate() + 1); // 含当天
  const start = startOfDay(new Date(TODAY));
  start.setDate(start.getDate() - (days - 1));
  const prevEnd = new Date(start);
  const prevStart = new Date(start);
  prevStart.setDate(prevStart.getDate() - days);
  return { start, end, prevStart, prevEnd };
}

function articleLabel(name: string) {
  const article = ARTICLES.find((a) => a.name === name);
  if (!article || article.deleted) return "已删除文章";
  return article.title;
}

function scenarioArticles(scenario: string): OperationalArticle[] {
  if (scenario !== "empty") return ARTICLES;
  return ARTICLES.map((a) => ({ ...a, firstPublishedAt: "" }));
}

function scenarioComments(scenario: string): OperationalComment[] {
  if (scenario === "empty") return [];
  return comments;
}

function isVisible(comment: OperationalComment) {
  return comment.processedState === "pending";
}

export interface OperationalOverview {
  rangeDays: number;
  rangeStart: string;
  rangeEnd: string;
  metrics: {
    posts: number;
    postsChange: number;
    comments: number;
    commentsChange: number;
    pending: number;
  };
  trend: {
    date: string;
    posts: number;
    comments: number;
  }[];
  hotArticles: Array<{
    name: string;
    title: string;
    deleted: boolean;
    publishTime: string;
    commentCount: number;
  }>;
  pendingComments: Array<{
    name: string;
    summary: string;
    author: string;
    articleName: string;
    articleTitle: string;
    submittedAt: string;
  }>;
}

function summarize(content: string, length = 60) {
  const flat = content.replace(/\s+/g, " ").trim();
  return flat.length > length ? `${flat.slice(0, length)}…` : flat;
}

function authorLabel(comment: OperationalComment) {
  return comment.authorDisplayName || comment.authorEmail.split("@")[0];
}

export async function getOverview(rangeDays: 7 | 30): Promise<OperationalOverview> {
  const scenario = currentScenario();
  await delay();
  const articles = scenarioArticles(scenario);
  const allComments = scenarioComments(scenario).filter(isVisible);
  const { start, end, prevStart, prevEnd } = rangeBounds(rangeDays);

  const countPosts = (from: Date, to: Date) =>
    articles.filter((a) => a.firstPublishedAt && inRange(a.firstPublishedAt, from, to))
      .length;
  const countComments = (from: Date, to: Date) =>
    allComments.filter((c) => inRange(c.submittedAt, from, to)).length;

  const posts = countPosts(start, end);
  const postsPrev = countPosts(prevStart, prevEnd);
  const commentCount = countComments(start, end);
  const commentsPrev = countComments(prevStart, prevEnd);

  const trend: OperationalOverview["trend"] = [];
  for (let i = 0; i < rangeDays; i++) {
    const day = new Date(start);
    day.setDate(day.getDate() + i);
    const next = new Date(day);
    next.setDate(next.getDate() + 1);
    trend.push({
      date: dayKey(day),
      posts: countPosts(day, next),
      comments: countComments(day, next),
    });
  }

  const hotMap = new Map<string, { count: number; last: string }>();
  allComments
    .filter((c) => inRange(c.submittedAt, start, end))
    .forEach((c) => {
      const entry = hotMap.get(c.articleName) || { count: 0, last: "" };
      entry.count += 1;
      if (c.submittedAt > entry.last) entry.last = c.submittedAt;
      hotMap.set(c.articleName, entry);
    });

  let hotArticles: OperationalOverview["hotArticles"] = [];
  if (scenario !== "hot-empty") {
    hotArticles = [...hotMap.entries()]
      .map(([name, entry]) => {
        const article = articles.find((a) => a.name === name);
        return {
          name,
          title: articleLabel(name),
          deleted: !article || article.deleted,
          publishTime: article?.firstPublishedAt || "",
          commentCount: entry.count,
        };
      })
      .sort((a, b) => {
        if (b.commentCount !== a.commentCount) return b.commentCount - a.commentCount;
        return new Date(b.publishTime).getTime() - new Date(a.publishTime).getTime();
      })
      .slice(0, 5);
  }

  const pendingAll =
    scenario === "pending-empty"
      ? []
      : allComments
          .filter((c) => !c.approved)
          .sort(
            (a, b) =>
              new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
          );

  return {
    rangeDays,
    rangeStart: dayKey(start),
    rangeEnd: dayKey(new Date(end.getTime() - 1)),
    metrics: {
      posts,
      postsChange: posts - postsPrev,
      comments: commentCount,
      commentsChange: commentCount - commentsPrev,
      pending: scenario === "pending-empty" ? 0 : pendingAll.length,
    },
    trend,
    hotArticles,
    pendingComments: pendingAll.slice(0, 5).map((c) => ({
      name: c.name,
      summary: summarize(c.content),
      author: authorLabel(c),
      articleName: c.articleName,
      articleTitle: articleLabel(c.articleName),
      submittedAt: c.submittedAt,
    })),
  };
}

export async function getPendingState(): Promise<{ failed: boolean }> {
  await delay(120);
  return { failed: currentScenario() === "pending-error" };
}

export async function getHotState(): Promise<{ failed: boolean }> {
  await delay(120);
  return { failed: currentScenario() === "hot-error" };
}

export interface ArticleInteractionSummary {
  name: string;
  title: string;
  publishTime: string;
  totalComments: number;
  approvedComments: number;
  pendingComments: number;
  recentComments: Array<{
    name: string;
    author: string;
    submittedAt: string;
    approved: boolean;
    content: string;
  }>;
}

export async function getArticleSummary(
  articleName: string
): Promise<ArticleInteractionSummary | undefined> {
  await delay();
  const article = scenarioArticles(currentScenario()).find(
    (a) => a.name === articleName
  );
  if (!article) return undefined;
  const own = scenarioComments(currentScenario())
    .filter((c) => c.articleName === articleName && isVisible(c))
    .sort(
      (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );
  return {
    name: article.name,
    title: article.deleted ? "已删除文章" : article.title,
    publishTime: article.firstPublishedAt,
    totalComments: own.length,
    approvedComments: own.filter((c) => c.approved).length,
    pendingComments: own.filter((c) => !c.approved).length,
    recentComments: own.slice(0, 5).map((c) => ({
      name: c.name,
      author: authorLabel(c),
      submittedAt: c.submittedAt,
      approved: c.approved,
      content: c.content,
    })),
  };
}

export interface CommentDetail {
  name: string;
  content: string;
  author: string;
  authorEmail: string;
  articleName: string;
  articleTitle: string;
  submittedAt: string;
  approved: boolean;
  processed: boolean;
  history: Array<{ name: string; author: string; content: string; submittedAt: string }>;
}

export async function getCommentDetail(
  name: string
): Promise<CommentDetail | undefined> {
  await delay(180);
  const comment = comments.find((c) => c.name === name);
  if (!comment) return undefined;
  const history = comments
    .filter(
      (c) =>
        c.articleName === comment.articleName &&
        c.approved &&
        c.processedState === "pending" &&
        c.name !== name
    )
    .slice(0, 3)
    .map((c) => ({
      name: c.name,
      author: authorLabel(c),
      content: c.content,
      submittedAt: c.submittedAt,
    }));
  return {
    name: comment.name,
    content: comment.content,
    author: authorLabel(comment),
    authorEmail: comment.authorEmail,
    articleName: comment.articleName,
    articleTitle: articleLabel(comment.articleName),
    submittedAt: comment.submittedAt,
    approved: comment.approved,
    processed: comment.processedState !== "pending",
    history,
  };
}

export async function approveComment(name: string): Promise<{ ok: boolean }> {
  await delay(200);
  const comment = comments.find((c) => c.name === name);
  if (!comment || comment.processedState !== "pending" || comment.approved) {
    return { ok: false };
  }
  comment.approved = true;
  return { ok: true };
}

export async function rejectComment(name: string): Promise<{ ok: boolean }> {
  await delay(200);
  const comment = comments.find((c) => c.name === name);
  if (!comment || comment.processedState !== "pending" || comment.approved) {
    return { ok: false };
  }
  // 驳回不新增状态：保持未通过、不公开，仅移出本页待审核列表
  comment.processedState = "rejected-off-page";
  return { ok: true };
}

