import type {
  Comment,
  Extension,
  ListedComment,
  ListedReply,
  Reply,
} from "@halo-dev/api-client";
import type { ModerationStatus } from "./types";
export type { ModerationStatus };

export interface PreviewReply {
  listed: ListedReply;
  status: ModerationStatus;
}

export interface PreviewComment {
  listed: ListedComment;
  status: ModerationStatus;
  // Present when the subject was deleted or is not accessible to the operator.
  subjectMissing?: "deleted" | "inaccessible";
  parent?: {
    author: string;
    raw: string;
  };
  replies: PreviewReply[];
}

const SUBJECT_GROUP = "content.halo.run";
const SUBJECT_VERSION = "v1alpha1";

function subjectRef(kind: "Post" | "SinglePage", name: string) {
  return {
    group: SUBJECT_GROUP,
    version: SUBJECT_VERSION,
    kind,
    name,
  } as Comment["spec"]["subjectRef"];
}

function makeSubject(
  kind: "Post" | "SinglePage",
  name: string,
  title: string,
  permalink: string
): Extension {
  return {
    apiVersion: `${SUBJECT_GROUP}/${SUBJECT_VERSION}`,
    kind,
    metadata: { name, generateName: "", version: 1 },
    spec: { title },
    status: { permalink },
  } as unknown as Extension;
}

interface CommentSeed {
  id: string;
  raw: string;
  owner: { kind: "User" | "Email"; name: string; displayName: string };
  subject: {
    kind: "Post" | "SinglePage";
    name: string;
    title: string;
    permalink: string;
    state?: "deleted" | "inaccessible";
  };
  createdAt: string;
  status: ModerationStatus;
  hidden?: boolean;
  parent?: { author: string; raw: string };
  replies?: {
    id: string;
    raw: string;
    author: string;
    status: ModerationStatus;
  }[];
}

const LONG_COMMENT_ONE =
  "这篇关于产线数据采集的文章非常实用，尤其是对 OPC UA 与 MES 之间的数据同步说明得很清楚。我们在实际落地时还遇到了设备时钟不同步导致工序时间统计偏移的问题，最后通过网关统一校时解决。另外想请教一下，文中提到的批量补录是否会触发 OEE 重算？如果会，重算窗口一般怎么设置比较合理？我们目前有 12 条产线，夜间停机数据量很大，担心一次性重算会影响白班查询速度。期待作者后续能补充一个性能调优的章节，最好能结合 PostgreSQL 的索引与分区策略一起讲，这样对中小制造企业更有参考价值。";

const LONG_COMMENT_TWO =
  "关于独立页面的评论功能，我建议增加一个可配置的关闭选项。我们的一些活动页在结束后仍然保留评论入口，旧活动页会持续收到与当前业务无关的提问，运营同学需要逐条处理。若能按页面分组批量关闭评论，并在页面上给出统一的说明文案，会减少很多重复沟通。同时希望详情里能显示评论来源的页面版本，方便判断用户看到的是哪一版规则。谢谢！另外，长评论在列表中折叠后，最好保留“展开全部”的入口，而不仅仅是点击正文，否则触屏设备上不太容易发现。";

