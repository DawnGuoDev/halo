<script lang="ts" setup>
import type { Category } from "@halo-dev/api-client";
import {
  VAlert,
  VButton,
  VCard,
  VEmpty,
  VFilterDropdown,
  VFilterDropdownGroup,
  VLoading,
  VPageHeader,
  VStatusDot,
  VTabs,
  VTabItem,
} from "@halo-dev/components";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import CategoryFilterDropdown from "@/components/filter/CategoryFilterDropdown.vue";
import SearchInput from "@/components/input/SearchInput.vue";
import {
  addMonths,
  buildMonthGrid,
  formatFull,
  formatTime,
  monthLabel,
  toDateKey,
  weekdays,
} from "./calendar-utils";
import CalendarPostDetail from "./components/CalendarPostDetail.vue";
import type { CalendarStatusFilter, CalendarItem } from "./use-calendar-data";
import { matchesStatus, usePostCalendarData } from "./use-calendar-data";

const { t } = useI18n();

const view = ref<"calendar" | "list">("calendar");
const keyword = ref("");
const category = ref<string | undefined>(undefined);
const status = ref<CalendarStatusFilter>("ALL");
const month = ref(new Date());
const selectedItem = ref<CalendarItem | undefined>(undefined);

const mockCategoryOptions = computed(() => {
  const map = new Map<string, string>();
  items.value.forEach((item) => {
    item.categories.forEach((c) => {
      map.set(c.metadata.name, c.spec.displayName || c.metadata.name);
    });
  });
  return Array.from(map, ([value, label]) => ({ label, value }));
});

const statusOptions = computed(() => [
  { label: t("core.post_calendar.status.all"), value: "ALL" },
  { label: t("core.post_calendar.status.scheduled"), value: "SCHEDULED" },
  { label: t("core.post_calendar.status.published"), value: "PUBLISHED" },
  { label: t("core.post_calendar.status.draft"), value: "DRAFT" },
]);

const { query, items, updatePublishTime, isMock } = usePostCalendarData({
  keyword,
  category,
});

const weekdaysKeys = [
  "core.post_calendar.calendar.mon",
  "core.post_calendar.calendar.tue",
  "core.post_calendar.calendar.wed",
  "core.post_calendar.calendar.thu",
  "core.post_calendar.calendar.fri",
  "core.post_calendar.calendar.sat",
  "core.post_calendar.calendar.sun",
];
const weekdaysLabels = weekdays();
const days = computed(() => buildMonthGrid(month.value));

const filteredItems = computed(() =>
  items.value.filter((item) => matchesStatus(item, status.value))
);

const itemsByDate = computed(() => {
  const map = new Map<string, CalendarItem[]>();
  filteredItems.value.forEach((item) => {
    const key = toDateKey(item.publishTime);
    if (!key) {
      return;
    }
    const list = map.get(key) || [];
    list.push(item);
    map.set(
      key,
      list.sort(
        (a, b) =>
          new Date(a.publishTime || 0).getTime() -
          new Date(b.publishTime || 0).getTime()
      )
    );
  });
  return map;
});

const itemsInMonth = computed(() => {
  const monthKey = new Date(month.value).getMonth();
  const yearKey = new Date(month.value).getFullYear();
  return filteredItems.value
    .filter((item) => {
      if (!item.publishTime) {
        return false;
      }
      const date = new Date(item.publishTime);
      return date.getMonth() === monthKey && date.getFullYear() === yearKey;
    })
    .sort(
      (a, b) =>
        new Date(a.publishTime || 0).getTime() -
        new Date(b.publishTime || 0).getTime()
    );
});

const listItems = computed(() => {
  if (status.value !== "ALL") {
    return itemsInMonth.value;
  }
  return [...itemsInMonth.value, ...unscheduledItems.value];
});

const unscheduledItems = computed(() =>
  filteredItems.value.filter((item) => !item.published && !item.scheduled)
);

