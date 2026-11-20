<script lang="ts" setup>
import { IconArrowLeft, IconArrowRight } from "@halo-dev/components";
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import StatusBadge from "./StatusBadge.vue";
import type { CalendarPost } from "./types";
import { buildMonthGrid, groupByDay, monthTitle, timeLabel } from "./utils";

const props = defineProps<{
  /** First day of the visible month. */
  month: Date;
  posts: CalendarPost[];
  loading?: boolean;
}>();

const emit = defineEmits<{
  (event: "previous"): void;
  (event: "next"): void;
  (event: "today"): void;
  (event: "select", post: CalendarPost): void;
}>();

const { t } = useI18n();

const grid = computed(() => buildMonthGrid(props.month));
const grouped = computed(() => groupByDay(props.posts));

const weekdays = computed(() =>
  ["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map((day) =>
    t(`core.content_calendar.weekdays.${day}`)
  )
);

function postsOfDay(key: string) {
  return grouped.value[key] || [];
}

// Keep cells readable: older posts first, then everything after the 3rd
// entry collapses into a "+N" summary.
const MAX_VISIBLE = 3;

function handleShowMore(posts: CalendarPost[]) {
  const firstHidden = posts[MAX_VISIBLE];
  if (firstHidden) emit("select", firstHidden);
}
</script>

<template>
  <div class="overflow-x-auto rounded border border-gray-100 bg-white">
    <div class="min-w-[52rem]">
      <div
        class="flex flex-col gap-3 border-b border-gray-100 bg-gray-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="inline-flex h-8 w-8 items-center justify-center rounded text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            :aria-label="$t('core.content_calendar.actions.previous_month')"
            @click="emit('previous')"
          >
            <IconArrowLeft />
          </button>
          <div
            class="min-w-[7.5rem] text-center text-base font-medium text-gray-900"
          >
            {{ monthTitle(month) }}
          </div>
          <button
            type="button"
            class="inline-flex h-8 w-8 items-center justify-center rounded text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            :aria-label="$t('core.content_calendar.actions.next_month')"
            @click="emit('next')"
          >
            <IconArrowRight />
          </button>
        </div>
        <div class="flex items-center gap-3">
          <span v-if="loading" class="text-xs text-gray-500">
            {{ $t("core.content_calendar.state.loading_short") }}
          </span>
          <button
            type="button"
            class="rounded border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            @click="emit('today')"
          >
            {{ $t("core.content_calendar.actions.today") }}
          </button>
        </div>
      </div>

      <div class="grid grid-cols-7 border-b border-gray-100 bg-white">
        <div
          v-for="weekday in weekdays"
          :key="weekday"
          class="px-2 py-2 text-center text-xs font-medium text-gray-500"
        >
          {{ weekday }}
        </div>
      </div>

      <div class="grid grid-cols-7 divide-x divide-gray-100">
        <div
          v-for="day in grid"
          :key="day.key"
          class="min-h-[7.5rem] border-b border-gray-100 p-1.5 align-top"
          :class="[
            day.inCurrentMonth ? 'bg-white' : 'bg-gray-50/60',
            day.isToday ? 'ring-1 ring-inset ring-primary' : '',
          ]"
          :data-date="day.key"
        >
          <div class="mb-1 flex items-center justify-between px-1">
            <span
              class="inline-flex h-5 min-w-5 items-center justify-center rounded text-xs"
              :class="
                day.isToday
                  ? 'bg-primary font-semibold text-white'
                  : day.inCurrentMonth
                    ? 'text-gray-800'
                    : 'text-gray-400'
              "
            >
              {{ day.day }}
            </span>
            <span
              v-if="postsOfDay(day.key).length"
              class="text-[10px] text-gray-400"
              :title="
                $t('core.content_calendar.month.count', {
                  count: postsOfDay(day.key).length,
                })
              "
            >
              {{ postsOfDay(day.key).length }}
            </span>
          </div>

          <div class="space-y-1">
            <button
              v-for="post in postsOfDay(day.key).slice(0, MAX_VISIBLE)"
              :key="post.name"
              type="button"
              class="block w-full rounded border border-transparent bg-gray-50 px-1.5 py-1 text-left transition-colors hover:border-gray-200 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              :title="post.title"
              :data-post-name="post.name"
              @click="emit('select', post)"
            >
              <span class="block truncate text-[11px] text-gray-800">
                {{ post.title }}
              </span>
              <span class="mt-0.5 flex items-center gap-1">
                <span class="text-[10px] text-gray-500">
                  {{ timeLabel(post.publishTime) }}
                </span>
                <StatusBadge :published="post.published" class="scale-90" />
              </span>
            </button>
            <button
              v-if="postsOfDay(day.key).length > MAX_VISIBLE"
              type="button"
              class="w-full rounded px-1 text-left text-[10px] text-gray-500 hover:text-gray-900"
              @click="handleShowMore(postsOfDay(day.key))"
            >
              {{
                $t("core.content_calendar.month.more", {
                  count: postsOfDay(day.key).length - MAX_VISIBLE,
                })
              }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