const seeds: CommentSeed[] = [
  {
    id: "cmt-1001",
    raw: "设备点检记录能否按班组导出为 Excel？目前只能逐条查看，整理周报很费时间。",
    owner: { kind: "User", name: "zhangwei", displayName: "张薇" },
    subject: {
      kind: "Post",
      name: "oee-improvement-guide",
      title: "OEE 提升实战：从数据采集到瓶颈分析",
      permalink: "/archives/oee-improvement-guide",
    },
    createdAt: "2026-11-22T09:12:00Z",
    status: "pending",
    replies: [
      {
        id: "rpl-2001",
        raw: "同问，班组长也需要这个导出能力。",
        author: "李强",
        status: "pending",
      },
    ],
  },
  {
    id: "cmt-1002",
    raw: LONG_COMMENT_ONE,
    owner: { kind: "Email", name: "reader@example.com", displayName: "陈工" },
    subject: {
      kind: "Post",
      name: "mes-data-collection",
      title: "MES 数据采集的 7 个关键设计点",
      permalink: "/archives/mes-data-collection",
    },
    createdAt: "2026-11-22T08:45:00Z",
    status: "pending",
  },
  {
    id: "cmt-1003",
    raw: "购买链接发我一下，私聊更优惠。",
    owner: { kind: "Email", name: "spam@example.com", displayName: "优惠顾问" },
    subject: {
      kind: "Post",
      name: "mes-data-collection",
      title: "MES 数据采集的 7 个关键设计点",
      permalink: "/archives/mes-data-collection",
    },
    createdAt: "2026-11-22T08:31:00Z",
    status: "pending",
  },
  {
    id: "cmt-1004",
    raw: "这个排产算法在急单插单场景下表现如何？我们经常一天插 8 到 10 个急单。",
    owner: { kind: "User", name: "wangfang", displayName: "王芳" },
    subject: {
      kind: "Post",
      name: "aps-scheduling",
      title: "APS 高级排产：约束建模入门",
      permalink: "/archives/aps-scheduling",
    },
    createdAt: "2026-11-21T16:20:00Z",
    status: "pending",
    replies: [
      {
        id: "rpl-2002",
        raw: "我们厂也是类似场景，关注。",
        author: "赵磊",
        status: "pending",
      },
      {
        id: "rpl-2003",
        raw: "可以优先看资源约束那一节。",
        author: "作者",
        status: "approved",
      },
    ],
  },
  {
    id: "cmt-1005",
    raw: "文章里的图表在手机上显示不全，建议检查一下响应式布局。",
    owner: { kind: "User", name: "liuqiang", displayName: "刘强" },
    subject: {
      kind: "Post",
      name: "mes-data-collection",
      title: "MES 数据采集的 7 个关键设计点",
      permalink: "/archives/mes-data-collection",
    },
    createdAt: "2026-11-21T14:02:00Z",
    status: "approved",
  },
  {
    id: "cmt-1006",
    raw: "关于年度服务条款的更新，旧版页面里的联系方式已经失效，请更新。",
    owner: {
      kind: "Email",
      name: "service@example.org",
      displayName: "客户成功部",
    },
    subject: {
      kind: "SinglePage",
      name: "terms-2025",
      title: "2025 年度服务条款",
      permalink: "/pages/terms-2025",
      state: "deleted",
    },
    createdAt: "2026-11-21T11:40:00Z",
    status: "pending",
  },
  {
    id: "cmt-1007",
    raw: "这篇文章明显是广告，而且内容与制造执行系统无关。",
    owner: { kind: "User", name: "sunli", displayName: "孙丽" },
    subject: {
      kind: "Post",
      name: "shopfloor-digital",
      title: "车间数字化改造清单",
      permalink: "/archives/shopfloor-digital",
    },
    createdAt: "2026-11-20T18:10:00Z",
    status: "rejected",
  },
  {
    id: "cmt-1008",
    raw: LONG_COMMENT_TWO,
    owner: { kind: "User", name: "chenhao", displayName: "陈浩" },
    subject: {
      kind: "SinglePage",
      name: "product-roadmap",
      title: "产品路线图（2026）",
      permalink: "/pages/product-roadmap",
    },
    createdAt: "2026-11-20T15:55:00Z",
    status: "pending",
  },
  {
    id: "cmt-1009",
    raw: "回复 @张薇：这个需求已经记录，下个版本会提供按批次的导出模板。",
    owner: { kind: "User", name: "operator", displayName: "运营小助手" },
    subject: {
      kind: "Post",
      name: "oee-improvement-guide",
      title: "OEE 提升实战：从数据采集到瓶颈分析",
      permalink: "/archives/oee-improvement-guide",
    },
    createdAt: "2026-11-20T10:30:00Z",
    status: "approved",
    parent: {
      author: "张薇",
      raw: "设备点检记录能否按班组导出为 Excel？目前只能逐条查看，整理周报很费时间。",
    },
  },
  {
    id: "cmt-1010",
    raw: "内部活动页的评论入口没关，测试评论请忽略。",
    owner: { kind: "User", name: "qa-bot", displayName: "QA 机器人" },
    subject: {
      kind: "SinglePage",
      name: "internal-launch",
      title: "内部上线公告",
      permalink: "/pages/internal-launch",
      state: "inaccessible",
    },
    createdAt: "2026-11-19T21:05:00Z",
    status: "pending",
  },
  {
    id: "cmt-1011",
    raw: "希望增加移动端扫码报工，车间里用电脑不方便。",
    owner: { kind: "User", name: "hejie", displayName: "何杰" },
    subject: {
      kind: "Post",
      name: "aps-scheduling",
      title: "APS 高级排产：约束建模入门",
      permalink: "/archives/aps-scheduling",
    },
    createdAt: "2026-11-19T09:20:00Z",
    status: "approved",
  },
  {
    id: "cmt-1012",
    raw: "这篇教程帮我解决了条码打印偏位的问题，感谢分享。",
    owner: { kind: "Email", name: "lin@example.com", displayName: "林先生" },
    subject: {
      kind: "Post",
      name: "barcode-printing",
      title: "条码打印偏位排查指南",
      permalink: "/archives/barcode-printing",
    },
    createdAt: "2026-11-18T13:15:00Z",
    status: "approved",
  },
  {
    id: "cmt-1013",
    raw: "广告：专业代办各类资质证书，联系微信 xxxx。",
    owner: { kind: "Email", name: "ad@example.com", displayName: "资质代办" },
    subject: {
      kind: "Post",
      name: "barcode-printing",
      title: "条码打印偏位排查指南",
      permalink: "/archives/barcode-printing",
    },
    createdAt: "2026-11-18T08:04:00Z",
    status: "rejected",
  },
];

