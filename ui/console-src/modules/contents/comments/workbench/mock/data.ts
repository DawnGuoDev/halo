import type {
  CommentExtension,
  ListedComment,
  ListedReply,
  SubjectExtension,
} from "../types";

const BASE_TIME = Date.parse("2026-11-20T09:00:00Z");

function iso(minutesAgo: number) {
  return new Date(BASE_TIME - minutesAgo * 60_000).toISOString();
}

const LONG_PARAGRAPH = Array.from({ length: 6 })
  .map(
    (_, index) =>
      `第 ${index + 1} 段：这篇文章对 Halo 主题模板的拆解很实用，我按步骤给站点加上了自定义侧边栏，移动端也做了适配。`
  )
  .join("<br />");

const posts = [
  {
    apiVersion: "content.halo.run/v1alpha1",
    kind: "Post",
    metadata: { name: "post-halo-theme-dev", creationTimestamp: iso(9000) },
    spec: { title: "从零开发一个 Halo 主题：模板、扩展点与调试" },
    status: { permalink: "https://demo.halo.run/archives/halo-theme-dev" },
  },
  {
    apiVersion: "content.halo.run/v1alpha1",
    kind: "Post",
    metadata: {
      name: "post-writing-workflow",
      creationTimestamp: iso(8600),
      deletionTimestamp: iso(30),
    },
    spec: { title: "我的写作工作流：从草稿到发布", deleted: true },
    status: { permalink: "https://demo.halo.run/archives/writing-workflow" },
  },
  {
    apiVersion: "content.halo.run/v1alpha1",
    kind: "Post",
    metadata: { name: "post-comment-plugin", creationTimestamp: iso(8100) },
    spec: { title: "为 Halo 站点接入评论插件" },
    status: { permalink: "https://demo.halo.run/archives/comment-plugin" },
  },
  {
    apiVersion: "content.halo.run/v1alpha1",
    kind: "Post",
    metadata: { name: "post-plugin-dev", creationTimestamp: iso(7200) },
    spec: { title: "Halo 插件开发入门：从扩展点到 UI 模块" },
    status: { permalink: "https://demo.halo.run/archives/plugin-dev" },
  },
];

const pages = [
  {
    apiVersion: "content.halo.run/v1alpha1",
    kind: "SinglePage",
    metadata: { name: "page-about", creationTimestamp: iso(10000) },
    spec: { title: "关于本站" },
    status: { permalink: "https://demo.halo.run/about" },
  },
  {
    apiVersion: "content.halo.run/v1alpha1",
    kind: "SinglePage",
    metadata: { name: "page-guestbook", creationTimestamp: iso(9800) },
    spec: { title: "留言板" },
    status: { permalink: "https://demo.halo.run/guestbook" },
  },
];

interface Seed {
  name: string;
  subjectKind: "Post" | "SinglePage";
  subjectName: string;
  owner: {
    kind: "User" | "Email";
    name: string;
    displayName?: string;
    website?: string;
  };
  raw: string;
  approved: boolean;
  approvedTime?: string;
  minutesAgo: number;
  hidden?: boolean;
  replyCount?: number;
  pendingReplyCount?: number;
  /** When true the subject lookup returns null (deleted / inaccessible). */
  subjectUnavailable?: boolean;
  ipAddress?: string;
}

function html(raw: string) {
  if (raw.includes("<")) {
    return raw;
  }
  return `<p>${raw}</p>`;
}

