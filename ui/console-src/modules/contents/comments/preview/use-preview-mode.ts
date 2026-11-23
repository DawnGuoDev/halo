import { useRouteQuery } from "@vueuse/router";
import type { ComputedRef } from "vue";
import { computed } from "vue";

/** Query flag that enables the workbench preview inside the console shell. */
export const PREVIEW_QUERY_KEY = "preview";

/**
 * Explicit, opt-in preview mode for the console page.
 *
 * Only `?preview=comments` switches the workbench to local data. The regular
 * console never sends this query and keeps using the real API. The standalone
 * prototype entry (`preview.html`) passes `previewOverride` instead.
 */
export function useCommentPreviewMode(): ComputedRef<boolean> {
  const previewParam = useRouteQuery<string | undefined>(PREVIEW_QUERY_KEY);
  // Sticky so filter/pagination updates do not flip the page back to real
  // data while the operator is inside the preview.
  return computed(() => previewParam.value === "comments");
}
