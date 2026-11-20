<script lang="ts" setup>
import { VStatusDot } from "@halo-dev/components";
import { computed } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps<{
  published: boolean;
}>();

const { t } = useI18n();

const text = computed(() =>
  props.published
    ? t("core.content_calendar.status.published")
    : t("core.content_calendar.status.scheduled")
);

const type = computed(() => (props.published ? "success" : "warning"));
</script>

<template>
  <VStatusDot :text="text" :state="type" />
</template>
