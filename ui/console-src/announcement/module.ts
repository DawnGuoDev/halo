import BasicLayout from "@console/layouts/BasicLayout.vue";
import { IconNotificationBadgeLine } from "@halo-dev/components";
import { definePlugin } from "@halo-dev/ui-shared";
import { markRaw } from "vue";

export default definePlugin({
  routes: [
    {
      path: "/announcements",
      name: "AnnouncementsRoot",
      component: BasicLayout,
      meta: {
        title: "站内公告管理",
        searchable: true,
        permissions: ["system:settings:view"],
        menu: {
          name: "站内公告",
          group: "content",
          icon: markRaw(IconNotificationBadgeLine),
          priority: 1,
        },
      },
      children: [
        {
          path: "",
          name: "Announcements",
          component: () => import("./AnnouncementManagement.vue"),
        },
      ],
    },
  ],
});
