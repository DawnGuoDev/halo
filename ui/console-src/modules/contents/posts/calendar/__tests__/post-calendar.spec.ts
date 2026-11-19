import type { ListedPost } from "@halo-dev/api-client";
import { describe, expect, it } from "vite-plus/test";
import { postLabels } from "@/constants/labels";
import {
  buildMonthGrid,
  dateKey,
  splitBySchedule,
} from "../composables/use-post-calendar";

function scheduled(name: string, publishTime?: string): ListedPost {
  return {
    post: {
      metadata: {
        name,
        labels: {
          [postLabels.PUBLISHED]: "false",
          [postLabels.SCHEDULING_PUBLISH]: "true",
        },
      },
      spec: { title: name, publishTime },
    },
  } as unknown as ListedPost;
}

describe("use-post-calendar helpers", () => {
  it("builds a 42-day Monday-first grid around the cursor month", () => {
    const grid = buildMonthGrid(new Date(2026, 10, 1));

    expect(grid).toHaveLength(42);
    // 2026-11-01 is a Sunday, so the grid starts on Monday 2026-10-26.
    expect(grid[0].key).toBe("2026-10-26");
    expect(grid[0].inMonth).toBe(false);
    // Monday-first: Sunday 2026-11-01 is the 7th cell of the first row.
    expect(grid[6].key).toBe("2026-11-01");
    expect(grid[6].inMonth).toBe(true);
    expect(grid.filter((cell) => cell.inMonth)).toHaveLength(30);
  });

  it("splits posts without publish time into the unscheduled area", () => {
    const { scheduled: withTime, unscheduled } = splitBySchedule([
      { publishTime: new Date("2026-11-20T10:00:00Z") },
      { publishTime: undefined },
    ]);

    expect(withTime).toHaveLength(1);
    expect(unscheduled).toHaveLength(1);
  });

  it("keeps local calendar days stable across dateKey", () => {
    expect(dateKey(new Date(2026, 0, 9))).toBe("2026-01-09");
    expect(scheduled("post", undefined).post.spec.publishTime).toBeUndefined();
  });
});
