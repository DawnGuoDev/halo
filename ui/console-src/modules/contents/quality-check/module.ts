import BasicLayout from "@console/layouts/BasicLayout.vue";
import { IconCharacterRecognition } from "@halo-dev/components";
import { definePlugin } from "@halo-dev/ui-shared";
import { markRaw } from "vue";

export default definePlugin({
  routes: [
    {
      path: "/content-quality",
      name: "ContentQualityRoot",
      component: BasicLayout,
      meta: {
        title: "core.content_quality.title",
        searchable: true,
        permissions: ["system:posts:view"],
        menu: {
          name: /* @x18n-key */ "core.sidebar.menu.items.content_quality",
          group: "content",
          icon: markRaw(IconCharacterRecognition),
          priority: 3,
          mobile: true,
        },
      },
      children: [
        {
          path: "",
          name: "ContentQuality",
          component: () => import("./ContentQualityView.vue"),
        },
      ],
    },
  ],
});
