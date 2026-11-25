<script lang="ts" setup>
import { IconSearch } from "@halo-dev/components";

// 精简自业务仓库 ui/console-src/components/input/SearchInput.vue 的视觉与行为
const model = defineModel<string>({ default: "" });
</script>

<template>
  <div class="relative w-full sm:w-64">
    <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400">
      <IconSearch />
    </span>
    <input
      v-model="model"
      type="search"
      placeholder="搜索文章…"
      class="h-9 w-full rounded border-gray-300 pl-8 pr-2 text-sm focus:border-primary focus:ring-primary"
    />
  </div>
</template>
