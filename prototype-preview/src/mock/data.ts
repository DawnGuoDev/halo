import type {
  MockCategory,
  MockPost,
  MockTag,
  MockUser,
} from "@/types";

// 预览用固定数据（40 篇，足以覆盖分页），仅用于独立网页演示，不作为产品需求或接口契约。
// 场景参数见 src/mock/index.ts；初始筛选状态为空，保证验收从确定初态开始。
export const mockPosts: MockPost[] = [
  {
    "name": "post-01",
    "title": "欢迎使用 Halo：五分钟完成站点搭建",
    "slug": "post-01",
    "visible": "PUBLIC",
    "published": true,
    "scheduling": false,
    "publishTime": "2026-11-15 00:12",
    "updateTime": "2026-11-16 07:25",
    "categories": [
      "默认分类",
      "技术"
    ],
    "tags": [
      "入门",
      "部署"
    ],
    "contributor": "administrator",
    "views": 0,
    "comments": 0,
    "pinned": true
  },
  {
    "name": "post-02",
    "title": "主题开发指南：模板变量与扩展点",
    "slug": "post-02",
    "visible": "PUBLIC",
    "published": true,
    "scheduling": false,
    "publishTime": "2026-11-14 17:59",
    "updateTime": "2026-11-15 00:12",
    "categories": [
      "技术"
    ],
    "tags": [
      "主题"
    ],
    "contributor": "guqing",
    "views": 37,
    "comments": 3,
    "pinned": false
  },
  {
    "name": "post-03",
    "title": "Halo 2.28 发布说明",
    "slug": "post-03",
    "visible": "PUBLIC",
    "published": true,
    "scheduling": false,
    "publishTime": "2026-11-13 10:46",
    "updateTime": "2026-11-14 17:59",
    "categories": [
      "产品"
    ],
    "tags": [
      "开发"
    ],
    "contributor": "ruibaby",
    "views": 74,
    "comments": 6,
    "pinned": false
  },
  {
    "name": "post-04",
    "title": "从 1.x 迁移到 2.x 的注意事项",
    "slug": "post-04",
    "visible": "INTERNAL",
    "published": false,
    "scheduling": false,
    "publishTime": undefined,
    "updateTime": "2026-11-13 10:46",
    "categories": [],
    "tags": [
      "发布"
    ],
    "contributor": "zhanhb",
    "views": 111,
    "comments": 9,
    "pinned": false
  },
  {
    "name": "post-05",
    "title": "内网环境部署 Halo 的实践",
    "slug": "post-05",
    "visible": "PRIVATE",
    "published": true,
    "scheduling": false,
    "publishTime": "2026-11-11 20:20",
    "updateTime": "2026-11-12 03:33",
    "categories": [
      "公告"
    ],
    "tags": [
      "迁移",
      "SEO"
    ],
    "contributor": "administrator",
    "views": 148,
    "comments": 12,
    "pinned": false
  },
  {
    "name": "post-06",
    "title": "用 TailwindCSS 定制控制台主题",
    "slug": "post-06",
    "visible": "PUBLIC",
    "published": false,
    "scheduling": false,
    "publishTime": undefined,
    "updateTime": "2026-11-11 20:20",
    "categories": [
      "文档"
    ],
    "tags": [],
    "contributor": "guqing",
    "views": 185,
    "comments": 15,
    "pinned": false
  },
  {
    "name": "post-07",
    "title": "标签与分类的组织方式",
    "slug": "post-07",
    "visible": "PUBLIC",
    "published": true,
    "scheduling": false,
    "publishTime": "2026-11-09 06:54",
    "updateTime": "2026-11-10 13:07",
    "categories": [],
    "tags": [],
    "contributor": "ruibaby",
    "views": 222,
    "comments": 1,
    "pinned": false
  },
  {
    "name": "post-08",
    "title": "评论系统插件接入说明",
    "slug": "post-08",
    "visible": "PUBLIC",
    "published": true,
    "scheduling": false,
    "publishTime": "2026-11-08 23:41",
    "updateTime": "2026-11-09 06:54",
    "categories": [
      "技术"
    ],
    "tags": [
      "Tailwind"
    ],
    "contributor": "zhanhb",
    "views": 259,
    "comments": 4,
    "pinned": false
  },
  {
    "name": "post-09",
    "title": "如何备份与恢复站点数据",
    "slug": "post-09",
    "visible": "INTERNAL",
    "published": false,
    "scheduling": false,
    "publishTime": undefined,
    "updateTime": "2026-11-08 23:41",
    "categories": [
      "产品"
    ],
    "tags": [],
    "contributor": "administrator",
    "views": 296,
    "comments": 7,
    "pinned": false
  },
  {
    "name": "post-10",
    "title": "为文章添加自定义模板",
    "slug": "post-10",
    "visible": "PRIVATE",
    "published": true,
    "scheduling": false,
    "publishTime": "2026-11-06 09:15",
    "updateTime": "2026-11-07 16:28",
    "categories": [
      "随笔",
      "公告"
    ],
    "tags": [
      "SEO"
    ],
    "contributor": "guqing",
    "views": 333,
    "comments": 10,
    "pinned": true
  },
  {
    "name": "post-11",
    "title": "插件开发入门：扩展点与静态资源",
    "slug": "post-11",
    "visible": "PUBLIC",
    "published": true,
    "scheduling": false,
    "publishTime": "2026-11-05 02:02",
    "updateTime": "2026-11-06 09:15",
    "categories": [
      "公告"
    ],
    "tags": [
      "设计"
    ],
    "contributor": "ruibaby",
    "views": 370,
    "comments": 13,
    "pinned": false
  },
  {
    "name": "post-12",
    "title": "配置 HTTPS 与反向代理",
    "slug": "post-12",
    "visible": "PUBLIC",
    "published": false,
    "scheduling": true,
    "publicizing": true,
    "publishTime": "2026-11-04 19:49",
    "updateTime": "2026-11-05 02:02",
    "categories": [
      "文档"
    ],
    "tags": [
      "运维"
    ],
    "contributor": "zhanhb",
    "views": 407,
    "comments": 16,
    "pinned": false
  },
  {
    "name": "post-13",
    "title": "内容审核工作流实践",
    "slug": "post-13",
    "visible": "PUBLIC",
    "published": false,
    "scheduling": false,
    "publishTime": undefined,
    "updateTime": "2026-11-04 19:49",
    "categories": [
      "默认分类"
    ],
    "tags": [
      "入门",
      "部署"
    ],
    "contributor": "administrator",
    "views": 444,
    "comments": 2,
    "pinned": false
  },
  {
    "name": "post-14",
    "title": "使用 Lucene 实现全文检索",
    "slug": "post-14",
    "visible": "INTERNAL",
    "published": false,
    "scheduling": false,
    "publishTime": undefined,
    "updateTime": "2026-11-03 12:36",
    "categories": [
      "技术"
    ],
    "tags": [
      "主题"
    ],
    "contributor": "guqing",
    "views": 481,
    "comments": 5,
    "pinned": false
  },
  {
    "name": "post-15",
    "title": "站点迁移后的 SEO 检查",
    "slug": "post-15",
    "visible": "PRIVATE",
    "published": true,
    "scheduling": false,
    "publishTime": "2026-11-01 22:10",
    "updateTime": "2026-11-02 05:23",
    "categories": [
      "产品"
    ],
    "tags": [
      "开发"
    ],
    "contributor": "ruibaby",
    "views": 518,
    "comments": 8,
    "pinned": false
  },
  {
    "name": "post-16",
    "title": "多作者协作的内容流程",
    "slug": "post-16",
    "visible": "PUBLIC",
    "published": true,
    "scheduling": false,
    "publishTime": "2025-12-09 10:03",
    "updateTime": "2026-11-01 22:10",
    "categories": [
      "随笔"
    ],
    "tags": [
      "发布"
    ],
    "contributor": "zhanhb",
    "views": 555,
    "comments": 11,
    "pinned": false
  },
  {
    "name": "post-17",
    "title": "编辑器快捷键速查",
    "slug": "post-17",
    "visible": "PUBLIC",
    "published": true,
    "scheduling": false,
    "publishTime": "2025-12-08 10:56",
    "updateTime": "2025-12-09 10:03",
    "categories": [
      "公告"
    ],
    "tags": [
      "迁移",
      "SEO"
    ],
    "contributor": "administrator",
    "views": 592,
    "comments": 14,
    "pinned": false
  },
  {
    "name": "post-18",
    "title": "为文章设置定时发布",
    "slug": "post-18",
    "visible": "PUBLIC",
    "published": true,
    "scheduling": false,
    "publishTime": "2025-12-07 10:49",
    "updateTime": "2025-12-08 10:56",
    "categories": [
      "文档"
    ],
    "tags": [
      "部署"
    ],
    "contributor": "guqing",
    "views": 629,
    "comments": 0,
    "pinned": false
  },
  {
    "name": "post-19",
    "title": "主题市场精选：十款极简主题",
    "slug": "post-19",
    "visible": "INTERNAL",
    "published": false,
    "scheduling": false,
    "publishTime": undefined,
    "updateTime": "2025-12-07 10:49",
    "categories": [
      "默认分类",
      "技术"
    ],
    "tags": [
      "Vue"
    ],
    "contributor": "ruibaby",
    "views": 666,
    "comments": 3,
    "pinned": false
  },
  {
    "name": "post-20",
    "title": "年度内容回顾：写作节奏与选题",
    "slug": "post-20",
    "visible": "PRIVATE",
    "published": false,
    "scheduling": false,
    "publishTime": undefined,
    "updateTime": "2025-12-06 10:42",
    "categories": [
      "技术"
    ],
    "tags": [
      "Tailwind"
    ],
    "contributor": "zhanhb",
    "views": 703,
    "comments": 6,
    "pinned": false
  },
  {
    "name": "post-21",
    "title": "静态资源与 CDN 加速",
    "slug": "post-21",
    "visible": "PUBLIC",
    "published": true,
    "scheduling": false,
    "publishTime": "2025-12-04 10:28",
    "updateTime": "2025-12-05 10:35",
    "categories": [
      "产品"
    ],
    "tags": [
      "插件",
      "主题"
    ],
    "contributor": "administrator",
    "views": 740,
    "comments": 9,
    "pinned": false
  },
  {
    "name": "post-22",
    "title": "用户中心的自定义入口",
    "slug": "post-22",
    "visible": "PUBLIC",
    "published": true,
    "scheduling": false,
    "publishTime": "2025-12-03 10:21",
    "updateTime": "2025-12-04 10:28",
    "categories": [
      "随笔"
    ],
    "tags": [
      "SEO"
    ],
    "contributor": "guqing",
    "views": 777,
    "comments": 12,
    "pinned": false
  },
  {
    "name": "post-23",
    "title": "通知中心与邮件推送",
    "slug": "post-23",
    "visible": "PUBLIC",
    "published": true,
    "scheduling": false,
    "publishTime": "2025-12-02 10:14",
    "updateTime": "2025-12-03 10:21",
    "categories": [
      "公告"
    ],
    "tags": [
      "设计"
    ],
    "contributor": "ruibaby",
    "views": 814,
    "comments": 15,
    "pinned": false
  },
  {
    "name": "post-24",
    "title": "安全设置：两步验证与 PAT",
    "slug": "post-24",
    "visible": "INTERNAL",
    "published": false,
    "scheduling": true,
    "publishTime": "2025-12-01 10:07",
    "updateTime": "2025-12-02 10:14",
    "categories": [
      "文档"
    ],
    "tags": [
      "运维"
    ],
    "contributor": "zhanhb",
    "views": 851,
    "comments": 1,
    "pinned": false
  },
  {
    "name": "post-25",
    "title": "版本历史与内容快照",
    "slug": "post-25",
    "visible": "PRIVATE",
    "published": true,
    "scheduling": false,
    "publishTime": "2025-12-01 10:07",
    "updateTime": "2025-12-01 10:07",
    "categories": [
      "默认分类"
    ],
    "tags": [
      "入门",
      "部署"
    ],
    "contributor": "administrator",
    "views": 888,
    "comments": 4,
    "pinned": false
  },
  {
    "name": "post-26",
    "title": "附件管理与存储策略",
    "slug": "post-26",
    "visible": "PUBLIC",
    "published": true,
    "scheduling": false,
    "publishTime": "2025-12-01 10:07",
    "updateTime": "2025-12-01 10:07",
    "categories": [
      "技术"
    ],
    "tags": [
      "主题"
    ],
    "contributor": "guqing",
    "views": 925,
    "comments": 7,
    "pinned": false
  },
  {
    "name": "post-27",
    "title": "站点统计与访问分析",
    "slug": "post-27",
    "visible": "PUBLIC",
    "published": false,
    "scheduling": false,
    "publishTime": undefined,
    "updateTime": "2025-12-01 10:07",
    "categories": [
      "产品"
    ],
    "tags": [
      "开发"
    ],
    "contributor": "ruibaby",
    "views": 962,
    "comments": 10,
    "pinned": false
  },
  {
    "name": "post-28",
    "title": "SEO：站点地图与 robots",
    "slug": "post-28",
    "visible": "PUBLIC",
    "published": true,
    "scheduling": false,
    "publishTime": "2025-12-03 10:21",
    "updateTime": "2025-12-02 10:14",
    "categories": [
      "随笔",
      "公告"
    ],
    "tags": [
      "发布"
    ],
    "contributor": "zhanhb",
    "views": 999,
    "comments": 13,
    "pinned": false
  },
  {
    "name": "post-29",
    "title": "Halo 插件开发调试技巧",
    "slug": "post-29",
    "visible": "INTERNAL",
    "published": false,
    "scheduling": false,
    "publishTime": undefined,
    "updateTime": "2025-12-03 10:21",
    "categories": [
      "公告"
    ],
    "tags": [
      "迁移",
      "SEO"
    ],
    "contributor": "administrator",
    "views": 1036,
    "comments": 16,
    "pinned": false
  },
  {
    "name": "post-30",
    "title": "编写可维护的主题样式",
    "slug": "post-30",
    "visible": "PRIVATE",
    "published": true,
    "scheduling": false,
    "publishTime": "2025-12-05 10:35",
    "updateTime": "2025-12-04 10:28",
    "categories": [
      "文档"
    ],
    "tags": [
      "部署"
    ],
    "contributor": "guqing",
    "views": 1073,
    "comments": 2,
    "pinned": false
  },
  {
    "name": "post-31",
    "title": "文章摘要与 SEO 描述",
    "slug": "post-31",
    "visible": "PUBLIC",
    "published": true,
    "scheduling": false,
    "publishTime": "2025-12-06 10:42",
    "updateTime": "2025-12-05 10:35",
    "categories": [
      "默认分类"
    ],
    "tags": [
      "Vue"
    ],
    "contributor": "ruibaby",
    "views": 1110,
    "comments": 5,
    "pinned": false
  },
  {
    "name": "post-32",
    "title": "自定义归档页面模板",
    "slug": "post-32",
    "visible": "PUBLIC",
    "published": true,
    "scheduling": false,
    "publishTime": "2025-12-07 10:49",
    "updateTime": "2025-12-06 10:42",
    "categories": [
      "技术"
    ],
    "tags": [
      "Tailwind"
    ],
    "contributor": "zhanhb",
    "views": 1147,
    "comments": 8,
    "pinned": false
  },
  {
    "name": "post-33",
    "title": "回收站与内容恢复",
    "slug": "post-33",
    "visible": "PUBLIC",
    "published": true,
    "scheduling": false,
    "publishTime": "2025-12-08 10:56",
    "updateTime": "2025-12-07 10:49",
    "categories": [
      "产品"
    ],
    "tags": [
      "插件",
      "主题"
    ],
    "contributor": "administrator",
    "views": 1184,
    "comments": 11,
    "pinned": false
  },
  {
    "name": "post-34",
    "title": "导入 Markdown 文章的注意事项",
    "slug": "post-34",
    "visible": "INTERNAL",
    "published": false,
    "scheduling": false,
    "publishTime": undefined,
    "updateTime": "2025-12-08 10:56",
    "categories": [
      "随笔"
    ],
    "tags": [
      "SEO"
    ],
    "contributor": "guqing",
    "views": 1221,
    "comments": 14,
    "pinned": false
  },
  {
    "name": "post-35",
    "title": "评论审核与反垃圾策略",
    "slug": "post-35",
    "visible": "PRIVATE",
    "published": true,
    "scheduling": false,
    "publishTime": "2026-11-01 22:10",
    "updateTime": "2025-12-09 10:03",
    "categories": [
      "公告"
    ],
    "tags": [
      "设计"
    ],
    "contributor": "ruibaby",
    "views": 1258,
    "comments": 0,
    "pinned": false
  },
  {
    "name": "post-36",
    "title": "多语言站点配置思路",
    "slug": "post-36",
    "visible": "PUBLIC",
    "published": true,
    "scheduling": false,
    "publishTime": "2026-11-02 05:23",
    "updateTime": "2026-11-01 22:10",
    "categories": [
      "文档"
    ],
    "tags": [
      "运维"
    ],
    "contributor": "zhanhb",
    "views": 1295,
    "comments": 3,
    "pinned": false
  },
  {
    "name": "post-37",
    "title": "自定义导航菜单",
    "slug": "post-37",
    "visible": "PUBLIC",
    "published": true,
    "scheduling": false,
    "publishTime": "2026-11-03 12:36",
    "updateTime": "2026-11-02 05:23",
    "categories": [
      "默认分类",
      "技术"
    ],
    "tags": [
      "入门",
      "部署"
    ],
    "contributor": "administrator",
    "views": 1332,
    "comments": 6,
    "pinned": false
  },
  {
    "name": "post-38",
    "title": "页面与文章的区别",
    "slug": "post-38",
    "visible": "PUBLIC",
    "published": true,
    "scheduling": false,
    "publishTime": "2026-11-04 19:49",
    "updateTime": "2026-11-03 12:36",
    "categories": [
      "技术"
    ],
    "tags": [
      "主题"
    ],
    "contributor": "guqing",
    "views": 1369,
    "comments": 9,
    "pinned": false
  },
  {
    "name": "post-39",
    "title": "站点外观的配色调整",
    "slug": "post-39",
    "visible": "INTERNAL",
    "published": false,
    "scheduling": false,
    "publishTime": undefined,
    "updateTime": "2026-11-04 19:49",
    "categories": [
      "产品"
    ],
    "tags": [
      "开发"
    ],
    "contributor": "ruibaby",
    "views": 1406,
    "comments": 12,
    "pinned": false
  },
  {
    "name": "post-40",
    "title": "从 WordPress 迁移内容",
    "slug": "post-40",
    "visible": "PRIVATE",
    "published": true,
    "scheduling": false,
    "publishTime": "2026-11-06 09:15",
    "updateTime": "2026-11-05 02:02",
    "categories": [
      "随笔"
    ],
    "tags": [
      "发布"
    ],
    "contributor": "zhanhb",
    "views": 1443,
    "comments": 15,
    "pinned": false
  }
];

