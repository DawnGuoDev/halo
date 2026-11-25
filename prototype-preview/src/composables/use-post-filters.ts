import type { LocationQuery, LocationQueryValue } from "vue-router";
import { useRoute, useRouter } from "vue-router";
import { DEFAULT_SORT, postLabels } from "@/mock";

// 与业务仓库 PostList.vue 一致：筛选条件同步到 URL query（可刷新复现、可分享）。
// 业务使用 @vueuse/router 的 useRouteQuery；此处以 vue-router 的 replace 实现同等语义。
export const FILTER_KEYS = [
  "keyword",
  "status",
  "visible",
  "category",
  "tag",
  "contributor",
] as const;

export type FilterKey = (typeof FILTER_KEYS)[number];

export type PostFilters = Partial<Record<FilterKey, string>>;

function toValue(raw: LocationQueryValue | LocationQueryValue[] | undefined) {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value ? value : undefined;
}

export function readFilters(query: LocationQuery): PostFilters {
  return {
    keyword: toValue(query.keyword),
    status: toValue(query.status),
    visible: toValue(query.visible),
    category: toValue(query.category),
    tag: toValue(query.tag),
    contributor: toValue(query.contributor),
  };
}

export function usePostFilters() {
  const route = useRoute();
  const router = useRouter();

  function writeFilters(patch: Record<string, string | undefined>) {
    const query: LocationQuery = {};
    // 保留 page/size 之外的非筛选参数
    Object.entries(route.query).forEach(([key, value]) => {
      query[key] = value;
    });
    Object.entries(patch).forEach(([key, value]) => {
      if (value === undefined || value === "") {
        delete query[key];
      } else {
        query[key] = value;
      }
    });
    // 任何筛选变化回到第 1 页（等同于业务中 page.value = 1 后写入 URL）
    delete query.page;
    router.replace({ query });
  }

  function clearAll() {
    const query: LocationQuery = { page: route.query.page, size: route.query.size };
    Object.keys(query).forEach((key) => {
      if (query[key] === undefined) delete query[key];
    });
    router.replace({ query });
  }

  return { readFilters, writeFilters, clearAll };
}

export const STATUS_OPTIONS = [
  { key: "published", label: "已发布", selector: `${postLabels.PUBLISHED}=true` },
  { key: "draft", label: "未发布", selector: `${postLabels.PUBLISHED}=false` },
  {
    key: "scheduling",
    label: "定时发布",
    selector: `${postLabels.SCHEDULING_PUBLISH}=true`,
  },
] as const;

export const VISIBLE_OPTIONS = [
  { key: "PUBLIC", label: "公开" },
  { key: "INTERNAL", label: "内部" },
  { key: "PRIVATE", label: "私有" },
] as const;

export const SORT_OPTIONS = [
  { key: DEFAULT_SORT, label: "较近发布" },
  { key: "spec.publishTime,asc", label: "较早发布" },
  { key: "metadata.creationTimestamp,desc", label: "较近创建" },
  { key: "metadata.creationTimestamp,asc", label: "较早创建" },
  { key: "status.lastModifyTime,desc", label: "最近更新" },
  { key: "status.lastModifyTime,asc", label: "较早更新" },
  { key: "stats.visit,desc", label: "最多访问量" },
  { key: "stats.totalComment,desc", label: "最多评论量" },
] as const;

export function statusLabel(value?: string) {
  return STATUS_OPTIONS.find((option) => option.selector === value)?.label;
}

export function visibleLabel(value?: string) {
  return VISIBLE_OPTIONS.find((option) => option.key === value)?.label;
}
