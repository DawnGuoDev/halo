<script lang="ts" setup>
import type { ListedPost } from "@halo-dev/api-client";
import { IconEye, VEntityField } from "@halo-dev/components";
import { computed } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const props = withDefaults(
  defineProps<{
    post: ListedPost;
  }>(),
  {}
);

const visitCount = computed(() => {
  const visit = props.post.stats?.visit;
  if (typeof visit !== "number" || !Number.isFinite(visit) || visit < 0) {
    return 0;
  }
  return visit;
});
</script>

<template>
  <VEntityField>
    <template #description>
      <div
        :aria-label="t('core.post.list.fields.views')"
        class="inline-flex items-center space-x-2"
        role="status"
      >
        <IconEye class="h-3.5 w-3.5 text-gray-500" aria-hidden="true" />
        <span
          v-tooltip="t('core.post.list.fields.views')"
          class="entity-field-description tabular-nums"
        >
          {{ visitCount }}
        </span>
      </div>
    </template>
  </VEntityField>
</template>
