<script lang="ts" setup>
import { VButton, VLoading } from "@halo-dev/components";
import { computed } from "vue";
import type { BatchOutcome } from "../preview/use-comment-moderation";

const props = defineProps<{
  outcome: BatchOutcome;
  retrying?: boolean;
}>();

const emit = defineEmits<{
  (e: "retry"): void;
  (e: "dismiss"): void;
}>();

const actionLabel = computed(() =>
  props.outcome.action === "approve" ? "通过" : "驳回"
);
const successCount = computed(() => props.outcome.successNames.length);
const failureCount = computed(() => props.outcome.failures.length);
</script>

<template>
  <div
    class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
    data-testid="batch-outcome"
  >
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div class="text-sm text-gray-900">
        批量{{ actionLabel }}：共处理
        <span class="font-semibold">{{ outcome.total }}</span> 条，成功
        <span
          class="font-semibold text-green-600"
          data-testid="batch-success-count"
          >{{ successCount }}</span
        >
        条，失败
        <span
          class="font-semibold text-red-600"
          data-testid="batch-failure-count"
          >{{ failureCount }}</span
        >
        条
      </div>
      <div class="flex items-center gap-2">
        <VButton
          v-if="failureCount > 0"
          type="primary"
          size="sm"
          :disabled="retrying"
          data-testid="retry-failed"
          @click="emit('retry')"
        >
          {{ retrying ? "重试中…" : "仅重试失败项" }}
        </VButton>
        <VButton type="default" size="sm" @click="emit('dismiss')"
          >关闭</VButton
        >
      </div>
    </div>

    <div
      v-if="retrying"
      class="mt-2 flex items-center gap-2 text-xs text-gray-500"
    >
      <VLoading class="!inline-flex !py-0" />
      正在重试失败项…
    </div>

    <div
      v-if="failureCount > 0"
      class="mt-3 rounded-md border border-red-100 bg-red-50/60 p-3"
    >
      <div class="mb-2 text-xs font-medium text-red-700">
        未处理成功（状态未变更）
      </div>
      <ul class="space-y-1 text-xs text-gray-700">
        <li
          v-for="failure in outcome.failures"
          :key="failure.name"
          class="flex flex-wrap justify-between gap-2"
          :data-failure-name="failure.name"
        >
          <span class="min-w-0 flex-1 truncate">
            <span class="font-medium">{{ failure.author }}</span
            >：{{ failure.excerpt }}
          </span>
          <span class="text-red-600">{{ failure.reason }}</span>
        </li>
      </ul>
    </div>
    <p
      v-else
      class="mt-2 text-xs text-green-700"
      data-testid="batch-all-success"
    >
      全部记录处理成功。
    </p>
  </div>
</template>
