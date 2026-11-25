<script lang="ts" setup>
import { IconRefreshLine } from "@halo-dev/components";
import { t } from "@/i18n";
// v-tooltip 已在 main.ts 全局注册（与业务控制台一致）

// 运营概览卡片外壳：沿用仪表盘 WidgetCard 的白色表面、圆角与 1px 描边，
// 增加卡片标题、可选右侧工具区与区域级刷新（局部失败时用于重试）。
defineProps<{
  title: string;
  description?: string;
  refreshing?: boolean;
  hideRefresh?: boolean;
}>();
const emit = defineEmits<{ (e: "refresh"): void }>();
</script>

<template>
  <div
    class="flex h-full w-full flex-col overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-[#eaecf0]"
  >
    <div
      class="flex min-h-12 flex-none flex-wrap items-center justify-between gap-2 border-b border-[#eaecf0] px-4 py-2"
    >
      <div class="flex min-w-0 flex-col">
        <span class="text-base font-medium text-gray-900">{{ title }}</span>
        <span v-if="description" class="mt-0.5 text-xs text-gray-500">
          {{ description }}
        </span>
      </div>
      <div class="flex flex-none items-center gap-2">
        <slot name="actions"></slot>
        <button
          v-if="!hideRefresh"
          v-tooltip="t('core.common.buttons.refresh')"
          type="button"
          :aria-label="t('core.common.buttons.refresh')"
          data-testid="card-refresh"
          class="group cursor-pointer rounded p-1 hover:bg-gray-100"
          @click="emit('refresh')"
        >
          <IconRefreshLine
            :class="{ 'animate-spin text-gray-900': refreshing }"
            class="h-4 w-4 text-gray-500 group-hover:text-gray-900"
          />
        </button>
      </div>
    </div>
    <div class="min-h-0 flex-1 p-4">
      <slot></slot>
    </div>
  </div>
</template>