const unscheduledCount = computed(
  () =>
    filteredItems.value.filter((item) => !item.published && !item.scheduled)
      .length
);

const hasFilter = computed(
  () => !!keyword.value || !!category.value || status.value !== "ALL"
);

function resetFilters() {
  keyword.value = "";
  category.value = undefined;
  status.value = "ALL";
}

function openDetail(item: CalendarItem) {
  selectedItem.value = item;
}

function closeDetail() {
  selectedItem.value = undefined;
}

async function handleSavePublishTime(item: CalendarItem, value: string) {
  await updatePublishTime(item.name, new Date(value).toISOString());
}

function jumpToToday() {
  month.value = new Date();
}

function categoryName(categoryItem: Category) {
  return categoryItem.spec.displayName || categoryItem.metadata.name;
}
</script>

<template>
  <VPageHeader :title="$t('core.post_calendar.title')">
    <template #icon>
      <span class="inline-flex text-lg">📅</span>
    </template>
    <template #actions>
      <VButton :route="{ name: 'Posts' }" size="sm">
        {{ $t("core.post_calendar.actions.back_to_posts") }}
      </VButton>
    </template>
  </VPageHeader>

  <div class="m-0 md:m-4">
    <VCard :body-class="['!p-0']">
      <template #header>
        <div class="w-full bg-gray-50 px-4 py-3">
          <div
            class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
          >
            <VTabs v-model:active-id="view">
              <VTabItem
                id="calendar"
                :label="$t('core.post_calendar.view.calendar')"
              />
              <VTabItem id="list" :label="$t('core.post_calendar.view.list')" />
            </VTabs>
            <div
              class="flex flex-1 flex-wrap items-center gap-3 lg:justify-end"
            >
              <div class="w-full sm:w-64">
                <SearchInput
                  v-model="keyword"
                  sync
                  :placeholder="
                    $t('core.post_calendar.filters.keyword_placeholder')
                  "
                />
              </div>
              <VFilterDropdownGroup
                v-if="!isMock"
                :has-external-filters="false"
              >
                <CategoryFilterDropdown
                  v-model="category"
                  :label="$t('core.post.filters.category.label')"
                />
              </VFilterDropdownGroup>
              <VFilterDropdown
                v-else
                v-model="category"
                :label="$t('core.post.filters.category.label')"
                show-clear-option
                :clear-label="$t('core.common.filters.item_labels.all')"
                :options="mockCategoryOptions"
              />
              <select
                v-model="status"
                class="h-9 rounded border border-gray-300 bg-white px-2 text-sm text-gray-700 focus:border-primary focus:outline-none"
                :aria-label="$t('core.common.filters.labels.status')"
              >
                <option
                  v-for="option in statusOptions"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </select>
            </div>
          </div>
        </div>
      </template>

      <VAlert v-if="isMock" type="info" class="m-4 mb-0">
        <template #description>
          {{ $t("core.post_calendar.mock_notice") }}
        </template>
      </VAlert>

      <div v-if="query.isLoading.value" class="py-16">
        <VLoading />
      </div>

      <div v-else-if="query.isError.value" class="py-16">
        <VEmpty
          :title="$t('core.post_calendar.error.title')"
          :message="$t('core.post_calendar.error.message')"
        >
          <template #actions>
            <VButton type="secondary" @click="query.refetch()">
              {{ $t("core.post_calendar.error.retry") }}
            </VButton>
          </template>
        </VEmpty>
      </div>

      <template v-else>
        <VEmpty
          v-if="!filteredItems.length"
          class="py-10"
          :title="$t('core.post_calendar.empty.title')"
          :message="$t('core.post_calendar.empty.message')"
        >
          <template #actions>
            <VButton v-if="hasFilter" type="secondary" @click="resetFilters">
              {{ $t("core.post_calendar.empty.clear_filters") }}
            </VButton>
            <VButton v-else type="secondary" @click="jumpToToday">
              {{ $t("core.post_calendar.empty.back_to_month") }}
            </VButton>
          </template>
        </VEmpty>

        <!-- 月历视图 -->
        <div v-else-if="view === 'calendar'" class="p-4">
          <div
            class="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div class="flex items-center gap-2">
              <VButton size="sm" @click="month = addMonths(month, -1)">
                {{ $t("core.post_calendar.calendar.prev") }}
              </VButton>
              <span
                class="min-w-32 text-center text-sm font-semibold text-gray-900"
              >
                {{ monthLabel(month) }}
              </span>
              <VButton size="sm" @click="month = addMonths(month, 1)">
                {{ $t("core.post_calendar.calendar.next") }}
              </VButton>
              <VButton size="sm" type="secondary" @click="jumpToToday">
                {{ $t("core.post_calendar.calendar.today") }}
              </VButton>
            </div>
            <div class="text-xs text-gray-500">
              {{
                $t("core.post_calendar.calendar.summary", {
                  count: itemsInMonth.length,
                  unscheduled: unscheduledCount,
                })
              }}
            </div>
          </div>

          <div class="grid grid-cols-7 border-l border-t border-gray-200">
            <div
              v-for="(label, index) in weekdaysLabels"
              :key="label"
              class="border-b border-r border-gray-200 bg-gray-50 px-2 py-2 text-center text-xs font-medium text-gray-500"
            >
              {{ $t(weekdaysKeys[index]) }}
            </div>
            <div
              v-for="day in days"
              :key="day.date"
              class="min-h-28 border-b border-r border-gray-200 p-1.5"
              :class="[
                day.inCurrentMonth ? 'bg-white' : 'bg-gray-50/60',
                day.isToday ? 'ring-1 ring-inset ring-primary' : '',
              ]"
            >
              <div class="mb-1 flex items-center justify-between">
                <span
                  class="inline-flex h-6 min-w-6 items-center justify-center rounded px-1 text-xs"
                  :class="
                    day.isToday
                      ? 'bg-primary font-semibold text-white'
                      : day.inCurrentMonth
                        ? 'text-gray-700'
                        : 'text-gray-400'
                  "
                >
                  {{ day.dayOfMonth }}
                </span>
                <span
                  v-if="itemsByDate.get(day.date)?.length"
                  class="text-[10px] text-gray-400"
                >
                  {{ itemsByDate.get(day.date)?.length }}
                </span>
              </div>
              <div class="space-y-1">
                <button
                  v-for="item in itemsByDate.get(day.date) || []"
                  :key="item.name"
                  type="button"
                  class="block w-full cursor-pointer rounded border border-gray-200 bg-white px-1.5 py-1 text-left hover:border-primary hover:bg-primary/5"
                  @click="openDetail(item)"
                >
                  <div class="flex items-center gap-1">
                    <VStatusDot
                      :state="
                        item.published
                          ? 'success'
                          : item.scheduled
                            ? 'warning'
                            : 'default'
                      "
                    />
                    <span
                      class="truncate text-xs font-medium text-gray-800"
                      :title="item.title"
                    >
                      {{ item.title || $t("core.post_editor.untitled") }}
                    </span>
                  </div>
                  <div
                    class="mt-0.5 flex items-center justify-between text-[10px]"
                  >
                    <span
                      :class="
                        item.published
                          ? 'text-green-600'
                          : item.scheduled
                            ? 'text-orange-500'
                            : 'text-gray-500'
                      "
                    >
                      {{
                        item.published
                          ? $t("core.post_calendar.status.published")
                          : item.scheduled
                            ? $t("core.post_calendar.status.scheduled")
                            : $t("core.post_calendar.status.draft")
                      }}
                    </span>
                    <span class="text-gray-500">{{
                      formatTime(item.publishTime)
                    }}</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 列表视图 -->
        <div v-else class="p-4">
          <div class="mb-3 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <VButton size="sm" @click="month = addMonths(month, -1)">
                {{ $t("core.post_calendar.calendar.prev") }}
              </VButton>
              <span class="text-sm font-semibold text-gray-900">{{
                monthLabel(month)
              }}</span>
              <VButton size="sm" @click="month = addMonths(month, 1)">
                {{ $t("core.post_calendar.calendar.next") }}
              </VButton>
            </div>
            <span class="text-xs text-gray-500">
              {{
                $t("core.post_calendar.list.month_summary", {
                  count: listItems.length,
                })
              }}
            </span>
          </div>
          <table class="w-full table-fixed text-sm">
            <thead>
              <tr
                class="border-b border-gray-200 text-left text-xs text-gray-500"
              >
                <th class="w-[46%] py-2 pr-3 font-medium">
                  {{ $t("core.post_calendar.list.title") }}
                </th>
                <th class="w-[14%] py-2 pr-3 font-medium">
                  {{ $t("core.post_calendar.list.category") }}
                </th>
                <th class="w-[14%] py-2 pr-3 font-medium">
                  {{ $t("core.post_calendar.list.status") }}
                </th>
                <th class="py-2 font-medium">
                  {{ $t("core.post.settings.fields.publish_time.label") }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!listItems.length">
                <td colspan="4" class="py-8 text-center text-xs text-gray-500">
                  {{ $t("core.post_calendar.list.month_empty") }}
                </td>
              </tr>
              <tr
                v-for="item in listItems"
                :key="item.name"
                class="cursor-pointer border-b border-gray-100 last:border-b-0 hover:bg-gray-50"
                @click="openDetail(item)"
              >
                <td class="truncate py-3 pr-3 text-gray-900">
                  <span class="inline-flex items-center gap-2">
                    <VStatusDot
                      :state="
                        item.published
                          ? 'success'
                          : item.scheduled
                            ? 'warning'
                            : 'default'
                      "
                    />
                    {{ item.title || $t("core.post_editor.untitled") }}
                  </span>
                </td>
                <td class="truncate py-3 pr-3 text-gray-600">
                  {{
                    item.categories.map(categoryName).join("、") ||
                    $t("core.post_calendar.list.no_category")
                  }}
                </td>
                <td class="py-3 pr-3">
                  <span
                    :class="
                      item.published
                        ? 'text-green-600'
                        : item.scheduled
                          ? 'text-orange-500'
                          : 'text-gray-500'
                    "
                  >
                    {{
                      item.published
                        ? $t("core.post_calendar.status.published")
                        : item.scheduled
                          ? $t("core.post_calendar.status.scheduled")
                          : $t("core.post_calendar.status.draft")
                    }}
                  </span>
                </td>
                <td class="truncate py-3 text-gray-600">
                  {{
                    item.publishTime
                      ? formatFull(item.publishTime)
                      : $t("core.post_calendar.list.no_publish_time")
                  }}
                </td>
              </tr>
            </tbody>
          </table>
          <div class="mt-3 text-xs text-gray-500">
            {{ $t("core.post_calendar.list.hint") }}
          </div>
          <div
            v-if="unscheduledItems.length"
            class="mt-6 rounded border border-gray-200 bg-gray-50 px-3 py-2"
          >
            <div class="mb-1 text-xs font-medium text-gray-700">
              {{
                $t("core.post_calendar.list.unscheduled_title", {
                  count: unscheduledItems.length,
                })
              }}
            </div>
            <button
              v-for="item in unscheduledItems"
              :key="item.name"
              type="button"
              class="mr-2 mt-1 inline-flex items-center gap-1 rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 hover:border-primary"
              @click="openDetail(item)"
            >
              {{ item.title || $t("core.post_editor.untitled") }}
            </button>
          </div>
        </div>
      </template>
    </VCard>
  </div>

  <CalendarPostDetail
    v-if="selectedItem"
    :item="selectedItem"
    @close="closeDetail"
    @save="handleSavePublishTime"
  />
</template>
