<script lang="ts" setup>
import { IconEye, IconInformation } from "@halo-dev/components";
import { computed, reactive, ref, watch } from "vue";
import type {
  Announcement,
  AnnouncementDraft,
  AnnouncementFormErrors,
  AnnouncementPosition,
} from "../types";
import { POSITION_OPTIONS, statusLabel } from "../types";
import { hasErrors, toLocalInputValue, validateForm } from "../utils";
import AnnouncementPreview from "./AnnouncementPreview.vue";

const props = withDefaults(
  defineProps<{
    visible: boolean;
    announcement?: Announcement;
    submitting?: boolean;
  }>(),
  {
    announcement: undefined,
    submitting: false,
  }
);

const emit = defineEmits<{
  (event: "close"): void;
  (event: "submit", value: AnnouncementDraft): void;
}>();

const form = reactive<{
  title: string;
  content: string;
  position: AnnouncementPosition | "";
  startTime: string;
  endTime: string;
}>({
  title: "",
  content: "",
  position: "",
  startTime: "",
  endTime: "",
});

const errors = reactive<AnnouncementFormErrors>({});
const touched = reactive<Record<string, boolean>>({});
const showPreview = ref(true);

function resetForm() {
  form.title = props.announcement?.title ?? "";
  form.content = props.announcement?.content ?? "";
  form.position = props.announcement?.position ?? "";
  form.startTime = props.announcement?.startTime ?? "";
  form.endTime = props.announcement?.endTime ?? "";
  clearErrors();
  Object.keys(touched).forEach((key) => delete touched[key]);
}

function clearErrors() {
  (Object.keys(errors) as (keyof AnnouncementFormErrors)[]).forEach((key) => {
    delete errors[key];
  });
}

function revalidate() {
  const result = validateForm({
    title: form.title,
    content: form.content,
    position: form.position,
    startTime: form.startTime,
    endTime: form.endTime,
  });
  clearErrors();
  (Object.keys(result) as (keyof AnnouncementFormErrors)[]).forEach((key) => {
    if (result[key]) errors[key] = result[key];
  });
}

function touch(field: keyof AnnouncementFormErrors) {
  touched[field] = true;
  revalidate();
}

// 原生 datetime-local 在部分浏览器只触发 input；输入后即时清除对应字段错误。
function clearFieldError(field: keyof AnnouncementFormErrors) {
  if (errors[field]) delete errors[field];
}

// 弹窗由父组件 v-if 挂载：visible 从 false→true 时复位一次，并把编辑对象写入表单。
// 组件本身不依赖宿主渲染时机，避免编辑态首次打开为空表单。
resetForm();

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      resetForm();
      showPreview.value = true;
    }
  }
);

watch(
  () => props.announcement?.id,
  () => {
    resetForm();
  }
);

watch(
  () => form.title,
  () => touched.title && revalidate()
);
watch(
  () => form.content,
  () => touched.content && revalidate()
);
watch(
  () => form.startTime,
  () => errors.startTime && touched.startTime && revalidate()
);
watch(
  () => form.endTime,
  () => errors.endTime && touched.endTime && revalidate()
);

const isEditing = computed(() => !!props.announcement);
const title = computed(() => (isEditing.value ? "编辑公告" : "新建公告"));
const statusHint = computed(() => {
  if (!props.announcement) return "";
  if (props.announcement.status === "DISABLED") {
    return `该公告当前为「${statusLabel(
      props.announcement.status
    )}」，保存后将重新进入「草稿」，需要重新发布才会展示。`;
  }
  return "";
});

const previewTitle = computed(() => form.title.trim());
const previewContent = computed(() => form.content.trim());
const previewPosition = computed<AnnouncementPosition>(
  () => (form.position || "HOME_BANNER") as AnnouncementPosition
);

const defaultStart = computed(() => {
  const date = new Date(Date.now() + 60 * 60 * 1000);
  date.setSeconds(0, 0);
  return toLocalInputValue(date);
});
const defaultEnd = computed(() => {
  const date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  date.setSeconds(0, 0);
  return toLocalInputValue(date);
});

function useDefaultTimes() {
  form.startTime = defaultStart.value;
  form.endTime = defaultEnd.value;
  revalidate();
}

function handleSubmit() {
  if (props.submitting) return;
  revalidate();
  (Object.keys(errors) as (keyof AnnouncementFormErrors)[]).forEach((key) => {
    if (errors[key]) touched[key] = true;
  });
  if (hasErrors(errors)) return;
  emit("submit", {
    title: form.title.trim(),
    content: form.content.trim(),
    position: form.position as AnnouncementPosition,
    startTime: form.startTime,
    endTime: form.endTime,
  });
}
</script>

