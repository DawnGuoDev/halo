<script lang="ts" setup>
import { VEmpty } from "@halo-dev/components";
import { utils } from "@halo-dev/ui-shared";
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import StatusBadge from "./StatusBadge.vue";
import type { CalendarPost } from "./types";

const props = defineProps<{
  posts: CalendarPost[];
  canManage: boolean;
}>();

const emit = defineEmits<{
  (event: "select", post: CalendarPost): void;
  (event: "clear-filters"): void;
}>();

const { t } = useI18n();

const sorted = computed(() =>
  [...props.posts].sort((a, b) =>
    (a.publishTime || "").localeCompare(b.publishTime || "")
  )
);
</script>

<template>
  <div class="overflow-hidden rounded border border-gray-100 bg-white">
    <table class="w-full table-fixed text-left text-sm" role="table">
      <thead>
        <tr class="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
          <th class="w-[38%] px-4 py-2.5 font-medium">
            {{ $t("core.content_calendar.list.columns.title") }}
          </th>
          <th class="w-[14%] px-4 py-2.5 font-medium">
            {{ $t("core.content_calendar.list.columns.status") }}
          </th>
          <th class="hidden w-[18%] px-4 py-2.5 font-medium sm:table-cell">
            {{ $t("core.content_calendar.list.columns.category") }}
          </th>
          <th class="w-[18%] px-4 py-2.5 font-medium">
            {{ $t("core.content_calendar.list.columns.publish_time") }}
          </th>
          <th
            class="hidden w-[10%] whitespace-nowrap px-4 py-2.5 font-medium md:table-cell"
          >
            {{ $t("core.content_calendar.list.columns.actions") }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="post in sorted"
          :key="post.name"
          class="cursor-pointer border-b border-gray-100 last:border-b-0 hover:bg-gray-50"
          :data-post-name="post.name"
          @click="emit('select', post)"
        >
          <td class="px-4 py-3">
            <div class="truncate font-medium text-gray-900" :title="post.title">
              {{ post.title }}
            </div>
            <div class="mt-0.5 truncate text-xs text-gray-400">
              {{ post.owner || "—" }}
            </div>
          </td>
          <td class="px-4 py-3">
            <StatusBadge :published="post.published" />
          </td>
          <td class="hidden truncate px-4 py-3 text-gray-600 sm:table-cell">
            {{ post.categories?.join(" / ") || "—" }}
          </td>
          <td class="px-4 py-3 text-gray-600">
            {{ utils.date.format(post.publishTime) || "—" }}
          </td>
          <td class="hidden whitespace-nowrap px-4 py-3 md:table-cell">
            <span v-if="post.published" class="text-xs text-gray-400">
              {{ $t("core.content_calendar.list.readonly") }}
            </span>
            <span v-else-if="canManage" class="text-xs text-gray-600">
              {{ $t("core.content_calendar.actions.reschedule") }}
            </span>
            <span v-else class="text-xs text-gray-400">
              {{ $t("core.content_calendar.list.readonly") }}
            </span>
          </td>
        </tr>
      </tbody>
    </table>

    <VEmpty
      v-if="!sorted.length"
      :title="$t('core.content_calendar.empty.filtered_title')"
      :message="$t('core.content_calendar.empty.filtered_message')"
    >
      <template #actions>
        <button
          type="button"
          class="text-xs text-primary hover:underline"
          @click="emit('clear-filters')"
        >
          {{ t("core.content_calendar.actions.clear_filters") }}
        </button>
      </template>
    </VEmpty>
  </div>
</template>
