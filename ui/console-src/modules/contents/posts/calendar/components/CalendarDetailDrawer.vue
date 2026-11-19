<script lang="ts" setup>
import { Toast, VButton } from "@halo-dev/components";
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import {
  formatDateTime,
  toDateTimeLocal,
} from "../composables/use-calendar-date";
import type { CalendarPost } from "../mock-posts";
import CalendarStatusTag from "./CalendarStatusTag.vue";

const props = defineProps<{
  post?: CalendarPost;
  canEdit: boolean;
  now: number;
}>();

const emit = defineEmits<{
  (event: "close"): void;
  (event: "save", payload: { name: string; publishTime: string }): void;
}>();

const { t } = useI18n();

const draftTime = ref<string>("");
const error = ref<string>("");

watch(
  () => props.post,
  (value) => {
    draftTime.value = value?.publishTime
      ? toDateTimeLocal(value.publishTime)
      : "";
    error.value = "";
  },
  { immediate: true }
);

const isEditable = computed(
  () => props.post?.status === "scheduled" && props.canEdit
);

const readOnlyReason = computed(() => {
  if (!props.post) return "";
  if (!props.canEdit) {
    return t("core.publish_calendar.detail.readonly_permission");
  }
  if (props.post.status === "published") {
    return t("core.publish_calendar.detail.readonly_published");
  }
  if (props.post.status === "draft") {
    return t("core.publish_calendar.detail.readonly_draft");
  }
  if (props.post.status === "recycled") {
    return t("core.publish_calendar.detail.readonly_recycled");
  }
  return "";
});

function validate(value: string): string {
  if (!value) {
    return t("core.publish_calendar.detail.errors.required");
  }
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return t("core.publish_calendar.detail.errors.invalid");
  }
  if (timestamp <= props.now) {
    return t("core.publish_calendar.detail.errors.past");
  }
  return "";
}

function handleSave() {
  if (!props.post) return;
  error.value = validate(draftTime.value);
  if (error.value) return;
  emit("save", {
    name: props.post.name,
    publishTime: new Date(draftTime.value).toISOString(),
  });
  Toast.success(t("core.publish_calendar.detail.toast.saved"));
}
</script>

<template>
  <div
    v-if="post"
    class="fixed inset-0 z-40 flex justify-end bg-gray-900/30"
    @click.self="emit('close')"
  >
    <aside
      role="dialog"
      aria-modal="true"
      :aria-label="t('core.publish_calendar.detail.title')"
      class="flex h-full w-full max-w-lg flex-col bg-white shadow-lg"
    >
      <header class="border-b border-gray-100 px-5 py-4">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="text-xs text-gray-500">
              {{ t("core.publish_calendar.detail.title") }}
            </div>
            <h3 class="mt-1 break-words text-base font-bold text-gray-900">
              {{ post.title }}
            </h3>
          </div>
          <CalendarStatusTag
            :status="post.status"
            :unscheduled="!post.publishTime"
          />
        </div>
      </header>

      <div class="flex-1 overflow-y-auto px-5 py-4">
        <dl class="space-y-3 text-sm">
          <div class="grid grid-cols-4 gap-3">
            <dt class="col-span-1 text-gray-500">
              {{ t("core.publish_calendar.detail.fields.category") }}
            </dt>
            <dd class="col-span-3 text-gray-900">
              {{ post.categories.join("、") || "—" }}
            </dd>
          </div>
          <div class="grid grid-cols-4 gap-3">
            <dt class="col-span-1 text-gray-500">
              {{ t("core.publish_calendar.detail.fields.author") }}
            </dt>
            <dd class="col-span-3 text-gray-900">{{ post.author }}</dd>
          </div>
          <div class="grid grid-cols-4 gap-3">
            <dt class="col-span-1 text-gray-500">
              {{ t("core.publish_calendar.detail.fields.created_at") }}
            </dt>
            <dd class="col-span-3 text-gray-900">
              {{ formatDateTime(post.createdAt) }}
            </dd>
          </div>
          <div class="grid grid-cols-4 gap-3">
            <dt class="col-span-1 text-gray-500">
              {{ t("core.publish_calendar.detail.fields.publish_time") }}
            </dt>
            <dd class="col-span-3 text-gray-900">
              {{ formatDateTime(post.publishTime) }}
            </dd>
          </div>
          <div class="grid grid-cols-4 gap-3">
            <dt class="col-span-1 text-gray-500">
              {{ t("core.publish_calendar.detail.fields.excerpt") }}
            </dt>
            <dd class="col-span-3 leading-6 text-gray-900">
              {{ post.excerpt }}
            </dd>
          </div>
        </dl>

        <div class="mt-5 rounded border border-gray-200 p-4">
          <label
            for="calendar-publish-time"
            class="mb-1.5 block text-sm font-medium text-gray-900"
          >
            {{ t("core.publish_calendar.detail.adjust.label") }}
          </label>
          <input
            id="calendar-publish-time"
            v-model="draftTime"
            type="datetime-local"
            class="form-input w-full"
            :disabled="!isEditable"
            :aria-invalid="!!error"
            :aria-describedby="
              error
                ? 'calendar-publish-time-error'
                : 'calendar-publish-time-help'
            "
            @change="error = validate(draftTime)"
          />
          <p
            v-if="error"
            id="calendar-publish-time-error"
            class="mt-1.5 text-xs text-red-500"
          >
            {{ error }}
          </p>
          <p
            v-else
            id="calendar-publish-time-help"
            class="mt-1.5 text-xs text-gray-500"
          >
            {{
              isEditable
                ? t("core.publish_calendar.detail.adjust.help")
                : readOnlyReason
            }}
          </p>
        </div>
      </div>

      <footer
        class="flex items-center justify-end gap-2 border-t border-gray-100 px-5 py-3"
      >
        <VButton @click="emit('close')">
          {{ t("core.publish_calendar.actions.close") }}
        </VButton>
        <VButton v-if="isEditable" type="primary" @click="handleSave">
          {{ t("core.publish_calendar.actions.save") }}
        </VButton>
      </footer>
    </aside>
  </div>
</template>
