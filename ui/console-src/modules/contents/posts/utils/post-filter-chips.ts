export type PostFilterChipKey =
  | "keyword"
  | "status"
  | "visible"
  | "category"
  | "tag"
  | "contributor";

/**
 * Filter query keys used by the post list. Kept in one place so the filter
 * dropdowns, the filter chips and tests agree on the parameter names.
 */
export const POST_FILTER_QUERY_KEYS = [
  "keyword",
  "status",
  "visible",
  "category",
  "tag",
  "contributor",
] as const;

/**
 * Returns true when at least one post list filter is present in the query.
 * The sort order is intentionally excluded: it changes the order of the list
 * but does not narrow the result set.
 */
export function hasActivePostFilters(query: Record<string, unknown>): boolean {
  return POST_FILTER_QUERY_KEYS.some((key) => {
    const value = query[key];
    if (Array.isArray(value)) {
      return value.some((item) => !!item && String(item).trim() !== "");
    }
    return value !== undefined && value !== null && String(value).trim() !== "";
  });
}
