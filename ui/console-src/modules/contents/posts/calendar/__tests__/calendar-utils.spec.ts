import { describe, expect, it } from "vitest";
import {
  addMonths,
  buildMonthGrid,
  isFuture,
  toDateKey,
} from "../calendar-utils";

describe("content publish calendar utils", () => {
  it("builds a fixed 6-week grid starting on Monday", () => {
    const days = buildMonthGrid(new Date(2026, 10, 15));
    expect(days).toHaveLength(42);
    // 2026-11-01 is a Sunday, so the grid starts on 2026-10-26
    expect(days[0].date).toBe("2026-10-26");
    expect(days.filter((day) => day.inCurrentMonth)).toHaveLength(30);
  });

  it("marks today in the grid", () => {
    const days = buildMonthGrid(new Date());
    expect(days.filter((day) => day.isToday)).toHaveLength(1);
  });

  it("navigates across year boundaries", () => {
    const next = addMonths(new Date(2026, 11, 31), 1);
    expect(next.getFullYear()).toBe(2027);
    expect(next.getMonth()).toBe(0);
  });

  it("derives a date key from publish time", () => {
    expect(toDateKey("2026-11-20T09:00:00.000Z")).toMatch(
      /^\d{4}-\d{2}-\d{2}$/
    );
    expect(toDateKey(undefined)).toBeUndefined();
  });

  it("only accepts future publish times", () => {
    expect(isFuture(new Date(Date.now() + 60_000))).toBe(true);
    expect(isFuture(new Date(Date.now() - 60_000))).toBe(false);
  });
});