export const mockCategories: MockCategory[] = [
  {
    "name": "默认分类",
    "displayName": "默认分类",
    "postCount": 7
  },
  {
    "name": "技术",
    "displayName": "技术",
    "postCount": 10
  },
  {
    "name": "产品",
    "displayName": "产品",
    "postCount": 7
  },
  {
    "name": "随笔",
    "displayName": "随笔",
    "postCount": 7
  },
  {
    "name": "公告",
    "displayName": "公告",
    "postCount": 8
  },
  {
    "name": "文档",
    "displayName": "文档",
    "postCount": 6
  }
];

export const mockTags: MockTag[] = [
  {
    "name": "tag-入门",
    "displayName": "入门",
    "color": "#4CCBA0",
    "postCount": 4
  },
  {
    "name": "tag-主题",
    "displayName": "主题",
    "color": "#3B82F6",
    "postCount": 7
  },
  {
    "name": "tag-开发",
    "displayName": "开发",
    "color": "#F59E0B",
    "postCount": 4
  },
  {
    "name": "tag-发布",
    "displayName": "发布",
    "color": "#8B5CF6",
    "postCount": 4
  },
  {
    "name": "tag-迁移",
    "displayName": "迁移",
    "color": "#EF4444",
    "postCount": 3
  },
  {
    "name": "tag-部署",
    "displayName": "部署",
    "color": "#10B981",
    "postCount": 7
  },
  {
    "name": "tag-Vue",
    "displayName": "Vue",
    "color": "#0EA5E9",
    "postCount": 3
  },
  {
    "name": "tag-Tailwind",
    "displayName": "Tailwind",
    "color": "#6B7280",
    "postCount": 3
  },
  {
    "name": "tag-插件",
    "displayName": "插件",
    "color": "#4CCBA0",
    "postCount": 3
  },
  {
    "name": "tag-SEO",
    "displayName": "SEO",
    "color": "#3B82F6",
    "postCount": 6
  },
  {
    "name": "tag-设计",
    "displayName": "设计",
    "color": "#F59E0B",
    "postCount": 3
  },
  {
    "name": "tag-运维",
    "displayName": "运维",
    "color": "#8B5CF6",
    "postCount": 3
  }
];

export const mockUsers: MockUser[] = [
  {
    "name": "administrator",
    "displayName": "Administrator"
  },
  {
    "name": "guqing",
    "displayName": "Guqing"
  },
  {
    "name": "ruibaby",
    "displayName": "Ryan Wang"
  },
  {
    "name": "zhanhb",
    "displayName": "Zhanhb"
  }
];

export const mockCurrentUser = mockUsers[0];
