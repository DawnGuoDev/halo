import { describe, expect, it } from "vitest";
import {
  addMonths,
  buildMonthGrid,
  groupByDay,
  isInMonth,
  monthTitle,
  timeLabel,
} from "../utils";

describe("content calendar utils", () => {
  it("builds a 42 day grid starting on Monday", () => {
    // 2026-11-01 is a Sunday, so the grid starts on 2026-10-26.
    const grid = buildMonthGrid(new Date(2026, 10, 1), new Date(2026, 10, 20));
    expect(grid).toHaveLength(42);
    expect(grid[0].key).toBe("2026-10-26");
    expect(grid[41].key).toBe("2026-12-06");
    expect(grid.find((day) => day.isToday)?.key).toBe("2026-11-20");
    expect(grid.filter((day) => day.inCurrentMonth)).toHaveLength(30);
  });

  it("moves between months and keeps month titles stable", () => {
    expect(monthTitle(addMonths(new Date(2026, 11, 1), 1))).toBe("2027年1月");
    expect(monthTitle(addMonths(new Date(2026, 0, 1), -1))).toBe("2025年12月");
  });

  it("formats time and groups posts by local day", () => {
    const post = {
      name: "a",
      title: "A",
      published: false,
      scheduled: true,
      publishTime: new Date(2026, 10, 28, 9, 5).toISOString(),
    };
    expect(timeLabel(post.publishTime)).toBe("09:05");
    expect(isInMonth(post.publishTime, new Date(2026, 10, 1))).toBe(true);
    expect(isInMonth(post.publishTime, new Date(2026, 11, 1))).toBe(false);
    expect(Object.keys(groupByDay([post]))).toEqual(["2026-11-28"]);
  });
});
