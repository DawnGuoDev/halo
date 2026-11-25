<script lang="ts" setup>
import { VAvatar } from "@halo-dev/components";
import { VFilterDropdown } from "@/components/halo/filter";
import type {
  FilterDropdownOption,
  FilterDropdownValue,
} from "@/components/halo/filter";
import { computed, toRefs } from "vue";
import { useUserQueries } from "@/composables/use-resource-queries";

// 迁自业务仓库 ui/src/components/filter/UserFilterDropdown.vue：
// 保留远程搜索 + 已选用户补充、头像与用户名展示；查询替换为本地 Promise 适配。
const props = withDefaults(
  defineProps<{
    label: string;
    modelValue?: string;
  }>(),
  {
    modelValue: undefined,
  }
);

const { modelValue } = toRefs(props);

const emit = defineEmits<{
  (event: "update:modelValue", value?: string): void;
}>();

const { selectedUser, users, isFetching, search } = useUserQueries(modelValue);

const options = computed<FilterDropdownOption[]>(() => {
  const items =
    users.value?.map((user) => ({
      label: user.displayName,
      value: user.name,
      description: user.name,
      avatar: user.avatar,
    })) || [];

  if (
    selectedUser.value &&
    !items.some((item) => item.value === selectedUser.value?.name)
  ) {
    items.unshift({
      label: selectedUser.value.displayName,
      value: selectedUser.value.name,
      description: selectedUser.value.name,
      avatar: selectedUser.value.avatar,
    });
  }

  return items;
});

function showUsername(option: FilterDropdownOption) {
  if (!option.description) {
    return false;
  }

  return (
    String(option.description).toLowerCase() !==
    String(option.label || "").toLowerCase()
  );
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
    :selected-label="selectedUser?.displayName"
    searchable
    remote-search
    :loading="isFetching"
    search-placeholder="搜索用户"
    empty-text="无匹配结果"
    panel-width="18rem"
    @update:model-value="handleUpdate"
    @search="search"
  >
    <template #option="{ option, selected }">
      <VAvatar
        size="sm"
        circle
        :alt="option.label"
        :src="(option.avatar as string) || undefined"
      />
      <div class="flex min-w-0 flex-1 flex-col">
        <span
          class="truncate text-sm"
          :class="selected ? 'font-medium text-gray-900' : 'text-gray-700'"
        >
          {{ option.label }}
        </span>
        <span v-if="showUsername(option)" class="truncate text-xs text-gray-500">
          {{ option.description }}
        </span>
      </div>
    </template>
  </VFilterDropdown>
</template>
