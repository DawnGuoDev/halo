<script lang="ts" setup>
import { computed } from "vue";
import type { ModerationStatus } from "./types";

const props = defineProps<{
  status: ModerationStatus;
}>();

const config = computed(() => {
  switch (props.status) {
    case "approved":
      return { label: "已通过", classes: "bg-green-50 text-green-700" };
    case "rejected":
      return { label: "已驳回", classes: "bg-red-50 text-red-700" };
    default:
      return { label: "待审核", classes: "bg-amber-50 text-amber-700" };
  }
});
</script>

<template>
  <span
    class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
    :class="config.classes"
    :data-status="status"
  >
    {{ config.label }}
  </span>
</template>
