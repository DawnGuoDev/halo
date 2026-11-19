<script lang="ts" setup>
import type { ListedPost } from "@halo-dev/api-client";
import { VButton, VStatusDot } from "@halo-dev/components";
import type { PostCalendarStatus } from "../composables/use-post-calendar";

withDefaults(
  defineProps<{
    post: ListedPost;
    status: PostCalendarStatus;
    publishTime?: string;
  }>(),
  { publishTime: undefined }
);

const emit = defineEmits<{
  (event: "open", post: ListedPost): void;
}>();
</script>

<template>
  <div
    class="flex flex-wrap items-center gap-3 border-b border-gray-100 px-4 py-3 last:border-b-0 hover:bg-gray-50"
  >
    <div class="min-w-0 flex-1">
      <div class="truncate text-sm font-medium text-gray-900">
        {{ post.post.spec.title }}
      </div>
      <div class="truncate text-xs text-gray-500">
        {{ post.post.spec.slug }}
      </div>
    </div>
    <div class="flex flex-wrap items-center gap-1">
      <span
        v-for="category in post.categories"
        :key="category.metadata.name"
        class="rounded-base border border-gray-200 px-1.5 py-0.5 text-xs text-gray-700"
      >
        {{ category.spec.displayName }}
      </span>
    </div>
    <VStatusDot
      class="w-24"
      :state="status === 'scheduled' ? 'success' : 'default'"
      :text="
        status === 'scheduled'
          ? $t('core.post.calendar.status.scheduled')
          : $t('core.post.calendar.status.published')
      "
    />
    <div class="w-40 text-right text-xs tabular-nums text-gray-600">
      {{
        publishTime ? publishTime : $t("core.post.calendar.unscheduled.badge")
      }}
    </div>
    <VButton size="sm" @click="emit('open', post)">
      {{
        status === "scheduled"
          ? $t("core.post.calendar.actions.adjust_time")
          : $t("core.post.calendar.actions.view_detail")
      }}
    </VButton>
  </div>
</template>
