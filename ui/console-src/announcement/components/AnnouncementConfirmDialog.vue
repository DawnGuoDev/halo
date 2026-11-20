<script lang="ts" setup>
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    visible: boolean;
    title: string;
    description: string;
    confirmText?: string;
    danger?: boolean;
    loading?: boolean;
  }>(),
  {
    confirmText: "确认",
    danger: false,
    loading: false,
  }
);

const emit = defineEmits<{
  (event: "cancel"): void;
  (event: "confirm"): void;
}>();

const confirmClass = computed(() =>
  props.danger
    ? "announcement-dialog__button--danger"
    : "announcement-dialog__button--primary"
);
</script>

<template>
  <div
    v-if="visible"
    class="announcement-dialog"
    role="alertdialog"
    aria-modal="true"
  >
    <div class="announcement-dialog__mask" @click="emit('cancel')" />
    <div class="announcement-dialog__panel">
      <h3>{{ title }}</h3>
      <p>{{ description }}</p>
      <div class="announcement-dialog__actions">
        <button
          type="button"
          class="announcement-dialog__button"
          :disabled="loading"
          @click="emit('cancel')"
        >
          取消
        </button>
        <button
          type="button"
          class="announcement-dialog__button"
          :class="confirmClass"
          :disabled="loading"
          @click="emit('confirm')"
        >
          <span v-if="loading" class="announcement-dialog__spinner" />
          {{ loading ? "处理中..." : confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.announcement-dialog {
  position: fixed;
  inset: 0;
  z-index: 70;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;

  &__mask {
    position: absolute;
    inset: 0;
    background-color: rgba(15, 23, 42, 0.45);
  }

  &__panel {
    position: relative;
    z-index: 1;
    width: 100%;
    max-width: 420px;
    border-radius: 8px;
    background-color: #fff;
    padding: 20px;
    box-shadow: 0 20px 50px rgba(15, 23, 42, 0.25);

    h3 {
      font-size: 16px;
      font-weight: 700;
      color: #111827;
    }

    p {
      margin-top: 8px;
      font-size: 13px;
      line-height: 1.7;
      color: #4b5563;
      white-space: pre-wrap;
    }
  }

  &__actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 20px;
  }

  &__button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 36px;
    padding: 0 16px;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    background-color: #fff;
    font-size: 14px;
    color: #374151;

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    &--primary {
      border-color: #4ccba0;
      background-color: #4ccba0;
      color: #0e1731;
      font-weight: 600;
    }

    &--danger {
      border-color: #d71d1d;
      background-color: #d71d1d;
      color: #fff;
      font-weight: 600;
    }
  }

  &__spinner {
    width: 12px;
    height: 12px;
    border: 2px solid rgba(255, 255, 255, 0.4);
    border-top-color: #fff;
    border-radius: 50%;
    animation: announcement-dialog-spin 0.6s linear infinite;
  }
}

@keyframes announcement-dialog-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
