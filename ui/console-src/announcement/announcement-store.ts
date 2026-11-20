import { computed, reactive, ref, watch } from "vue";
import { createMockAnnouncements } from "./mock-data";
import type {
  Announcement,
  AnnouncementDraft,
  AnnouncementPosition,
  AnnouncementStatus,
} from "./types";
import {
  refreshStatusByTime,
  resolvePublishStatus,
  sortAnnouncements,
  toLocalInputValue,
} from "./utils";

export type MockFailurePoint = "publish" | "disable" | "delete" | "save";

const STORAGE_KEY = "halo-console-announcement-mock-v1";

export interface AnnouncementListQuery {
  keyword?: string;
  position?: AnnouncementPosition;
  status?: AnnouncementStatus;
  page: number;
  size: number;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function generateId() {
  return `ann-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function readStorage(): Announcement[] | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Announcement[]) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * POC 公告 mock store。
 * - 默认数据仅存在内存；启用 persistent 时（独立预览页）写入 localStorage，方便刷新后继续验收。
 * - 不访问后端接口，不实际发布公告。
 */
export function useAnnouncementMockStore(options?: { persistent?: boolean }) {
  const initial = options?.persistent ? readStorage() : undefined;
  const items = ref<Announcement[]>(
    sortAnnouncements(
      (initial ?? createMockAnnouncements()).map((i) => refreshStatusByTime(i))
    )
  );
  const listLoading = ref(false);
  const mutating = ref<MockFailurePoint | null>(null);
  const lastError = ref<string | null>(null);
  const failurePoints = reactive<Record<MockFailurePoint, boolean>>({
    publish: false,
    disable: false,
    delete: false,
    save: false,
  });

  if (options?.persistent) {
    watch(
      items,
      (value) => {
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
        } catch {
          // 忽略存储不可用（隐私模式 / sandbox）
        }
      },
      { deep: true }
    );
  }

  function nowString() {
    return toLocalInputValue(new Date()).replace("T", " ");
  }

  function syncStatusByTime() {
    items.value = sortAnnouncements(
      items.value.map((i) => refreshStatusByTime(i))
    );
  }

  async function load(query: AnnouncementListQuery) {
    listLoading.value = true;
    lastError.value = null;
    try {
      await delay(260);
      syncStatusByTime();
      const keyword = query.keyword?.trim().toLowerCase();
      let filtered = items.value;
      if (keyword) {
        filtered = filtered.filter((item) =>
          item.title.toLowerCase().includes(keyword)
        );
      }
      if (query.position) {
        filtered = filtered.filter((item) => item.position === query.position);
      }
      if (query.status) {
        filtered = filtered.filter((item) => item.status === query.status);
      }
      const total = filtered.length;
      const start = (query.page - 1) * query.size;
      return { total, items: filtered.slice(start, start + query.size) };
    } finally {
      listLoading.value = false;
    }
  }

  function getById(id: string) {
    return items.value.find((item) => item.id === id);
  }

  function snapshot(): AnnouncementDraft | undefined {
    const item = items.value[0];
    if (!item) return undefined;
    const { title, content, position, startTime, endTime } = item;
    return { title, content, position, startTime, endTime };
  }

  async function create(draft: AnnouncementDraft) {
    await delay(320);
    const record: Announcement = {
      id: generateId(),
      ...draft,
      title: draft.title.trim(),
      content: draft.content.trim(),
      status: "DRAFT",
      updateTime: nowString(),
    };
    items.value = sortAnnouncements([record, ...items.value]);
    return record;
  }

  async function update(id: string, draft: AnnouncementDraft) {
    mutating.value = "save";
    lastError.value = null;
    try {
      await delay(320);
      if (failurePoints.save)
        throw new Error("保存失败：模拟服务异常，请稍后重试");
      const index = items.value.findIndex((item) => item.id === id);
      if (index < 0) throw new Error("公告不存在或已被删除");
      const current = items.value[index];
      const updated: Announcement = {
        ...current,
        ...draft,
        title: draft.title.trim(),
        content: draft.content.trim(),
        // 已停用公告编辑保存后重新进入草稿；草稿保持草稿
        status: "DRAFT",
        updateTime: nowString(),
      };
      const next = [...items.value];
      next[index] = updated;
      items.value = sortAnnouncements(next);
      return updated;
    } catch (error) {
      lastError.value = (error as Error).message;
      throw error;
    } finally {
      mutating.value = null;
    }
  }

  async function publish(id: string) {
    mutating.value = "publish";
    lastError.value = null;
    try {
      await delay(320);
      if (failurePoints.publish)
        throw new Error("发布失败：模拟服务异常，请稍后重试");
      const index = items.value.findIndex((item) => item.id === id);
      if (index < 0) throw new Error("公告不存在或已被删除");
      const current = items.value[index];
      if (current.status !== "DRAFT") {
        throw new Error("仅草稿状态的公告可以发布");
      }
      const status = resolvePublishStatus(current.startTime, current.endTime);
      const next = [...items.value];
      next[index] = {
        ...current,
        status,
        publishTime: nowString(),
        updateTime: nowString(),
      };
      items.value = sortAnnouncements(next);
      return next[index];
    } catch (error) {
      lastError.value = (error as Error).message;
      throw error;
    } finally {
      mutating.value = null;
    }
  }

  async function disable(id: string) {
    mutating.value = "disable";
    lastError.value = null;
    try {
      await delay(320);
      if (failurePoints.disable)
        throw new Error("停用失败：模拟服务异常，请稍后重试");
      const index = items.value.findIndex((item) => item.id === id);
      if (index < 0) throw new Error("公告不存在或已被删除");
      const current = items.value[index];
      if (current.status === "DRAFT" || current.status === "DISABLED") {
        throw new Error("当前状态不支持停用");
      }
      const next = [...items.value];
      next[index] = { ...current, status: "DISABLED", updateTime: nowString() };
      items.value = sortAnnouncements(next);
      return next[index];
    } catch (error) {
      lastError.value = (error as Error).message;
      throw error;
    } finally {
      mutating.value = null;
    }
  }

  async function remove(id: string) {
    mutating.value = "delete";
    lastError.value = null;
    try {
      await delay(320);
      if (failurePoints.delete)
        throw new Error("删除失败：模拟服务异常，请稍后重试");
      const current = items.value.find((item) => item.id === id);
      if (!current) throw new Error("公告不存在或已被删除");
      if (current.status !== "DRAFT" && current.status !== "DISABLED") {
        throw new Error("已发布的公告需先停用后才能删除");
      }
      items.value = sortAnnouncements(
        items.value.filter((item) => item.id !== id)
      );
    } catch (error) {
      lastError.value = (error as Error).message;
      throw error;
    } finally {
      mutating.value = null;
    }
  }

  function reset() {
    items.value = sortAnnouncements(
      createMockAnnouncements().map((i) => refreshStatusByTime(i))
    );
    lastError.value = null;
  }

  const counts = computed(() => {
    const result: Record<string, number> = { total: items.value.length };
    for (const item of items.value) {
      result[item.status] = (result[item.status] ?? 0) + 1;
    }
    return result;
  });

  return {
    items,
    counts,
    listLoading,
    mutating,
    lastError,
    failurePoints,
    load,
    getById,
    snapshot,
    create,
    update,
    publish,
    disable,
    remove,
    reset,
    syncStatusByTime,
  };
}

export type AnnouncementMockStore = ReturnType<typeof useAnnouncementMockStore>;
