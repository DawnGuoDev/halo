<script lang="ts" setup>
import { IconCloseCircle, IconSearch } from "@halo-dev/components";
import { ref, watch } from "vue";

// 迁自业务仓库 ui/src/components/input/SearchInput.vue 的交互语义（FormKit 未纳入）：
// 输入不即时生效；按 Enter 提交关键词，点击右侧清除按钮提交空关键词。
const props = withDefaults(
  defineProps<{
    modelValue: string;
    placeholder?: string;
  }>(),
  {
    placeholder: "搜索…",
  }
);

const emit = defineEmits<{
  (event: "update:modelValue", modelValue: string): void;
}>();

const inputRef = ref<HTMLInputElement>();
const draft = ref(props.modelValue);

watch(
  () => props.modelValue,
  (value) => {
    if (value !== draft.value) {
      draft.value = value;
    }
  }
);

function submit() {
  const value = draft.value.trim();
  draft.value = value;
  emit("update:modelValue", value);
}

function handleReset() {
  draft.value = "";
  inputRef.value?.focus();
  emit("update:modelValue", "");
}
</script>

<template>
  <div class="relative w-full sm:w-64">
    <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400">
      <IconSearch class="h-4 w-4" />
    </span>
    <input
      ref="inputRef"
      v-model="draft"
      data-testid="post-search-input"
      type="text"
      :placeholder="placeholder"
      class="h-9 w-full rounded border-gray-300 pl-8 text-sm focus:border-primary focus:ring-primary"
      :class="modelValue ? 'pr-8' : 'pr-2'"
      @keyup.enter="submit"
    />
    <button
      v-if="modelValue"
      type="button"
      data-testid="post-search-clear"
      aria-label="清空关键词"
      class="absolute right-1 top-1/2 flex h-7 w-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded text-gray-500 hover:bg-gray-50 hover:text-gray-700"
      @click="handleReset"
    >
      <IconCloseCircle class="h-4 w-4" />
    </button>
  </div>
</template>
