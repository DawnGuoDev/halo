<script lang="ts" setup>
import type {
  FilterDropdownOption,
  FilterDropdownValue,
} from "@/components/halo/filter";
import { VFilterDropdown } from "@/components/halo/filter";
import { computed } from "vue";
import { useAllPostTagsQuery } from "@/composables/use-resource-queries";
import { t } from "@/i18n";

// 迁自业务仓库 ui/src/components/filter/TagFilterDropdown.vue：
// 数据入口替换为本地查询；value = 标签 name，label = displayName，颜色圆点保留。
withDefaults(
  defineProps<{
    label: string;
    modelValue?: string;
  }>(),
  {
    modelValue: undefined,
  }
);

const emit = defineEmits<{
  (event: "update:modelValue", value?: string): void;
}>();

const { data: tags } = useAllPostTagsQuery();

const options = computed<FilterDropdownOption[]>(() => {
  return (
    tags.value?.map((tag) => ({
      label: tag.displayName,
      value: tag.name,
      description: `/tags/${tag.name}`,
      keywords: [tag.name],
      color: tag.color,
      postCount: tag.postCount,
    })) || []
  );
});

function getPostCount(option: FilterDropdownOption) {
  return t("core.common.fields.post_count", {
    count: (option.postCount as number) || 0,
  });
}

function handleUpdate(value?: FilterDropdownValue) {
  emit("update:modelValue", typeof value === "string" ? value : undefined);
}
</script>

<template>
  <VFilterDropdown
    :model-value="modelValue"
    :label="label"
    :options="options"
    searchable
    :search-placeholder="t('core.common.placeholder.search')"
    :empty-text="t('core.components.global_search.no_results')"
    panel-width="22rem"
    @update:model-value="handleUpdate"
  >
    <template #option="{ option, selected }">
      <span
        class="h-2.5 w-2.5 shrink-0 rounded-full"
        :style="{ backgroundColor: (option.color as string) || '#d9d9d9' }"
      />
      <div class="flex min-w-0 flex-1 flex-col">
        <span
          class="truncate text-sm"
          :class="selected ? 'font-medium text-gray-900' : 'text-gray-700'"
        >
          {{ option.label }}
        </span>
        <span v-if="option.description" class="truncate text-xs text-gray-500">
          {{ option.description }}
        </span>
      </div>
      <span class="shrink-0 text-xs text-gray-500">
        {{ getPostCount(option) }}
      </span>
    </template>
  </VFilterDropdown>
</template>
