import { computed, reactive, ref, watch } from "vue";
import type { QualityApi } from "../mock/mock";
import type {
  CheckProgress,
  IssueFilters,
  IssueStatus,
  QualityStats,
} from "../types";

export const PAGE_SIZE = 8;

const emptyFilters = (): IssueFilters => ({
  keyword: "",
  type: "",
  severity: "",
  status: "",
});

export function useContentQuality(api: QualityApi) {
  const filters = reactive<IssueFilters>(emptyFilters());
  const page = ref(1);
  const selectedIds = ref<string[]>([]);
  // 数据源目前是普通 Mock 对象（非响应式）；用版本号显式失效并重算列表，
  // 后续接入 useQuery 时可由查询缓存替代。
  const dataVersion = ref(0);
  const stats = ref<QualityStats>(api.stats());
  const check = reactive<CheckProgress>({
    state: "idle",
    percent: 0,
    message: "",
  });
  const checkAttempt = ref(0);
  const checkUpdatedCount = ref(0);
  let checkTimer: ReturnType<typeof setInterval> | undefined;

  const result = computed(() => {
    void dataVersion.value;
    return api.list({ ...filters }, page.value, PAGE_SIZE);
  });
  const hasFilters = computed(() =>
    Boolean(
      filters.keyword.trim() ||
      filters.type ||
      filters.severity ||
      filters.status
    )
  );

  function refreshStats() {
    stats.value = api.stats();
    dataVersion.value += 1;
  }

  function resetSelection() {
    selectedIds.value = [];
  }

  function clearFilters() {
    Object.assign(filters, emptyFilters());
    page.value = 1;
    resetSelection();
  }

  function toggleSelected(id: string, checked: boolean) {
    const next = new Set(selectedIds.value);
    if (checked) {
      next.add(id);
    } else {
      next.delete(id);
    }
    selectedIds.value = [...next];
  }

  function selectPage(checked: boolean) {
    const ids = result.value.items.map((item) => item.id);
    if (checked) {
      selectedIds.value = [...new Set([...selectedIds.value, ...ids])];
    } else {
      selectedIds.value = selectedIds.value.filter((id) => !ids.includes(id));
    }
  }

  function setPage(next: number) {
    page.value = next;
    resetSelection();
  }

  function setPageSize() {
    page.value = 1;
    resetSelection();
  }

  // 切换筛选或分页后清空勾选，避免跨视图误操作。
  // 数量和值一起比较：从“已忽略”切到“待处理”时列表数量可能相同。
  watch(
    () =>
      [filters.keyword, filters.type, filters.severity, filters.status].join(
        "\u0000"
      ),
    () => {
      page.value = 1;
      resetSelection();
    }
  );
  watch(page, resetSelection);
  watch(
    () => result.value.total,
    (total) => {
      const maxPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
      if (page.value > maxPage) {
        page.value = maxPage;
      }
    }
  );

  function markFixed(ids: string[]) {
    api.markFixed(ids);
    refreshStats();
  }

  function ignoreIssues(ids: string[], reason: string) {
    const count = api.ignore(ids, reason);
    refreshStats();
    resetSelection();
    return count;
  }

  function restoreIssues(ids: string[]) {
    api.restore(ids);
    refreshStats();
    resetSelection();
  }

  function splitForIgnore(ids: string[]) {
    const map = new Map(
      result.value.items.map((item) => [item.id, item.status] as const)
    );
    const eligible = ids.filter((id) => map.get(id) === "pending");
    return {
      eligible,
      skipped: ids.length - eligible.length,
      total: ids.length,
    };
  }

  function stopCheck() {
    if (checkTimer) {
      clearInterval(checkTimer);
      checkTimer = undefined;
    }
  }

  function startCheck() {
    if (check.state === "running") return;
    stopCheck();
    // 每次开始固定使用本次轮次号（ref 响应式包装在浏览器环境无法被
    // 旧式重写隐式解包，直接用 .value 会被包成对象导致比较恒为假）。
    const attempt = (checkAttempt.value as number) + 1;
    checkAttempt.value = attempt;
    const checkWillFail = attempt === 1;
    const total = 20;
    check.state = "running";
    check.percent = 0;
    check.message = "";
    checkUpdatedCount.value = 0;
    let current = 0;
    checkTimer = setInterval(() => {
      if (checkWillFail && current >= 12) {
        stopCheck();
        check.state = "failed";
        check.percent = Math.round((current / total) * 100);
        return;
      }
      current += 1;
      check.percent = Math.min(100, Math.round((current / total) * 100));
      if (current >= total) {
        stopCheck();
        api.runCheck(check);
        checkUpdatedCount.value = 1;
        check.state = "success";
        refreshStats();
      }
    }, 120);
  }

  function resetDemo() {
    stopCheck();
    api.reset();
    Object.assign(check, { state: "idle", percent: 0, message: "" });
    checkAttempt.value = 2;
    clearFilters();
    refreshStats();
  }

  function clearCheckNotice() {
    stopCheck();
    check.state = "idle";
    check.percent = 0;
  }

  function statusOf(id: string): IssueStatus | undefined {
    return result.value.items.find((item) => item.id === id)?.status;
  }

  return {
    filters,
    page,
    size: PAGE_SIZE,
    selectedIds,
    stats,
    check,
    checkUpdatedCount,
    result,
    hasFilters,
    clearFilters,
    toggleSelected,
    selectPage,
    setPage,
    setPageSize,
    markFixed,
    ignoreIssues,
    restoreIssues,
    splitForIgnore,
    startCheck,
    resetDemo,
    clearCheckNotice,
    statusOf,
    refreshStats,
  };
}
