<script lang="ts" setup>
import {
  IconCheckboxCircle,
  IconForbidLine,
  IconTimerLine,
} from "@halo-dev/components";
import type { ModerationStatus } from "./types";

defineProps<{
  pending: number;
  approved: number;
  rejected: number;
  active: ModerationStatus | undefined;
  loading?: boolean;
}>();

const emit = defineEmits<{
  (e: "select", value: ModerationStatus): void;
}>();

const cards: {
  value: ModerationStatus;
  label: string;
  tone: "amber" | "green" | "red";
}[] = [
  { value: "pending", label: "待审核", tone: "amber" },
  { value: "approved", label: "已通过", tone: "green" },
  { value: "rejected", label: "已驳回", tone: "red" },
];

const tones = {
  amber: {
    iconWrap: "bg-amber-50 text-amber-600",
    active: "border-amber-400 ring-2 ring-amber-100",
  },
  green: {
    iconWrap: "bg-green-50 text-green-600",
    active: "border-green-400 ring-2 ring-green-100",
  },
  red: {
    iconWrap: "bg-red-50 text-red-600",
    active: "border-red-400 ring-2 ring-red-100",
  },
};
</script>

<template>
  <div
    class="grid grid-cols-1 gap-3 sm:grid-cols-3"
    data-testid="moderation-stats"
  >
    <button
      v-for="card in cards"
      :key="card.value"
      type="button"
      class="flex cursor-pointer items-center gap-4 rounded-lg border bg-white px-4 py-3 text-left transition-colors hover:bg-gray-50"
      :class="
        active === card.value ? tones[card.tone].active : 'border-gray-200'
      "
      :data-testid="`stat-${card.value}`"
      @click="emit('select', card.value)"
    >
      <span class="rounded-full p-2" :class="tones[card.tone].iconWrap">
        <IconTimerLine v-if="card.value === 'pending'" class="h-5 w-5" />
        <IconCheckboxCircle
          v-else-if="card.value === 'approved'"
          class="h-5 w-5"
        />
        <IconForbidLine v-else class="h-5 w-5" />
      </span>
      <span class="flex flex-col">
        <span class="text-sm text-gray-500">{{ card.label }}</span>
        <span
          v-if="loading"
          class="h-7 w-10 animate-pulse rounded bg-gray-100"
        ></span>
        <span v-else class="text-2xl font-semibold text-gray-900">{{
          card.value === "pending"
            ? pending
            : card.value === "approved"
              ? approved
              : rejected
        }}</span>
      </span>
    </button>
  </div>
</template>
