<script lang="ts" setup>
import { utils } from "@halo-dev/ui-shared";
import { useRouteQuery } from "@vueuse/router";
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { createHaloCommentService } from "./workbench/api-comment-service";
import CommentModerationWorkbench from "./workbench/components/CommentModerationWorkbench.vue";
import type { AuditStatus } from "./workbench/types";

const { t } = useI18n();
const service = createHaloCommentService();
const canManage = computed(() =>
  utils.permission.has(["system:comments:manage"])
);

const initialStatus = useRouteQuery<string | undefined>("approved");
const initialKeyword = useRouteQuery<string>("keyword", "");

const status: AuditStatus | "all" =
  initialStatus.value === "true"
    ? "approved"
    : initialStatus.value === "false"
      ? "pending"
      : "all";
</script>

<template>
  <CommentModerationWorkbench
    :service="service"
    :can-manage="canManage"
    :initial-status="status"
    :initial-keyword="initialKeyword"
    :title="t('core.comment.workbench.title')"
    :subtitle="t('core.comment.workbench.subtitle')"
  />
</template>
