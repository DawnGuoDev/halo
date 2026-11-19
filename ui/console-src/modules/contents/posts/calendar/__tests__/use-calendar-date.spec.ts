import { describe, expect, it } from "vitest";
import {
  addMonths,
  buildMonthCells,
  dateKey,
  toDateTimeLocal,
} from "../composables/use-calendar-date";

describe("use-calendar-date", () => {
  it("builds a 6x7 grid starting on Monday", () => {
    const cells = buildMonthCells(new Date(2026, 10, 1));
    expect(cells).toHaveLength(42);
    // 2026-11-01 is a Sunday, so the grid starts on 2026-10-26 (Monday)
    expect(cells[0].key).toBe("2026-10-26");
    expect(cells[0].inMonth).toBe(false);
    const firstOfMonth = cells.find((cell) => cell.key === "2026-11-01");
    expect(firstOfMonth?.inMonth).toBe(true);
  });

  it("marks today exactly once across adjacent months", () => {
    const today = new Date();
    const cells = buildMonthCells(today);
    const flagged = cells.filter((cell) => cell.isToday);
    expect(flagged).toHaveLength(1);
    expect(flagged[0].key).toBe(dateKey(today));
  });

  it("moves months across year boundaries", () => {
    expect(dateKey(addMonths(new Date(2026, 11, 1), 1))).toBe("2027-01-01");
    expect(dateKey(addMonths(new Date(2026, 0, 1), -1))).toBe("2025-12-01");
  });

  it("formats iso time as datetime-local without timezone shift", () => {
    const value = new Date(2026, 10, 20, 8, 5).toISOString();
    expect(toDateTimeLocal(value)).toBe("2026-11-20T08:05");
  });
});