const seeds: Seed[] = [
  {
    name: "comment-001",
    subjectKind: "Post",
    subjectName: "post-halo-theme-dev",
    owner: { kind: "User", name: "lin-wei", displayName: "林伟" },
    raw: LONG_PARAGRAPH,
    approved: false,
    minutesAgo: 12,
    replyCount: 2,
    pendingReplyCount: 1,
    ipAddress: "203.0.113.24",
  },
  {
    name: "comment-002",
    subjectKind: "Post",
    subjectName: "post-halo-theme-dev",
    owner: { kind: "User", name: "chen-yu", displayName: "陈雨" },
    raw: "第三段里的扩展点示例能单独说明一下吗？我这边想给文章详情页加一个阅读进度条。",
    approved: false,
    minutesAgo: 35,
    replyCount: 2,
    pendingReplyCount: 0,
    ipAddress: "198.51.100.8",
  },
  {
    name: "comment-003",
    subjectKind: "SinglePage",
    subjectName: "page-about",
    owner: {
      kind: "Email",
      name: "reader@example.com",
      displayName: "一位读者",
      website: "https://reader.example.com",
    },
    raw: "自我介绍写得很真诚。请问站点用的字体是自己托管还是 CDN？加载速度看起来不错。",
    approved: false,
    minutesAgo: 58,
    ipAddress: "192.0.2.61",
  },
  {
    name: "comment-004",
    subjectKind: "Post",
    subjectName: "post-writing-workflow",
    owner: {
      kind: "Email",
      name: "spam-bot@example.net",
      displayName: "SEO 推广",
    },
    raw: "点击查看低价外链套餐，提升网站权重，联系方式见主页。",
    approved: false,
    minutesAgo: 73,
    subjectUnavailable: true,
    ipAddress: "198.51.100.203",
  },
  {
    name: "comment-005",
    subjectKind: "Post",
    subjectName: "post-comment-plugin",
    owner: { kind: "User", name: "zhao-min", displayName: "赵敏" },
    raw: "评论插件接入后，待审核队列可以在控制台批量处理吗？目前需要逐条点开，效率有点低。",
    approved: true,
    approvedTime: iso(240),
    minutesAgo: 300,
    replyCount: 1,
    ipAddress: "203.0.113.90",
  },
  {
    name: "comment-006",
    subjectKind: "SinglePage",
    subjectName: "page-guestbook",
    owner: {
      kind: "Email",
      name: "guest@example.org",
      displayName: "路过的访客",
    },
    raw: "路过留个言，主题配色很舒服，希望后续能增加深色模式。",
    approved: true,
    approvedTime: iso(600),
    minutesAgo: 720,
    ipAddress: "192.0.2.17",
  },
  {
    name: "comment-007",
    subjectKind: "Post",
    subjectName: "post-plugin-dev",
    owner: { kind: "User", name: "wu-hao", displayName: "吴昊" },
    raw: "能否补充一下插件 UI bundle 的调试方式？修改后每次都要重新打包，体验一般。",
    approved: false,
    minutesAgo: 880,
    replyCount: 1,
    ipAddress: "203.0.113.144",
  },
  {
    name: "comment-008",
    subjectKind: "Post",
    subjectName: "post-halo-theme-dev",
    owner: {
      kind: "Email",
      name: "tester@example.com",
      displayName: "测试账号",
    },
    raw: "这是一条重复提交的测试评论，请忽略。",
    approved: false,
    approvedTime: iso(1000),
    minutesAgo: 1100,
    hidden: true,
    ipAddress: "192.0.2.230",
  },
  {
    name: "comment-009",
    subjectKind: "Post",
    subjectName: "post-writing-workflow",
    owner: { kind: "User", name: "sun-li", displayName: "孙丽" },
    raw: "写作工作流里的素材整理部分很有启发。我用的是类似的分层目录，配合标签检索效果不错。",
    approved: true,
    approvedTime: iso(1200),
    minutesAgo: 1400,
    ipAddress: "198.51.100.55",
  },
  {
    name: "comment-010",
    subjectKind: "SinglePage",
    subjectName: "page-about",
    owner: {
      kind: "Email",
      name: "old-friend@example.com",
      displayName: "老友",
    },
    raw: "很久以前在友情链接里交流过，看到站点改版很惊喜。祝一切顺利。",
    approved: false,
    approvedTime: iso(1500),
    minutesAgo: 1700,
    ipAddress: "203.0.113.201",
  },
  {
    name: "comment-011",
    subjectKind: "Post",
    subjectName: "post-plugin-dev",
    owner: { kind: "User", name: "qian-duo", displayName: "钱多" },
    raw: "插件模板仓库的目录结构和文章里讲的一致，照着做可以跑通。",
    approved: false,
    minutesAgo: 2200,
    ipAddress: "192.0.2.98",
  },
  {
    name: "comment-012",
    subjectKind: "Post",
    subjectName: "post-comment-plugin",
    owner: {
      kind: "Email",
      name: "promo@example.net",
      displayName: "活动推广",
    },
    raw: "限时活动，注册即送会员，详情私信。",
    approved: false,
    approvedTime: iso(2500),
    minutesAgo: 2600,
    ipAddress: "198.51.100.251",
  },
];

function findSubject(
  kind: "Post" | "SinglePage",
  name: string
): SubjectExtension | null {
  const list = (kind === "Post" ? posts : pages) as Array<{
    metadata: { name: string; deletionTimestamp?: string | null };
    spec: { deleted?: boolean; title: string };
    status?: { permalink?: string };
  }>;
  const found = list.find((item) => item.metadata.name === name);
  if (!found) {
    return null;
  }
  if (found.metadata.deletionTimestamp || found.spec.deleted) {
    return null;
  }
  return found as unknown as SubjectExtension;
}

