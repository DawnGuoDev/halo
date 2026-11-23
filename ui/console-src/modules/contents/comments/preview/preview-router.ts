import { defineComponent } from "vue";
import { createMemoryHistory, createRouter, type Router } from "vue-router";

const PreviewPage = defineComponent({
  name: "PreviewPage",
  render: () => null,
});
import { PREVIEW_QUERY_KEY } from "./use-preview-mode";

let previewRouter: Router | undefined;

/**
 * Memory router for the standalone prototype page.
 *
 * The workbench reuses `useSubjectRef`, which expects the console router in
 * order to link back to the post/page editor. In the preview we only need a
 * valid router context, so routes resolve to the preview page itself.
 */
export function getPreviewRouter(base = "/"): Router {
  if (!previewRouter) {
    previewRouter = createRouter({
      history: createMemoryHistory(base),
      routes: [
        {
          path: "/",
          redirect: {
            path: "/comments",
            query: { [PREVIEW_QUERY_KEY]: "comments" },
          },
        },
        { path: "/comments", name: "PreviewComments", component: PreviewPage },
        {
          path: "/:pathMatch(.*)*",
          name: "PreviewNotFound",
          component: PreviewPage,
        },
      ],
    });
  }
  return previewRouter;
}
