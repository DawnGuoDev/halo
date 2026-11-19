<script lang="ts" setup>
import { IconCalendar } from "@halo-dev/components";
import { useI18n } from "vue-i18n";
import { formatDateTime } from "../composables/use-calendar-date";
import type { CalendarPost } from "../mock-posts";
import CalendarStatusTag from "./CalendarStatusTag.vue";

defineProps<{
  posts: CalendarPost[];
}>();

const emit = defineEmits<{
  (event: "select", value: CalendarPost): void;
}>();

const { t } = useI18n();
</script>

<template>
  <div class="overflow-x-auto">
    <table class="w-full min-w-[720px] border-collapse text-sm">
      <thead>
        <tr class="border-b border-gray-200 text-left text-xs text-gray-500">
          <th class="px-3 py-2 font-medium">
            {{ t("core.publish_calendar.list.columns.time") }}
          </th>
          <th class="px-3 py-2 font-medium">
            {{ t("core.publish_calendar.list.columns.title") }}
          </th>
          <th class="px-3 py-2 font-medium">
            {{ t("core.publish_calendar.list.columns.category") }}
          </th>
          <th class="px-3 py-2 font-medium">
            {{ t("core.publish_calendar.list.columns.status") }}
          </th>
          <th class="px-3 py-2 text-right font-medium">
            {{ t("core.publish_calendar.list.columns.actions") }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="post in posts"
          :key="post.name"
          class="cursor-pointer border-b border-gray-100 transition-colors hover:bg-gray-50"
          tabindex="0"
          @click="emit('select', post)"
          @keydown.enter="emit('select', post)"
        >
          <td class="whitespace-nowrap px-3 py-3 text-xs text-gray-500">
            <template v-if="post.publishTime">
              {{ formatDateTime(post.publishTime) }}
            </template>
            <span v-else class="inline-flex items-center gap-1">
              <IconCalendar class="text-sm" />
              {{ t("core.publish_calendar.status.unscheduled") }}
            </span>
          </td>
          <td class="px-3 py-3">
            <div class="font-medium text-gray-900">{{ post.title }}</div>
            <div class="mt-0.5 line-clamp-1 text-xs text-gray-500">
              {{ post.excerpt }}
            </div>
          </td>
          <td class="px-3 py-3 text-xs text-gray-600">
            {{ post.categories.join("、") }}
          </td>
          <td class="px-3 py-3">
            <CalendarStatusTag
              :status="post.status"
              :unscheduled="!post.publishTime"
            />
          </td>
          <td class="px-3 py-3 text-right">
            <span class="text-xs font-medium text-primary">
              {{ t("core.publish_calendar.list.actions.detail") }}
            </span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
