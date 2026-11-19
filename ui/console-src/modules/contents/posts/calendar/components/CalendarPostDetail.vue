<script lang="ts" setup>
import { Toast, VButton, VModal, VSpace } from "@halo-dev/components";
import { utils } from "@halo-dev/ui-shared";
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { formatFull, isFuture } from "../calendar-utils";
import type { CalendarItem } from "../use-calendar-data";

const props = defineProps<{
  item: CalendarItem;
}>();

const emit = defineEmits<{
  (event: "close"): void;
  (event: "save", item: CalendarItem, value: string): Promise<void>;
}>();

const { t } = useI18n();

const publishTime = ref("");
const errorMessage = ref("");
const saving = ref(false);

const canEdit = computed(() => !props.item.published);

const statusLabel = computed(() => {
  if (props.item.published) {
    return t("core.post_calendar.status.published");
  }
  if (props.item.scheduled) {
    return t("core.post_calendar.status.scheduled");
  }
  return t("core.post_calendar.status.draft");
});

function resetForm() {
  publishTime.value = utils.date.toDatetimeLocal(props.item.publishTime);
  errorMessage.value = "";
}

watch(
  () => props.item,
  () => resetForm(),
  { immediate: true }
);

watch(publishTime, () => {
  if (errorMessage.value) {
    errorMessage.value = "";
  }
});

const minDatetime = computed(() => {
  return utils.date.toDatetimeLocal(new Date(Date.now() + 60 * 1000));
});

function validate() {
  if (!publishTime.value) {
    errorMessage.value = t("core.post_calendar.detail.validation.required");
    return false;
  }
  if (!isFuture(publishTime.value)) {
    errorMessage.value = t("core.post_calendar.detail.validation.future");
    return false;
  }
  return true;
}

async function handleSave() {
  if (!validate()) {
    return;
  }
  saving.value = true;
  try {
    await emit("save", props.item, publishTime.value);
    Toast.success(t("core.post_calendar.detail.toast.save_success"));
    emit("close");
  } catch (error) {
    console.error("Failed to update publish time", error);
    Toast.error(t("core.post_calendar.detail.toast.save_failed"));
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <VModal
    :title="$t('core.post_calendar.detail.title')"
    :width="620"
    :centered="false"
    @close="emit('close')"
  >
    <div class="space-y-5">
      <div>
        <div class="text-base font-semibold text-gray-900">
          {{ item.title || $t("core.post_editor.untitled") }}
        </div>
        <div class="mt-1 text-xs text-gray-500">
          {{ $t("core.post_calendar.detail.status_label") }}：{{ statusLabel }}
          <span v-if="!canEdit"
            >（{{ $t("core.post_calendar.detail.readonly_hint") }}）</span
          >
        </div>
      </div>

      <dl class="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt class="text-xs text-gray-500">
            {{ $t("core.post_calendar.list.category") }}
          </dt>
          <dd class="mt-0.5 text-gray-800">
            {{
              item.categories.map((c) => c.spec.displayName).join("、") ||
              $t("core.post_calendar.list.no_category")
            }}
          </dd>
        </div>
        <div>
          <dt class="text-xs text-gray-500">
            {{ $t("core.post.settings.fields.publish_time.label") }}
          </dt>
          <dd class="mt-0.5 text-gray-800">
            {{
              item.publishTime
                ? formatFull(item.publishTime)
                : $t("core.post_calendar.list.no_publish_time")
            }}
          </dd>
        </div>
      </dl>

      <div
        v-if="!canEdit"
        class="rounded border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600"
      >
        {{ $t("core.post_calendar.detail.readonly_message") }}
      </div>

      <div v-else>
        <label
          for="calendar-publish-time"
          class="mb-1 block text-sm font-medium text-gray-700"
        >
          {{ $t("core.post_calendar.detail.new_publish_time") }}
        </label>
        <input
          id="calendar-publish-time"
          v-model="publishTime"
          type="datetime-local"
          :min="minDatetime"
          class="h-9 w-full rounded border px-2 text-sm focus:outline-none"
          :class="
            errorMessage
              ? 'border-red-500 focus:border-red-500'
              : 'border-gray-300 focus:border-primary'
          "
          @blur="validate"
        />
        <p v-if="errorMessage" class="mt-1 text-xs text-red-500">
          {{ errorMessage }}
        </p>
        <p v-else class="mt-1 text-xs text-gray-500">
          {{ $t("core.post_calendar.detail.publish_time_help") }}
        </p>
      </div>
    </div>

    <template #footer>
      <VSpace>
        <VButton type="secondary" @click="emit('close')">
          {{
            canEdit
              ? $t("core.common.buttons.cancel")
              : $t("core.common.buttons.close")
          }}
        </VButton>
        <VButton
          v-if="canEdit"
          type="primary"
          :loading="saving"
          @click="handleSave"
        >
          {{ $t("core.common.buttons.save") }}
        </VButton>
      </VSpace>
    </template>
  </VModal>
</template>
