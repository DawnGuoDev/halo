<script setup lang="ts">
import { VLoading } from "@halo-dev/components";
import { computed } from "vue";

const props = defineProps<{
  stats: { pending: number; approved: number; rejected: number };
  active?: "pending" | "approved" | "rejected" | "all";
  loading?: boolean;
}>();

const emit = defineEmits<{
  (event: "select", key: "pending" | "approved" | "rejected" | "all"): void;
}>();

const cards = computed(() => [
  {
    key: "pending" as const,
    label: "待审核",
    value: props.stats.pending,
    hint: "等待人工处理",
    accent: "text-amber-600",
    bar: "bg-amber-400",
    ring: "ring-amber-200",
  },
  {
    key: "approved" as const,
    label: "已通过",
    value: props.stats.approved,
    hint: "已公开显示",
    accent: "text-green-700",
    bar: "bg-green-500",
    ring: "ring-green-200",
  },
  {
    key: "rejected" as const,
    label: "已驳回",
    value: props.stats.rejected,
    hint: "取消通过，未公开显示",
    accent: "text-gray-700",
    bar: "bg-gray-400",
    ring: "ring-gray-200",
  },
]);
</script>

<template>
  <section aria-label="全站审核统计" data-testid="moderation-stats">
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <button
        v-for="card in cards"
        :key="card.key"
        :class="[
          'group relative cursor-pointer overflow-hidden rounded-base bg-white p-4 text-left shadow-sm ring-1 transition hover:shadow',
          active === card.key ? 'ring-2 ring-primary' : 'ring-[#eaecf0]',
        ]"
        :aria-pressed="active === card.key"
        :data-testid="`stat-${card.key}`"
        type="button"
        @click="emit('select', card.key)"
      >
        <span
          :class="['absolute inset-y-0 left-0 w-1', card.bar]"
          aria-hidden="true"
        ></span>
        <div class="flex items-start justify-between gap-3 pl-2">
          <div>
            <div class="text-sm text-gray-500">{{ card.label }}</div>
            <div class="mt-1 flex items-baseline gap-1.5">
              <span
                :class="['text-2xl font-semibold', card.accent]"
                :data-testid="`stat-${card.key}-value`"
              >
                <span v-if="loading" class="inline-flex align-middle"
                  ><VLoading
                /></span>
                <template v-else>{{ card.value }}</template>
              </span>
              <span class="text-xs text-gray-400">条</span>
            </div>
          </div>
          <span
            class="rounded-full bg-gray-50 px-2 py-0.5 text-[11px] text-gray-400"
            >全站</span
          >
        </div>
        <div class="mt-2 pl-2 text-xs text-gray-400">{{ card.hint }}</div>
      </button>
    </div>
    <p class="mt-2 text-xs text-gray-400">
      统计为全站顶层评论，不随下方筛选变化。点击任一状态可快速筛选列表。
    </p>
  </section>
</template>