function buildComment(seed: CommentSeed): PreviewComment {
  const approved = seed.status === "approved";
  const subjectRefValue = subjectRef(seed.subject.kind, seed.subject.name);
  const comment: Comment = {
    apiVersion: "content.halo.run/v1alpha1",
    kind: "Comment",
    metadata: {
      name: seed.id,
      generateName: "",
      version: 1,
      creationTimestamp: seed.createdAt,
    },
    spec: {
      raw: seed.raw,
      content: `<p>${seed.raw}</p>`,
      owner: {
        kind: seed.owner.kind,
        name: seed.owner.name,
        displayName: seed.owner.displayName,
        // Local avatars only: the prototype must work without third-party CDNs.
        annotations: {},
      },
      subjectRef: subjectRefValue,
      approved,
      approvedTime: approved ? seed.createdAt : undefined,
      hidden: seed.hidden ?? seed.status === "rejected",
      priority: 0,
      top: false,
      allowNotification: true,
      creationTime: seed.createdAt,
      ipAddress: "10.0.0.12",
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    },
    status: {
      replyCount: seed.replies?.length ?? 0,
      pendingReplyCount:
        seed.replies?.filter((reply) => reply.status === "pending").length ?? 0,
      visibleReplyCount:
        seed.replies?.filter((reply) => reply.status === "approved").length ??
        0,
      lastReplyTime: seed.createdAt,
    },
  };
  const listed: ListedComment = {
    comment,
    owner: {
      displayName: seed.owner.displayName,
      name: seed.owner.name,
      avatar: undefined,
    },
    subject:
      seed.subject.state === "deleted"
        ? undefined
        : makeSubject(
            seed.subject.kind,
            seed.subject.name,
            seed.subject.title,
            seed.subject.permalink
          ),
    permalink: seed.subject.state ? undefined : seed.subject.permalink,
    stats: { upvote: 0 },
  };
  return {
    listed,
    status: seed.status,
    subjectMissing: seed.subject.state,
    parent: seed.parent,
    replies: (seed.replies ?? []).map((reply) => {
      const replyApproved = reply.status === "approved";
      const replyExtension: Reply = {
        apiVersion: "content.halo.run/v1alpha1",
        kind: "Reply",
        metadata: {
          name: reply.id,
          generateName: "",
          version: 1,
          creationTimestamp: seed.createdAt,
        },
        spec: {
          commentName: seed.id,
          raw: reply.raw,
          content: `<p>${reply.raw}</p>`,
          owner: {
            kind: "Email",
            name: `${reply.id}@example.com`,
            displayName: reply.author,
          },
          approved: replyApproved,
          hidden: false,
          priority: 0,
          top: false,
          allowNotification: true,
        },
        status: {},
      };
      return {
        status: reply.status,
        listed: {
          reply: replyExtension,
          owner: { displayName: reply.author, name: reply.id },
          stats: { upvote: 0 },
        } as ListedReply,
      };
    }),
  };
}

export function createPreviewComments(): PreviewComment[] {
  return seeds.map(buildComment);
}
