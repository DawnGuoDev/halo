<script setup lang="ts">
import { IconClose, VButton, VSpace } from "@halo-dev/components";
import { nextTick, onMounted, ref, useTemplateRef } from "vue";

const props = withDefaults(
  defineProps<{
    title: string;
    confirmText?: string;
    cancelText?: string;
    tone?: "default" | "danger";
    loading?: boolean;
    confirmDisabled?: boolean;
    testid?: string;
  }>(),
  {
    confirmText: "确定",
    cancelText: "取消",
    tone: "default",
    loading: false,
    confirmDisabled: false,
    testid: "confirm-dialog",
  }
);

const emit = defineEmits<{
  (event: "confirm"): void;
  (event: "cancel"): void;
}>();

const panel = useTemplateRef<HTMLElement>("panel");
const cancel = ref<HTMLButtonElement>();

onMounted(async () => {
  await nextTick();
  cancel.value?.focus();
});

function handleKeydown(event: KeyboardEvent) {
  if (event.key === "Escape" && !props.loading) {
    event.preventDefault();
    emit("cancel");
  }
  if (event.key === "Tab" && panel.value) {
    const focusable = Array.from(
      panel.value.querySelectorAll<HTMLElement>("button:not([disabled])")
    ).filter((el) => el.getClientRects().length > 0);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
}
</script>

<template>
  <div
    class="fixed inset-0 z-[60] flex items-center justify-center"
    @keydown="handleKeydown"
  >
    <div
      class="absolute inset-0 bg-black/30"
      @click="loading ? undefined : emit('cancel')"
    />
    <section
      ref="panel"
      :data-testid="testid"
      class="relative z-10 w-[460px] max-w-[calc(100vw-32px)] rounded-base bg-white shadow-xl outline-none"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div class="flex items-start justify-between gap-3 px-5 pt-4">
        <h2 id="confirm-dialog-title" class="text-base font-bold text-gray-900">
          {{ title }}
        </h2>
        <button
          class="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50"
          type="button"
          aria-label="关闭"
          :disabled="loading"
          @click="emit('cancel')"
        >
          <IconClose class="h-4 w-4" />
        </button>
      </div>
      <div class="px-5 pb-4 pt-2 text-sm text-gray-700">
        <slot />
      </div>
      <div class="flex justify-end border-t border-gray-100 px-5 py-3">
        <VSpace>
          <VButton
            :type="tone === 'danger' ? 'danger' : 'primary'"
            :loading="loading"
            :disabled="confirmDisabled"
            data-testid="confirm-dialog-confirm"
            @click="emit('confirm')"
          >
            {{ confirmText }}
          </VButton>
          <button
            ref="cancel"
            type="button"
            :disabled="loading"
            class="btn btn-default btn-md"
            data-testid="confirm-dialog-cancel"
            @click="emit('cancel')"
          >
            <span class="btn-content">{{ cancelText }}</span>
          </button>
        </VSpace>
      </div>
    </section>
  </div>
</template>