<template>
  <div class="announcement-form-modal" role="dialog" aria-modal="true">
    <div class="announcement-form-modal__mask" @click="emit('close')" />
    <div class="announcement-form-modal__panel">
      <header class="announcement-form-modal__header">
        <h2>{{ title }}</h2>
        <button
          type="button"
          class="announcement-form-modal__close"
          aria-label="关闭"
          @click="emit('close')"
        >
          ✕
        </button>
      </header>

      <div class="announcement-form-modal__body">
        <form
          class="announcement-form"
          novalidate
          @submit.prevent="handleSubmit"
        >
          <div v-if="statusHint" class="announcement-form__banner">
            <IconInformation />
            <span>{{ statusHint }}</span>
          </div>

          <div class="announcement-form__field">
            <label for="announcement-title" class="announcement-form__label">
              标题 <span class="announcement-form__required">*</span>
            </label>
            <input
              id="announcement-title"
              v-model="form.title"
              class="announcement-form__input"
              :class="{ 'is-invalid': errors.title }"
              maxlength="60"
              placeholder="请输入公告标题（60 字以内）"
              @blur="touch('title')"
            />
            <div class="announcement-form__meta">
              <p v-if="errors.title" class="announcement-form__error">
                {{ errors.title }}
              </p>
              <span class="announcement-form__counter"
                >{{ form.title.length }}/60</span
              >
            </div>
          </div>

          <div class="announcement-form__field">
            <label for="announcement-content" class="announcement-form__label">
              正文 <span class="announcement-form__required">*</span>
            </label>
            <textarea
              id="announcement-content"
              v-model="form.content"
              class="announcement-form__textarea"
              :class="{ 'is-invalid': errors.content }"
              rows="5"
              maxlength="500"
              placeholder="请输入公告正文，本轮仅支持纯文本"
              @blur="touch('content')"
            />
            <div class="announcement-form__meta">
              <p v-if="errors.content" class="announcement-form__error">
                {{ errors.content }}
              </p>
              <span class="announcement-form__counter"
                >{{ form.content.length }}/500</span
              >
            </div>
          </div>

          <div class="announcement-form__field">
            <span class="announcement-form__label">
              展示位置 <span class="announcement-form__required">*</span>
            </span>
            <div class="announcement-form__positions" role="radiogroup">
              <label
                v-for="option in POSITION_OPTIONS"
                :key="option.value"
                class="announcement-form__position"
                :class="{ 'is-active': form.position === option.value }"
              >
                <input
                  v-model="form.position"
                  type="radio"
                  name="position"
                  :value="option.value"
                  class="announcement-form__radio"
                  @change="touch('position')"
                />
                <span class="announcement-form__position-title">{{
                  option.label
                }}</span>
                <span class="announcement-form__position-desc">{{
                  option.description
                }}</span>
              </label>
            </div>
            <p v-if="errors.position" class="announcement-form__error">
              {{ errors.position }}
            </p>
          </div>

          <div class="announcement-form__row">
            <div class="announcement-form__field">
              <label for="announcement-start" class="announcement-form__label">
                开始时间 <span class="announcement-form__required">*</span>
              </label>
              <input
                id="announcement-start"
                v-model="form.startTime"
                type="datetime-local"
                class="announcement-form__input"
                :class="{ 'is-invalid': errors.startTime }"
                @input="clearFieldError('startTime')"
                @blur="touch('startTime')"
              />
              <p v-if="errors.startTime" class="announcement-form__error">
                {{ errors.startTime }}
              </p>
            </div>
            <div class="announcement-form__field">
              <label for="announcement-end" class="announcement-form__label">
                结束时间 <span class="announcement-form__required">*</span>
              </label>
              <input
                id="announcement-end"
                v-model="form.endTime"
                type="datetime-local"
                class="announcement-form__input"
                :class="{ 'is-invalid': errors.endTime }"
                @input="clearFieldError('endTime')"
                @blur="touch('endTime')"
              />
              <p v-if="errors.endTime" class="announcement-form__error">
                {{ errors.endTime }}
              </p>
            </div>
          </div>

          <div class="announcement-form__actions">
            <button
              type="button"
              class="announcement-form__link"
              @click="useDefaultTimes"
            >
              使用推荐时间（1 小时后开始，展示 7 天）
            </button>
          </div>

          <div class="announcement-form__preview">
            <button
              type="button"
              class="announcement-form__preview-toggle"
              @click="showPreview = !showPreview"
            >
              <IconEye />
              {{ showPreview ? "收起预览" : "预览展示效果" }}
            </button>
            <div v-if="showPreview" class="announcement-form__preview-body">
              <AnnouncementPreview
                :position="previewPosition"
                :title="previewTitle"
                :content="previewContent"
                dismissible
              />
            </div>
          </div>
        </form>
      </div>

      <footer class="announcement-form-modal__footer">
        <button
          type="button"
          class="announcement-form-modal__button"
          @click="emit('close')"
        >
          取消
        </button>
        <button
          type="button"
          class="announcement-form-modal__button announcement-form-modal__button--primary"
          :disabled="submitting"
          @click="handleSubmit"
        >
          <span v-if="submitting" class="announcement-form-modal__spinner" />
          {{
            submitting ? "保存中..." : isEditing ? "保存并回到草稿" : "保存草稿"
          }}
        </button>
      </footer>
    </div>
  </div>
