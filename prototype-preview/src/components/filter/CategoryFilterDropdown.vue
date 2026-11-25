<script lang="ts" setup>
import type {
  FilterDropdownOption,
  FilterDropdownValue,
} from "@/components/halo/filter";
import { VFilterDropdown } from "@/components/halo/filter";
import { computed } from "vue";
import { usePostCategory } from "@/composables/use-resource-queries";
import { t } from "@/i18n";

// 迁自业务仓库 ui/src/components/filter/CategoryFilterDropdown.vue：
// 数据入口替换为 @/composables/use-resource-queries（业务为 @console/... + vue-query），
// 保留选项结构（value = 分类 name，label = displayName）与计数展示。
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

const { categories } = usePostCategory();

const options = computed<FilterDropdownOption[]>(() => {
  return (
    categories.value?.map((category) => ({
      label: category.displayName,
      value: category.name,
      description: `/archives/${category.name}`,
      keywords: [category.name],
      postCount: category.postCount,
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
