<script lang="ts" setup>
import { IconArrowLeft, IconArrowRight, VButton } from "@halo-dev/components";
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import {
  WEEKDAY_LABELS,
  buildMonthCells,
  dateKey,
  formatMonth,
  formatTime,
} from "../composables/use-calendar-date";
import type { CalendarPost } from "../mock-posts";
import CalendarStatusTag from "./CalendarStatusTag.vue";

const props = defineProps<{
  month: Date;
  posts: CalendarPost[];
  loading?: boolean;
  todayLabel: string;
}>();

const emit = defineEmits<{
  (event: "update:month", value: Date): void;
  (event: "select", value: CalendarPost): void;
}>();

const { t } = useI18n();

const daysPerCell = 3;

const cells = computed(() => buildMonthCells(props.month));

const groups = computed(() => {
  const map = new Map<string, CalendarPost[]>();
  for (const post of props.posts) {
    const source = post.publishTime || post.createdAt;
    const key = dateKey(new Date(source));
    const list = map.get(key) || [];
    list.push(post);
    map.set(key, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => {
      const at = a.publishTime || a.createdAt;
      const bt = b.publishTime || b.createdAt;
      return new Date(at).getTime() - new Date(bt).getTime();
    });
  }
  return map;
});

function shiftMonth(amount: number) {
  emit(
    "update:month",
    new Date(props.month.getFullYear(), props.month.getMonth() + amount, 1)
  );
}

function backToCurrentMonth() {
  const now = new Date();
  emit("update:month", new Date(now.getFullYear(), now.getMonth(), 1));
}

function monthCount(list?: CalendarPost[]) {
  return list?.length || 0;
}
</script>

<template>
  <div>
    <div class="calendar-toolbar">
      <div class="flex items-center gap-2">
        <h3 class="text-base font-bold text-gray-900">
          {{ formatMonth(month) }}
        </h3>
        <span class="text-xs text-gray-500">
          {{
            t("core.publish_calendar.month.count", { count: monthCount(posts) })
          }}
        </span>
      </div>
      <div class="flex items-center gap-2">
        <VButton
          size="sm"
          :aria-label="t('core.publish_calendar.month.previous')"
          @click="shiftMonth(-1)"
        >
          <template #icon>
            <IconArrowLeft />
          </template>
        </VButton>
        <VButton size="sm" @click="backToCurrentMonth">
          {{ t("core.publish_calendar.month.today") }}
        </VButton>
        <VButton
          size="sm"
          :aria-label="t('core.publish_calendar.month.next')"
          @click="shiftMonth(1)"
        >
          <template #icon>
            <IconArrowRight />
          </template>
        </VButton>
      </div>
    </div>

    <div
      class="calendar-grid"
      :class="{ 'pointer-events-none opacity-60': loading }"
      role="grid"
      :aria-label="formatMonth(month)"
    >
      <div
        v-for="label in WEEKDAY_LABELS"
        :key="label"
        class="calendar-weekday"
        role="columnheader"
      >
        {{ label }}
      </div>
      <div
        v-for="cell in cells"
        :key="cell.key"
        class="calendar-cell"
        :class="{
          'calendar-cell--outside': !cell.inMonth,
          'calendar-cell--today': cell.isToday,
        }"
        role="gridcell"
        :aria-label="`${cell.key}${cell.isToday ? ` ${todayLabel}` : ''}`"
      >
        <div class="flex items-center justify-between">
          <span
            class="inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs"
            :class="
              cell.isToday
                ? 'bg-primary font-semibold text-white'
                : cell.inMonth
                  ? 'font-medium text-gray-700'
                  : 'text-gray-400'
            "
          >
            {{ cell.date.getDate() }}
          </span>
          <span
            v-if="monthCount(groups.get(cell.key))"
            class="text-[10px] text-gray-400"
          >
            {{ groups.get(cell.key)?.length }}
          </span>
        </div>

        <div class="mt-1 space-y-1">
          <button
            v-for="post in (groups.get(cell.key) || []).slice(0, daysPerCell)"
            :key="post.name"
            type="button"
            class="calendar-event"
            :class="`calendar-event--${post.status}`"
            :title="`${post.title}${post.publishTime ? ` · ${formatTime(post.publishTime)}` : ''}`"
            @click="emit('select', post)"
          >
            <span class="flex items-center gap-1 text-[11px] text-gray-500">
              <template v-if="post.publishTime">
                {{ formatTime(post.publishTime) }}
              </template>
              <template v-else>
                {{ t("core.publish_calendar.status.unscheduled") }}
              </template>
              <CalendarStatusTag
                v-if="post.status !== 'scheduled'"
                :status="post.status"
                :unscheduled="!post.publishTime"
              />
            </span>
            <span class="line-clamp-2 text-left text-xs text-gray-800">
              {{ post.title }}
            </span>
          </button>
          <button
            v-if="monthCount(groups.get(cell.key)) > daysPerCell"
            type="button"
            class="text-[11px] text-primary hover:underline"
            @click="emit('select', (groups.get(cell.key) || [])[daysPerCell])"
          >
            {{
              t("core.publish_calendar.month.more", {
                count: monthCount(groups.get(cell.key)) - daysPerCell,
              })
            }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.calendar-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
  padding-bottom: 0.75rem;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  border-top: 1px solid theme("colors.gray.200");
  border-left: 1px solid theme("colors.gray.200");
}

.calendar-weekday {
  padding: 0.5rem;
  background-color: theme("colors.gray.50");
  border-right: 1px solid theme("colors.gray.200");
  border-bottom: 1px solid theme("colors.gray.200");
  font-size: 0.75rem;
  font-weight: 600;
  color: theme("colors.gray.500");
  text-align: center;
}

.calendar-cell {
  min-height: 7.5rem;
  padding: 0.375rem;
  border-right: 1px solid theme("colors.gray.200");
  border-bottom: 1px solid theme("colors.gray.200");
  background-color: theme("colors.white");
}

.calendar-cell--outside {
  background-color: theme("colors.gray.50");
}

.calendar-cell--today {
  box-shadow: inset 0 0 0 1px theme("colors.primary");
}

.calendar-event {
  display: block;
  width: 100%;
  padding: 0.25rem;
  border-radius: 4px;
  border-left: 2px solid theme("colors.gray.300");
  background-color: theme("colors.gray.50");
  transition: background-color 150ms cubic-bezier(0.4, 0, 0.2, 1);
}

.calendar-event:hover {
  background-color: theme("colors.gray.100");
}

.calendar-event--published {
  border-left-color: theme("colors.green.500");
}

.calendar-event--scheduled {
  border-left-color: theme("colors.primary");
}

.calendar-event--draft {
  border-left-color: theme("colors.gray.400");
  background-color: theme("colors.gray.50");
  border-style: dashed;
}

.calendar-event--recycled {
  border-left-color: theme("colors.red.500");
}

@screen md {
  .calendar-cell {
    min-height: 9rem;
  }
}
</style>