</template>

<style scoped lang="scss">
.announcement-form-modal {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 32px 16px;

  &__mask {
    position: absolute;
    inset: 0;
    background-color: rgba(15, 23, 42, 0.45);
  }

  &__panel {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: 760px;
    max-height: calc(100vh - 64px);
    border-radius: 8px;
    background-color: #fff;
    box-shadow: 0 20px 50px rgba(15, 23, 42, 0.25);
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid #e5e7eb;

    h2 {
      font-size: 16px;
      font-weight: 700;
      color: #1f2937;
    }
  }

  &__close {
    color: #6b7280;
    font-size: 14px;
    padding: 4px;

    &:hover {
      color: #111827;
    }
  }

  &__body {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
  }

  &__footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 12px 20px;
    border-top: 1px solid #e5e7eb;
  }

  &__button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 36px;
    padding: 0 16px;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    font-size: 14px;
    color: #374151;
    background-color: #fff;

    &:hover {
      background-color: #f9fafb;
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    &--primary {
      border-color: #4ccba0;
      background-color: #4ccba0;
      color: #0e1731;
      font-weight: 600;

      &:hover {
        background-color: #3fbd92;
      }
    }
  }

  &__spinner {
    width: 12px;
    height: 12px;
    border: 2px solid rgba(14, 23, 49, 0.3);
    border-top-color: #0e1731;
    border-radius: 50%;
    animation: announcement-spin 0.6s linear infinite;
  }
}

@keyframes announcement-spin {
  to {
    transform: rotate(360deg);
  }
}

.announcement-form {
  &__banner {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    margin-bottom: 16px;
    padding: 10px 12px;
    border-radius: 4px;
    background-color: #fff8e6;
    color: #92400e;
    font-size: 13px;
    line-height: 1.6;
  }

  &__field {
    margin-bottom: 16px;
    flex: 1;
    min-width: 0;
  }

  &__label {
    display: block;
    margin-bottom: 6px;
    font-size: 13px;
    font-weight: 600;
    color: #374151;
  }

  &__required {
    color: #d71d1d;
  }

  &__input,
  &__textarea {
    width: 100%;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    background-color: #fff;
    padding: 0 12px;
    font-size: 14px;
    color: #111827;
    transition:
      border-color 0.15s,
      box-shadow 0.15s;

    &::placeholder {
      color: #9ca3af;
    }

    &:focus {
      outline: none;
      border-color: #4ccba0;
      box-shadow: 0 0 0 3px rgba(76, 203, 160, 0.15);
    }

    &.is-invalid {
      border-color: #ef4444;
    }
  }

  &__input {
    height: 36px;
  }

  &__textarea {
    padding: 8px 12px;
    line-height: 1.6;
    resize: vertical;
  }

  &__meta {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
  }

  &__error {
    margin-top: 4px;
    font-size: 12px;
    color: #d71d1d;
  }

  &__counter {
    margin-top: 4px;
    font-size: 12px;
    color: #9ca3af;
    flex: none;
    margin-left: auto;
  }

  &__positions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  &__position {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 10px 12px 10px 34px;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    cursor: pointer;
    transition:
      border-color 0.15s,
      background-color 0.15s;

    &:hover {
      border-color: #9ca3af;
    }

    &.is-active {
      border-color: #4ccba0;
      background-color: #f2fbf8;
    }
  }

  &__radio {
    position: absolute;
    top: 14px;
    left: 12px;
    accent-color: #4ccba0;
  }

  &__position-title {
    font-size: 13px;
    font-weight: 600;
    color: #111827;
  }

  &__position-desc {
    font-size: 12px;
    color: #6b7280;
    line-height: 1.5;
  }

  &__row {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  &__actions {
    display: flex;
    justify-content: flex-end;
    margin: -4px 0 12px;
  }

  &__link {
    font-size: 12px;
    color: #0f9d75;

    &:hover {
      text-decoration: underline;
    }
  }

  &__preview {
    margin-top: 8px;
    padding-top: 16px;
    border-top: 1px dashed #e5e7eb;
  }

  &__preview-toggle {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 600;
    color: #374151;

    &:hover {
      color: #0f9d75;
    }
  }

  &__preview-body {
    margin-top: 12px;
    padding: 16px;
    border-radius: 6px;
    background-color: #f9fafb;
  }
}

@media (max-width: 640px) {
  .announcement-form {
    &__positions,
    &__row {
      grid-template-columns: minmax(0, 1fr);
    }
  }
}
</style>
