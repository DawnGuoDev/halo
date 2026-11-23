<script lang="ts" setup>
import {
  VButton,
  VFilterDropdown,
  VFilterDropdownGroup,
} from "@halo-dev/components";
import SearchInput from "@/components/input/SearchInput.vue";
import type { ModerationStatus, SubjectKind } from "./types";

defineProps<{
  keyword: string;
  status: ModerationStatus | undefined;
  subjectKind: SubjectKind | undefined;
  hasFilters: boolean;
}>();

const emit = defineEmits<{
  (e: "update:keyword", value: string): void;
  (e: "update:status", value: ModerationStatus | undefined): void;
  (e: "update:subject-kind", value: SubjectKind | undefined): void;
  (e: "reset"): void;
}>();
</script>

<template>
  <div class="flex w-full flex-wrap items-center gap-3">
    <div class="min-w-56 flex-1">
      <SearchInput
        :model-value="keyword"
        placeholder="搜索评论内容或评论人"
        @update:model-value="emit('update:keyword', $event)"
      />
    </div>
    <VFilterDropdownGroup
      :clear-label="'重置筛选'"
      :has-external-filters="hasFilters"
      @clear="emit('reset')"
    >
      <VFilterDropdown
        :model-value="status"
        label="审核状态"
        show-clear-option
        :clear-label="'全部状态'"
        :options="[
          { label: '待审核', value: 'pending' },
          { label: '已通过', value: 'approved' },
          { label: '已驳回', value: 'rejected' },
        ]"
        @update:model-value="
          emit('update:status', $event as ModerationStatus | undefined)
        "
      />
      <VFilterDropdown
        :model-value="subjectKind"
        label="内容类型"
        show-clear-option
        :clear-label="'全部类型'"
        :options="[
          { label: '文章', value: 'post' },
          { label: '独立页面', value: 'single-page' },
        ]"
        @update:model-value="
          emit('update:subject-kind', $event as SubjectKind | undefined)
        "
      />
    </VFilterDropdownGroup>
    <VButton v-if="hasFilters" type="default" size="sm" @click="emit('reset')">
      重置筛选
    </VButton>
  </div>
</template>
