<script lang="ts" setup>
import { VTag } from "@halo-dev/components";
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { CalendarPostStatus } from "../mock-posts";

const props = defineProps<{
  status: CalendarPostStatus;
  unscheduled?: boolean;
}>();

const { t } = useI18n();

type Theme = "default" | "primary" | "secondary" | "danger";

const config = computed<{ label: string; theme: Theme; dot: string }>(() => {
  switch (props.status) {
    case "published":
      return {
        label: t("core.publish_calendar.status.published"),
        theme: "default",
        dot: "bg-green-500",
      };
    case "scheduled":
      return props.unscheduled
        ? {
            label: t("core.publish_calendar.status.unscheduled"),
            theme: "secondary",
            dot: "bg-gray-400",
          }
        : {
            label: t("core.publish_calendar.status.scheduled"),
            theme: "primary",
            dot: "bg-primary",
          };
    case "draft":
      return {
        label: t("core.publish_calendar.status.draft"),
        theme: "secondary",
        dot: "bg-gray-400",
      };
    default:
      return {
        label: t("core.publish_calendar.status.recycled"),
        theme: "danger",
        dot: "bg-red-500",
      };
  }
});
</script>

<template>
  <VTag :theme="config.theme">
    <span class="inline-flex items-center gap-1">
      <span class="h-1.5 w-1.5 rounded-full" :class="config.dot"></span>
      {{ config.label }}
    </span>
  </VTag>
</template>
