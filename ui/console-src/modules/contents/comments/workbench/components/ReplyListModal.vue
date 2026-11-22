<script setup lang="ts">
import { IconClose, VButton, VLoading } from "@halo-dev/components";
import { onMounted, ref } from "vue";
import type { ListedReply } from "../types";
import StatusTag from "./StatusTag.vue";

defineProps<{
  commentName: string;
  replies: ListedReply[];
  loading?: boolean;
}>();

const emit = defineEmits<{
  (event: "close"): void;
}>();

const close = ref<HTMLButtonElement>();
onMounted(() => close.value?.focus());
</script>

<template>
  <div
    class="fixed inset-0 z-[55] flex items-center justify-center"
    @keydown.esc="emit('close')"
  >
    <div class="absolute inset-0 bg-black/30" @click="emit('close')" />
    <section
      class="relative z-10 max-h-[70vh] w-[560px] max-w-[calc(100vw-32px)] overflow-hidden rounded-base bg-white shadow-xl"
      role="dialog"
      aria-modal="true"
      aria-label="回复列表"
    >
      <header
        class="flex items-center justify-between border-b border-gray-100 px-5 py-3"
      >
        <h2 class="text-base font-bold text-gray-900">
          回复（{{ replies.length }}）
        </h2>
        <button
          ref="close"
          type="button"
          class="rounded p-1 hover:bg-gray-100"
          aria-label="关闭"
          @click="emit('close')"
        >
          <IconClose class="h-4 w-4" />
        </button>
      </header>
      <div class="max-h-[56vh] overflow-y-auto px-5 py-4">
        <VLoading v-if="loading" />
        <ul v-else class="space-y-3">
          <li
            v-for="item in replies"
            :key="item.reply.metadata.name"
            class="rounded-base border border-gray-200 p-3"
          >
            <div
              class="flex flex-wrap items-center gap-2 text-xs text-gray-500"
            >
              <span class="font-medium text-gray-900">{{
                item.reply.spec.owner.displayName || item.reply.spec.owner.name
              }}</span>
              <StatusTag
                :status="
                  item.reply.spec.approved
                    ? 'approved'
                    : item.reply.spec.approvedTime
                      ? 'rejected'
                      : 'pending'
                "
              />
              <span v-if="item.reply.spec.quoteReply"
                >引用 {{ item.reply.spec.quoteReply }}</span
              >
            </div>
            <p class="mt-1 whitespace-pre-wrap text-sm text-gray-800">
              {{ item.reply.spec.raw }}
            </p>
          </li>
        </ul>
      </div>
      <footer class="flex justify-end border-t border-gray-100 px-5 py-3">
        <VButton @click="emit('close')">关闭</VButton>
      </footer>
    </section>
  </div>
</template>
