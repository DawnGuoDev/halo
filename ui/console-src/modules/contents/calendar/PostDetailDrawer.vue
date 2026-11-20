<script lang="ts" setup>
import {
  Dialog,
  IconClose,
  Toast,
  VButton,
  VStatusDot,
} from "@halo-dev/components";
import { utils } from "@halo-dev/ui-shared";
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import StatusBadge from "./StatusBadge.vue";
import type { CalendarDataSource, CalendarPost } from "./types";

const props = defineProps<{
  post: CalendarPost;
  source: CalendarDataSource;
  canManage: boolean;
}>();

const emit = defineEmits<{
  (event: "close"): void;
  (event: "updated", post: CalendarPost): void;
}>();

const { t } = useI18n();

const value = ref("");
// Native datetime-local inputs also update through `input` events that some
// browsers fire without a v-model change; keep validation in sync explicitly.
const touched = ref(false);
const submitting = ref(false);
const error = ref("");

const isPublished = computed(() => props.post.published);
const editable = computed(() => !isPublished.value && props.canManage);

function toDatetimeLocal(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

watch(
  () => props.post,
  (post) => {
    value.value = toDatetimeLocal(post.publishTime);
    touched.value = false;
    error.value = "";
    submitting.value = false;
  },
  { immediate: true }
);

const validationError = computed(() => {
  if (!editable.value) return "";
  if (!touched.value) return "";
  if (!value.value) return t("core.content_calendar.errors.required");
  const time = new Date(value.value).getTime();
  if (Number.isNaN(time)) return t("core.content_calendar.errors.invalid");
  if (time <= Date.now()) return t("core.content_calendar.errors.future");
  return "";
});

const changed = computed(
  () => value.value !== toDatetimeLocal(props.post.publishTime)
);

const canSubmit = computed(
  () =>
    editable.value &&
    changed.value &&
    !validationError.value &&
    !submitting.value
);

function handleTimeInput(event: Event) {
  value.value = (event.target as HTMLInputElement).value;
  touched.value = true;
}

async function handleSave() {
  touched.value = true;
  if (!canSubmit.value) return;
  submitting.value = true;
  error.value = "";
  try {
    const iso = new Date(value.value).toISOString();
    await props.source.reschedule(props.post.name, iso);
    Toast.success(t("core.content_calendar.toast.saved"));
    emit("updated", { ...props.post, publishTime: iso });
  } catch (e) {
    console.error("Failed to reschedule post", e);
    error.value = t("core.content_calendar.errors.save_failed");
  } finally {
    submitting.value = false;
  }
}

function handleClose() {
  if (submitting.value) return;
  if (changed.value && editable.value) {
    Dialog.warning({
      title: t("core.content_calendar.detail.discard_title"),
      description: t("core.content_calendar.detail.discard_description"),
      confirmText: t("core.content_calendar.detail.discard_confirm"),
      cancelText: t("core.common.buttons.cancel"),
      onConfirm: () => emit("close"),
    });
    return;
  }
  emit("close");
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex justify-end">
    <div
      class="absolute inset-0 bg-black/30"
      aria-hidden="true"
      @click="handleClose"
    ></div>
    <aside
      class="relative flex h-full w-full max-w-md flex-col bg-white shadow-xl"
      role="dialog"
      aria-modal="true"
      :aria-label="$t('core.content_calendar.detail.title')"
    >
      <header
        class="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4"
      >
        <div class="min-w-0">
          <div class="text-xs text-gray-500">
            {{ $t("core.content_calendar.detail.title") }}
          </div>
          <h2 class="mt-1 break-words text-base font-semibold text-gray-900">
            {{ post.title }}
          </h2>
        </div>
        <button
          type="button"
          class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded text-gray-500 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          :aria-label="$t('core.common.buttons.close')"
          @click="handleClose"
        >
          <IconClose />
        </button>
      </header>

      <div class="flex-1 space-y-5 overflow-y-auto px-5 py-4">
        <div class="flex items-center gap-3">
          <StatusBadge :published="post.published" />
          <span v-if="isPublished" class="text-xs text-gray-500">
            {{ $t("core.content_calendar.detail.readonly_hint") }}
          </span>
          <VStatusDot
            v-else
            :text="$t('core.content_calendar.detail.scheduled_hint')"
            state="default"
          />
        </div>

        <dl class="space-y-3 text-sm">
          <div class="flex gap-4">
            <dt class="w-20 shrink-0 text-gray-500">
              {{ $t("core.content_calendar.detail.category") }}
            </dt>
            <dd class="min-w-0 break-words text-gray-900">
              {{ post.categories?.join(" / ") || "—" }}
            </dd>
          </div>
          <div class="flex gap-4">
            <dt class="w-20 shrink-0 text-gray-500">
              {{ $t("core.content_calendar.detail.author") }}
            </dt>
            <dd class="min-w-0 break-words text-gray-900">
              {{ post.owner || "—" }}
            </dd>
          </div>
          <div class="flex gap-4">
            <dt class="w-20 shrink-0 text-gray-500">
              {{ $t("core.content_calendar.detail.slug") }}
            </dt>
            <dd class="min-w-0 break-words text-gray-900">
              {{ post.slug || "—" }}
            </dd>
          </div>
          <div class="flex gap-4">
            <dt class="w-20 shrink-0 text-gray-500">
              {{ $t("core.content_calendar.detail.current_time") }}
            </dt>
            <dd class="min-w-0 break-words text-gray-900">
              {{
                post.publishTime
                  ? utils.date.format(post.publishTime)
                  : $t("core.content_calendar.detail.no_time")
              }}
            </dd>
          </div>
        </dl>

        <div v-if="editable" class="space-y-2 border-t border-gray-100 pt-4">
          <label
            class="block text-sm font-medium text-gray-900"
            for="calendar-publish-time"
          >
            {{ $t("core.content_calendar.detail.new_time") }}
          </label>
          <input
            id="calendar-publish-time"
            :value="value"
            type="datetime-local"
            step="60"
            class="block h-9 w-full rounded border px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            :class="validationError ? 'border-red-500' : 'border-gray-300'"
            @input="handleTimeInput"
          />
          <p v-if="validationError" class="text-xs text-red-500">
            {{ validationError }}
          </p>
          <p v-else class="text-xs text-gray-500">
            {{ $t("core.content_calendar.detail.help") }}
          </p>
          <p v-if="error" class="text-xs text-red-500">{{ error }}</p>
        </div>
        <div
          v-else-if="!isPublished"
          class="rounded bg-gray-50 px-3 py-2 text-xs text-gray-500"
        >
          {{ $t("core.content_calendar.detail.no_permission") }}
        </div>
      </div>

      <footer
        v-if="editable"
        class="flex items-center justify-end gap-2 border-t border-gray-100 px-5 py-3"
      >
        <VButton size="sm" @click="handleClose">
          {{ $t("core.common.buttons.cancel") }}
        </VButton>
        <VButton
          size="sm"
          type="secondary"
          :loading="submitting"
          :disabled="!canSubmit"
          @click="handleSave"
        >
          {{ $t("core.content_calendar.actions.save") }}
        </VButton>
      </footer>
      <footer
        v-else
        class="flex items-center justify-end border-t border-gray-100 px-5 py-3"
      >
        <VButton size="sm" @click="handleClose">
          {{ $t("core.common.buttons.close") }}
        </VButton>
      </footer>
    </aside>
  </div>
</template>
