import type { IssueCopy } from "../types";

/**
 * 20 条本地演示问题的内容文案（问题类型/严重程度/处理状态只存枚举）。
 * 接入真实质量检查接口后，由接口返回同结构内容，不在页面内维护。
 */
export const issueCopyZhCN: Record<string, IssueCopy> = {
  "q-01": {
    description: "正文第 3 段外链已返回 404",
    articleTitle: "使用 Halo 搭建个人知识库的完整指南",
    snippet: "参考链接：https://example.com/halo-docs-v1（已失效，HTTP 404）",
    suggestion: "将链接更新为最新文档地址，或移除失效引用。",
  },
  "q-02": {
    description: "封面图资源缺失，文章首屏显示占位",
    articleTitle: "我的 2026 年度写作计划",
    snippet: "封面图：/upload/2026/plan-cover.png（返回 404）",
    suggestion: "重新上传封面图，或在编辑器中选择已有附件。",
  },
  "q-03": {
    description: "文章未填写摘要，列表页直接截取正文",
    articleTitle: "如何为 Halo 主题编写自定义模板",
    snippet: "摘要在文章设置中为空，列表将回退到正文前 160 个字符。",
    suggestion: "在文章设置中补充 1-2 句摘要，说明文章解决的问题。",
  },
  "q-04": {
    description: "友情链接「旧博客归档」域名已过期",
    articleTitle: "友链与常用资源整理",
    snippet: "旧博客归档 → http://old-blog.example.org/",
    suggestion: "删除该条目，或替换为新的可访问地址。",
  },
  "q-05": {
    description: "正文中的截图文件名带空格，加载失败",
    articleTitle: "评论组件迁移踩坑记录",
    snippet: "插图：/upload/comment migration 01.png",
    suggestion: "重命名文件并重新插入，避免文件名中的空格。",
  },
  "q-06": {
    description: "摘要超过推荐长度，首页卡片展示被截断",
    articleTitle: "站点性能优化实践合集",
    snippet: "当前摘要 286 字，推荐不超过 120 字。",
    suggestion: "精简摘要，保留结论和适用场景。",
  },
  "q-07": {
    description: "文末参考链接不可访问",
    articleTitle: "R2DBC 与响应式数据访问入门",
    snippet: "参考链接：https://example.org/reactive-guide（连接超时）",
    suggestion: "替换为 Spring 官方响应式文档地址。",
  },
  "q-08": {
    description: "正文插图地址指向草稿附件，无法公开访问",
    articleTitle: "插件开发快速上手",
    snippet: "插图：/upload/draft/plugin-flow.png（草稿附件）",
    suggestion: "从公开附件库重新选择图片。",
  },
  "q-09": {
    description: "文章未填写摘要",
    articleTitle: "写给新手的 Markdown 排版建议",
    snippet: "摘要在文章设置中为空。",
    suggestion: "补充摘要以改善列表可读性。",
  },
  "q-10": {
    description: "文中外链被目标站点标记为风险，已忽略保留",
    articleTitle: "常用设计资源清单",
    snippet: "https://example.net/icons（目标站点拒绝访问）",
    suggestion: "如后续恢复访问可更新，否则移除。",
    ignoreReason: "资源站维护中，链接暂时不可用但会恢复",
  },
  "q-11": {
    description: "旧版封面图已删除，暂以文字标题代替",
    articleTitle: "2025 年度回顾",
    snippet: "封面图：/upload/2025/annual-cover.jpg",
    suggestion: "归档文章保留现状即可。",
    ignoreReason: "归档文章，不再维护配图",
  },
  "q-12": {
    description: "摘要为空，但文章为草稿",
    articleTitle: "未命名草稿：关于缓存",
    snippet: "摘要为空。",
    suggestion: "发布前补充摘要。",
    ignoreReason: "草稿整理中，待发布前补齐",
  },
  "q-13": {
    description: "外部图床返回 403",
    articleTitle: "Halo 插件市场使用体验",
    snippet: "插图：https://img.example.io/market-01.png（HTTP 403）",
    suggestion: "下载图片后上传到本地附件库。",
  },
  "q-14": {
    description: "文内锚点链接指向已合并的章节",
    articleTitle: "主题开发常见问题",
    snippet: "链接：#安装主题（章节已并入“快速开始”）",
    suggestion: "更新锚点为 #快速开始。",
  },
  "q-15": {
    description: "摘要与正文开头高度重复",
    articleTitle: "从零开始部署 Halo",
    snippet: "摘要与正文首段前 80 字重复。",
    suggestion: "改写摘要，突出部署收益与前置条件。",
  },
  "q-16": {
    description: "两处图片链接使用 http，混合内容被拦截",
    articleTitle: "HTTPS 迁移检查清单",
    snippet: "图片地址仍以 http:// 开头，浏览器阻止加载。",
    suggestion: "将图片地址改为 https，或迁移至附件库。",
  },
  "q-17": {
    description: "导航栏外链拼写错误",
    articleTitle: "关于本站",
    snippet: "github.com/dawnguodev/hlalo → 不存在的仓库",
    suggestion: "修正拼写为 /halo。",
  },
  "q-18": {
    description: "文章列表中的缩略图丢失",
    articleTitle: "博客写作的 10 个小习惯",
    snippet: "缩略图：/upload/habits.png（返回 404）",
    suggestion: "重新上传缩略图。",
  },
  "q-19": {
    description: "未填写摘要，但设置了自定义 SEO 描述",
    articleTitle: "Halo 站点 SEO 设置",
    snippet: "摘要为空；SEO 描述已填写。",
    suggestion: "如站点使用摘要生成卡片，请补充摘要。",
  },
  "q-20": {
    description: "附件下载链接使用内网地址",
    articleTitle: "内网部署经验分享",
    snippet: "附件：http://192.168.1.20/files/guide.pdf",
    suggestion: "替换为公开可访问的附件地址。",
  },
};

export default issueCopyZhCN;
