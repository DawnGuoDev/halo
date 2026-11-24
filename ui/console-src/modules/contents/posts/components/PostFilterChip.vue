<script lang="ts" setup>
import { IconClose } from "@halo-dev/components";
import { computed } from "vue";
import { useI18n } from "vue-i18n";

const props = withDefaults(
  defineProps<{
    label: string;
    value: string;
  }>(),
  {}
);

const emit = defineEmits<{
  (event: "remove"): void;
}>();

const { t } = useI18n();

const text = computed(() => `${props.label}：${props.value}`);
const removeLabel = computed(() =>
  t("core.post.filters.chips.remove", { filter: text.value })
);
</script>

<template>
  <span
    class="post-filter-chip inline-flex max-w-full items-center gap-1 rounded-full border border-gray-200 bg-gray-50 py-0.5 pl-2.5 pr-1 text-xs leading-5 text-gray-700"
  >
    <span class="min-w-0 truncate" :title="text">
      <span class="text-gray-500">{{ label }}：</span>
      <span class="font-medium text-gray-900">{{ value }}</span>
    </span>
    <button
      type="button"
      class="flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      :aria-label="removeLabel"
      :title="removeLabel"
      @click="emit('remove')"
    >
      <IconClose class="h-3 w-3" aria-hidden="true" />
    </button>
  </span>
</template>