export function buildMockStore() {
  const comments: ListedComment[] = seeds.map((seed, index) => {
    const subject = seed.subjectUnavailable
      ? null
      : findSubject(seed.subjectKind, seed.subjectName);
    const creationTime = iso(seed.minutesAgo);
    const comment: CommentExtension = {
      apiVersion: "content.halo.run/v1alpha1",
      kind: "Comment",
      metadata: {
        name: seed.name,
        creationTimestamp: creationTime,
        labels: { "content.halo.run/comment-count": String(index) },
        annotations: {},
      },
      spec: {
        subjectRef: {
          group: "content.halo.run",
          version: "v1alpha1",
          kind: seed.subjectKind,
          name: seed.subjectName,
        },
        raw: seed.raw,
        content: html(seed.raw),
        owner: {
          kind: seed.owner.kind,
          name: seed.owner.name,
          displayName: seed.owner.displayName,
          annotations: seed.owner.website
            ? { website: seed.owner.website }
            : {},
        },
        userAgent:
          index % 2 === 0
            ? "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36"
            : "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1",
        ipAddress: seed.ipAddress,
        approved: seed.approved,
        approvedTime: seed.approvedTime,
        creationTime,
        hidden: seed.hidden ?? false,
        top: false,
        priority: 0,
        allowNotification: true,
      },
      status: {
        replyCount: seed.replyCount ?? 0,
        visibleReplyCount: Math.max(
          0,
          (seed.replyCount ?? 0) - (seed.pendingReplyCount ?? 0)
        ),
        pendingReplyCount: seed.pendingReplyCount ?? 0,
        unreadReplyCount: 0,
        lastReplyTime: seed.replyCount ? iso(seed.minutesAgo - 5) : undefined,
      },
    };
    return {
      comment: comment as unknown as ListedComment["comment"],
      owner: comment.spec.owner,
      subject: (subject ?? undefined) as ListedComment["subject"],
      stats: { upvote: index * 2 },
      permalink:
        subject?.status?.permalink &&
        subject.metadata.name !== "post-comment-plugin"
          ? `${subject.status.permalink}#comment-${seed.name}`
          : subject?.status?.permalink,
    };
  });

  const replies: ListedReply[] = [];

  function reply(
    seed: Omit<
      ListedReply["reply"]["spec"],
      "commentName" | "top" | "priority" | "allowNotification" | "content"
    > & {
      commentName: string;
      content?: string;
    }
  ) {
    const ext = {
      apiVersion: "content.halo.run/v1alpha1",
      kind: "Reply",
      metadata: {
        name: `reply-${replies.length + 1}`,
        creationTimestamp: seed.creationTime || iso(10),
      },
      spec: {
        ...seed,
        content: seed.content || html(seed.raw),
        top: false,
        priority: 0,
        allowNotification: true,
      },
      status: {},
    } as unknown as ListedReply["reply"];
    const listed = {
      reply: ext,
      owner: ext.spec.owner,
      stats: { upvote: 0 },
    } as ListedReply;
    replies.push(listed);
    return listed;
  }

  reply({
    commentName: "comment-001",
    owner: { kind: "User", name: "owner", displayName: "站长" },
    raw: "感谢反馈，第三段的示例我会在下周补一个独立仓库。",
    approved: true,
    approvedTime: iso(100),
    creationTime: iso(400),
    hidden: false,
  });
  reply({
    commentName: "comment-001",
    owner: { kind: "User", name: "lin-wei", displayName: "林伟" },
    raw: "期待！另外想问一下移动端侧边栏的折叠逻辑。",
    approved: false,
    creationTime: iso(380),
    hidden: false,
  });
  reply({
    commentName: "comment-002",
    owner: { kind: "User", name: "owner", displayName: "站长" },
    raw: "阅读进度条可以用主题扩展点里的 post:detail 钩子，我整理一段示例贴上来。",
    approved: true,
    approvedTime: iso(300),
    creationTime: iso(320),
    hidden: false,
  });
  reply({
    commentName: "comment-002",
    owner: {
      kind: "Email",
      name: "other@example.com",
      displayName: "另一位访客",
    },
    raw: "同求示例，尤其想知道滚动容器不是 window 时怎么处理。",
    approved: true,
    approvedTime: iso(280),
    creationTime: iso(300),
    hidden: false,
  });
  reply({
    commentName: "comment-005",
    owner: { kind: "User", name: "owner", displayName: "站长" },
    raw: "目前可以批量通过，筛选和详情也在改版中。",
    approved: true,
    approvedTime: iso(200),
    creationTime: iso(230),
    hidden: false,
  });
  reply({
    commentName: "comment-007",
    owner: {
      kind: "Email",
      name: "plugin-dev@example.com",
      displayName: "插件开发者",
    },
    raw: "开发时可以用 UI 插件的开发模式，热更新比重新打包快很多。",
    approved: false,
    creationTime: iso(700),
    hidden: false,
  });

  return {
    comments,
    replies,
    subjects: [...posts, ...pages] as SubjectExtension[],
  };
}

export type MockStore = ReturnType<typeof buildMockStore>;
