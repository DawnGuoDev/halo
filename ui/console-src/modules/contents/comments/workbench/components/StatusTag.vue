<script setup lang="ts">
import { VStatusDot } from "@halo-dev/components";
import { computed } from "vue";
import type { AuditStatus } from "../types";

const props = defineProps<{
  status: AuditStatus;
}>();

const config = computed(() => {
  switch (props.status) {
    case "approved":
      return { label: "已通过", state: "success" as const };
    case "rejected":
      return { label: "已驳回", state: "default" as const };
    default:
      return { label: "待审核", state: "warning" as const };
  }
});
</script>

<template>
  <span class="inline-flex items-center" :data-testid="`status-${status}`">
    <VStatusDot :state="config.state" :text="config.label" />
  </span>
</template>
