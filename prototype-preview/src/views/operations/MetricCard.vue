<script lang="ts" setup>
import { computed } from "vue";
import type { Component } from "vue";
import { t } from "@/i18n";

// 指标卡：参考仪表盘统计卡（图标 + 指标名 + 大数字）；
// 新增文章 / 收到评论附带较上一周期变化，待审核为当前存量不显示变化。
const props = defineProps<{
  label: string;
  value: number;
  icon: Component;
  change?: number | null;
  testid: string;
}>();

const changeState = computed(() => {
  if (props.change === undefined || props.change === null) return null;
  if (props.change > 0) return "up";
  if (props.change < 0) return "down";
  return "flat";
});

const changeText = computed(() => {
  if (props.change === undefined || props.change === null) return "";
  if (props.change === 0) return t("core.operations.metrics.flat");
  return `${props.change > 0 ? "↑" : "↓"} ${Math.abs(props.change)}`;
});
</script>

<template>
  <div
    class="flex h-full flex-col justify-between rounded-lg bg-white p-4 shadow-sm ring-1 ring-[#eaecf0]"
    :data-testid="testid"
  >
    <div class="flex items-center gap-3">
      <span class="rounded-full bg-gray-100 p-2 text-gray-600">
        <component :is="icon" class="h-4 w-4" />
      </span>
      <span class="text-sm text-gray-500">{{ label }}</span>
    </div>
    <div class="mt-3 flex items-end justify-between gap-2">
      <span
        class="text-[1.75rem] font-medium leading-none text-gray-900"
        data-testid="metric-value"
      >
        {{ value }}
      </span>
      <span
        v-if="changeState"
        :class="[
          'inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium',
          changeState === 'up'
            ? 'bg-green-50 text-green-600'
            : changeState === 'down'
              ? 'bg-red-50 text-red-600'
              : 'bg-gray-100 text-gray-500',
        ]"
        :data-testid="`${testid}-change`"
        :data-state="changeState"
      >
        <span class="mr-0.5">{{ t("core.operations.metrics.change") }}</span>{{ changeText }}
      </span>
      <span
        v-else
        class="text-xs text-gray-400"
        :data-testid="`${testid}-hint`"
      >
        {{ t("core.operations.metrics.current_stock") }}
      </span>
    </div>
  </div>
</template>
