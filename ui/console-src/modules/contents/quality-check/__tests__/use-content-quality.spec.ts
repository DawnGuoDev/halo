import { describe, expect, it } from "vitest";
import { useContentQuality } from "../composables/use-content-quality";
import { createMockApi } from "../mock/mock";

describe("useContentQuality", () => {
  it("统计仅计入待处理问题，并随修复更新", () => {
    const api = createMockApi();
    const q = useContentQuality(api);
    expect(q.stats.value.pending).toBe(12);
    expect(q.stats.value.critical).toBe(3);
    expect(q.stats.value.ignored).toBe(3);
    const critical = q.result.value.items.find(
      (item) => item.severity === "critical" && item.status === "pending"
    );
    expect(critical).toBeTruthy();
    if (critical) q.markFixed([critical.id]);
    expect(q.stats.value.pending).toBe(11);
    expect(q.stats.value.critical).toBe(2);
  });

  it("混合选择只忽略待处理记录，并返回跳过数量", () => {
    const api = createMockApi();
    const q = useContentQuality(api);
    const pending = q.result.value.items.find(
      (item) => item.status === "pending"
    );
    const fixed = q.result.value.items.find((item) => item.status === "fixed");
    expect(pending && fixed).toBeTruthy();
    if (!pending || !fixed) return;
    const split = q.splitForIgnore([pending.id, fixed.id]);
    expect(split.eligible).toEqual([pending.id]);
    expect(split.skipped).toBe(1);
    expect(q.ignoreIssues(split.eligible, "归档内容")).toBe(1);
    expect(q.result.value.items.find((i) => i.id === pending.id)?.status).toBe(
      "ignored"
    );
    expect(q.result.value.items.find((i) => i.id === fixed.id)?.status).toBe(
      "fixed"
    );
  });

  it("切换筛选和分页会清空勾选", async () => {
    const api = createMockApi();
    const q = useContentQuality(api);
    q.toggleSelected("q-01", true);
    expect(q.selectedIds.value).toEqual(["q-01"]);
    q.filters.type = "broken-link";
    await Promise.resolve();
    await Promise.resolve();
    expect(q.selectedIds.value).toEqual([]);
    q.toggleSelected("q-04", true);
    q.setPage(2);
    expect(q.selectedIds.value).toEqual([]);
  });

  it("已忽略问题恢复为待处理后重新计入统计", () => {
    const api = createMockApi();
    const q = useContentQuality(api);
    const ignored = api.list(
      { keyword: "", type: "", severity: "", status: "ignored" },
      1,
      8
    ).items[0];
    expect(ignored).toBeTruthy();
    if (!ignored) return;
    q.restoreIssues([ignored.id]);
    expect(q.stats.value.ignored).toBe(2);
    expect(q.stats.value.pending).toBe(13);
  });
});
