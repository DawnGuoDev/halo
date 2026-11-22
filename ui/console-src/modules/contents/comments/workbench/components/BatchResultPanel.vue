<script setup lang="ts">
import { VButton, VTag } from "@halo-dev/components";
import { computed } from "vue";
import { getMockLabel } from "../composables/comment-service";
import type { BatchOperationResult } from "../types";

const props = defineProps<{
  action: "approve" | "reject";
  result: BatchOperationResult;
  retrying?: boolean;
  names: string[];
}>();

const emit = defineEmits<{
  (event: "retry"): void;
  (event: "close"): void;
}>();

const actionLabel = computed(() =>
  props.action === "approve" ? "通过" : "驳回"
);
const hasFailure = computed(() => props.result.failed.length > 0);

function labelOf(name: string) {
  return getMockLabel(name);
}
</script>

<template>
  <div class="fixed inset-0 z-[60] flex items-center justify-center">
    <div class="absolute inset-0 bg-black/30" />
    <section
      class="relative z-10 w-[560px] max-w-[calc(100vw-32px)] rounded-base bg-white shadow-xl"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="batch-result-title"
      data-testid="batch-result"
    >
      <div class="border-b border-gray-100 px-5 py-4">
        <div class="flex items-center gap-2">
          <h2 id="batch-result-title" class="text-base font-bold text-gray-900">
            {{ hasFailure ? "批量审核部分失败" : "批量审核完成" }}
          </h2>
          <VTag>{{ actionLabel }}</VTag>
        </div>
        <p class="mt-1 text-sm text-gray-600">
          {{
            hasFailure
              ? `成功 ${result.succeeded.length} 条，失败 ${result.failed.length} 条。可以仅重试失败项，已成功的记录不会重复提交。`
              : `已处理 ${result.succeeded.length} 条评论。`
          }}
        </p>
      </div>
      <div class="max-h-[44vh] overflow-y-auto px-5 py-4">
        <div class="grid grid-cols-2 gap-2 text-sm">
          <div class="rounded-base border border-gray-200 p-3">
            <div class="text-xs text-gray-500">成功</div>
            <div
              class="mt-0.5 text-lg font-semibold text-green-700"
              data-testid="batch-result-succeeded"
            >
              {{ result.succeeded.length }}
            </div>
          </div>
          <div class="rounded-base border border-gray-200 p-3">
            <div class="text-xs text-gray-500">失败</div>
            <div
              :class="[
                'mt-0.5 text-lg font-semibold',
                hasFailure ? 'text-red-700' : 'text-gray-700',
              ]"
              data-testid="batch-result-failed"
            >
              {{ result.failed.length }}
            </div>
          </div>
        </div>
        <div v-if="hasFailure" class="mt-3">
          <div class="mb-1 text-xs font-medium text-gray-700">失败记录</div>
          <ul class="space-y-1" data-testid="batch-failed-list">
            <li
              v-for="failure in result.failed"
              :key="failure.name"
              class="rounded-base border border-red-200 bg-red-50 px-3 py-2 text-sm"
            >
              <div class="font-medium text-red-800">
                {{ labelOf(failure.name) }}
              </div>
              <div class="text-xs text-red-700">{{ failure.reason }}</div>
            </li>
          </ul>
        </div>
      </div>
      <div
        class="flex flex-wrap justify-end gap-2 border-t border-gray-100 px-5 py-3"
      >
        <VButton
          v-if="hasFailure"
          type="primary"
          :loading="retrying"
          data-testid="retry-failed"
          @click="emit('retry')"
        >
          仅重试失败项（{{ result.failed.length }}）
        </VButton>
        <VButton :disabled="retrying" @click="emit('close')">关闭</VButton>
      </div>
    </section>
  </div>
</template>
