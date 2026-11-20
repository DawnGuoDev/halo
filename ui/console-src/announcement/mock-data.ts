import type { Announcement } from "./types";
import { toLocalInputValue } from "./utils";

function hoursFromNow(hours: number, base = new Date()): string {
  const date = new Date(base.getTime() + hours * 60 * 60 * 1000);
  date.setSeconds(0, 0);
  return toLocalInputValue(date);
}

function hoursAgo(hours: number, base = new Date()): string {
  return hoursFromNow(-hours, base);
}

/**
 * POC 模拟数据：覆盖全部状态和两类展示位置。
 * 相对当前时间生成，保证打开页面时状态符合预期。
 */
export function createMockAnnouncements(
  now: Date = new Date()
): Announcement[] {
  const t = (hours: number) => hoursFromNow(hours, now);
  const a = (hours: number) => hoursAgo(hours, now);

  return [
    {
      id: "ann-published-banner",
      title: "春季新品发布会直播预约开启",
      content:
        "3 月 18 日 20:00 春季新品发布会全程直播，预约即可参与抽奖。\n点击首页横幅了解活动详情，名额有限，先到先得。",
      position: "HOME_BANNER",
      startTime: t(-6),
      endTime: t(66),
      status: "PUBLISHED",
      updateTime: a(5),
      publishTime: a(6),
    },
    {
      id: "ann-published-notice",
      title: "系统维护通知：本周六凌晨升级",
      content:
        "本周六 02:00 - 04:00 将进行系统升级维护，期间站点将短暂不可用，请提前安排发布计划。",
      position: "SITE_WIDE_NOTICE",
      startTime: t(-12),
      endTime: t(36),
      status: "PUBLISHED",
      updateTime: a(11),
      publishTime: a(12),
    },
    {
      id: "ann-shadowed-banner",
      title: "老用户专属续费优惠",
      content:
        "即日起至月底，老用户续费享 8 折优惠，可在个人中心查看优惠券领取结果。",
      position: "HOME_BANNER",
      startTime: t(-30),
      endTime: t(48),
      status: "PUBLISHED",
      updateTime: a(30),
      publishTime: a(30),
    },
    {
      id: "ann-scheduled-banner",
      title: "五一假期客服值班安排",
      content:
        "五一假期期间客服在线时间调整为 10:00 - 18:00，紧急问题可通过工单提交，我们会在 24 小时内响应。",
      position: "HOME_BANNER",
      startTime: t(30),
      endTime: t(168),
      status: "SCHEDULED",
      updateTime: a(2),
      publishTime: a(2),
    },
    {
      id: "ann-finished-notice",
      title: "春节活动圆满结束，感谢参与",
      content:
        "春节限时活动已于 2 月 20 日结束，中奖名单已在活动页公示，奖品将在 7 个工作日内寄出。",
      position: "SITE_WIDE_NOTICE",
      startTime: t(-240),
      endTime: t(-96),
      status: "FINISHED",
      updateTime: a(96),
      publishTime: a(240),
    },
    {
      id: "ann-draft-notice",
      title: "新版本功能上线公告（未发布）",
      content:
        "本次版本新增站内公告管理、内容批量操作等能力，具体发布时间待确认后再补充。",
      position: "SITE_WIDE_NOTICE",
      startTime: t(72),
      endTime: t(240),
      status: "DRAFT",
      updateTime: a(1),
    },
    {
      id: "ann-draft-banner",
      title: "会员日专属折扣预告",
      content: "每月 8 日会员日，精选课程与模板 5 折起，敬请期待。",
      position: "HOME_BANNER",
      startTime: t(120),
      endTime: t(336),
      status: "DRAFT",
      updateTime: a(20),
    },
    {
      id: "ann-disabled-notice",
      title: "旧版帮助中心迁移提醒（已停用）",
      content: "旧版帮助中心将于下月下线，内容已迁移至新版文档中心。",
      position: "SITE_WIDE_NOTICE",
      startTime: t(-72),
      endTime: t(96),
      status: "DISABLED",
      updateTime: a(24),
      publishTime: a(72),
    },
    {
      id: "ann-disabled-banner",
      title: "站内公告 POC 测试内容（已停用）",
      content: "这是一条用于 POC 验收的测试公告，停用后可重新编辑为草稿。",
      position: "HOME_BANNER",
      startTime: t(-48),
      endTime: t(24),
      status: "DISABLED",
      updateTime: a(36),
      publishTime: a(48),
    },
  ];
}
