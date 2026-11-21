import { describe, expect, it } from "vitest";
import type { Announcement } from "../types";
import { POSITION_OPTIONS, STATUS_OPTIONS } from "../types";
import {
  findActiveAnnouncementByPosition,
  hasErrors,
  isShadowed,
  refreshStatusByTime,
  resolvePublishStatus,
  validateForm,
} from "../utils";

const now = new Date("2026-04-01T12:00:00");

function build(overrides: Partial<Announcement>): Announcement {
  return {
    id: "ann-1",
    title: "公告",
    content: "正文",
    position: "HOME_BANNER",
    startTime: "2026-04-01T10:00",
    endTime: "2026-04-02T10:00",
    status: "PUBLISHED",
    updateTime: "2026-04-01T10:00",
    ...overrides,
  };
}

describe("resolvePublishStatus", () => {
  it("未到开始时间为待生效", () => {
    expect(
      resolvePublishStatus("2026-04-02T00:00", "2026-04-03T00:00", now)
    ).toBe("SCHEDULED");
  });

  it("时间区间内为展示中", () => {
    expect(
      resolvePublishStatus("2026-04-01T10:00", "2026-04-02T00:00", now)
    ).toBe("PUBLISHED");
  });

  it("超过结束时间为已结束", () => {
    expect(
      resolvePublishStatus("2026-03-29T00:00", "2026-03-31T00:00", now)
    ).toBe("FINISHED");
  });
});

describe("refreshStatusByTime", () => {
  it("待生效到期转为展示中", () => {
    const item = build({ status: "SCHEDULED" });
    expect(refreshStatusByTime(item, now).status).toBe("PUBLISHED");
  });

  it("展示中超过结束时间转为已结束", () => {
    const item = build({ endTime: "2026-04-01T11:00" });
    expect(refreshStatusByTime(item, now).status).toBe("FINISHED");
  });

  it("草稿与已停用不受时间影响", () => {
    const draft = build({ status: "DRAFT" });
    const disabled = build({ status: "DISABLED" });
    expect(refreshStatusByTime(draft, now)).toBe(draft);
    expect(refreshStatusByTime(disabled, now)).toBe(disabled);
  });
});

describe("展示策略：同一位置仅展示最新一条", () => {
  const older = build({ id: "older", startTime: "2026-04-01T09:00" });
  const newer = build({ id: "newer", startTime: "2026-04-01T11:00" });

  it("按开始时间倒序取最新", () => {
    expect(
      findActiveAnnouncementByPosition([older, newer], "HOME_BANNER")?.id
    ).toBe("newer");
  });

  it("较早的展示中公告标记为被覆盖", () => {
    expect(isShadowed(older, [older, newer])).toBe(true);
    expect(isShadowed(newer, [older, newer])).toBe(false);
  });

  it("不同展示位置互不影响", () => {
    const notice = build({
      id: "notice",
      position: "SITE_WIDE_NOTICE",
      startTime: "2026-04-01T08:00",
    });
    expect(isShadowed(older, [older, notice])).toBe(false);
  });
});

describe("validateForm", () => {
  it("必填字段为空时逐项提示", () => {
    const errors = validateForm(
      { title: " ", content: "", position: "", startTime: "", endTime: "" },
      now
    );
    expect(errors).toEqual({
      title: expect.any(String),
      content: expect.any(String),
      position: expect.any(String),
      startTime: expect.any(String),
      endTime: expect.any(String),
    });
    expect(hasErrors(errors)).toBe(true);
  });

  it("开始时间不早于结束时间时报错", () => {
    const errors = validateForm(
      {
        title: "公告",
        content: "正文",
        position: "HOME_BANNER",
        startTime: "2026-04-02T10:00",
        endTime: "2026-04-02T10:00",
      },
      now
    );
    expect(errors.endTime).toContain("晚于开始时间");
  });

  it("合法表单无错误", () => {
    const errors = validateForm(
      {
        title: "公告",
        content: "正文",
        position: "SITE_WIDE_NOTICE",
        startTime: "2026-04-02T10:00",
        endTime: "2026-04-03T10:00",
      },
      now
    );
    expect(errors).toEqual({});
  });
});

describe("模拟数据覆盖", () => {
  it("状态与展示位置文案齐全", () => {
    expect(STATUS_OPTIONS.map((item) => item.label)).toEqual([
      "草稿",
      "待生效",
      "展示中",
      "已结束",
      "已停用",
    ]);
    expect(POSITION_OPTIONS.map((item) => item.label)).toEqual([
      "首页横幅",
      "全站通知",
    ]);
  });
});
