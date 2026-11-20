<script lang="ts" setup>
import {
  IconCalendar,
  IconRefreshLine,
  VButton,
  VCard,
  VEmpty,
  VLoading,
  VPageHeader,
} from "@halo-dev/components";
import { utils } from "@halo-dev/ui-shared";
import { computed, onMounted, onUnmounted, ref } from "vue";
import { resolveCalendarDataSource } from "./data-source";
import ListView from "./ListView.vue";
import MonthGrid from "./MonthGrid.vue";
import PostDetailDrawer from "./PostDetailDrawer.vue";
import type {
  CalendarDataSource,
  CalendarPost,
  CalendarStatusFilter,
  CalendarView,
} from "./types";
import { addMonths, isInMonth, startOfMonth } from "./utils";

const { source, mocked } = resolveCalendarDataSource();

/**
 * Wrapper so the template keeps a stable reference while real and mock
 * sources are swapped by the preview switch.
 */
const dataSource: CalendarDataSource = {
  list: (signal) => source.list(signal),
  reschedule: (name, publishTime) => source.reschedule(name, publishTime),
  categories: () => source.categories(),
};

const view = ref<CalendarView>("month");
const month = ref(startOfMonth(new Date()));
const posts = ref<CalendarPost[]>([]);
const categories = ref<string[]>([]);
const keyword = ref("");
const debouncedKeyword = ref("");
const category = ref<string>("");
const status = ref<CalendarStatusFilter>("ALL");
const loading = ref(true);
const error = ref(false);
const selectedPost = ref<CalendarPost>();
// Assume manage permission until the console reports otherwise (the
// preview shim grants it explicitly).
const canManage = ref(true);

let debounceTimer: ReturnType<typeof setTimeout> | undefined;
let requestId = 0;

function resetKeywordDebounce() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debouncedKeyword.value = keyword.value.trim();
  }, 250);
}

async function loadData() {
  const current = ++requestId;
  loading.value = true;
  error.value = false;
  try {
    const [list, cats] = await Promise.all([
      dataSource.list(),
      dataSource.categories().catch(() => [] as string[]),
    ]);
    if (current !== requestId) return;
    posts.value = list;
    categories.value = cats;
  } catch (e) {
    if (current !== requestId) return;
    console.error("Failed to load calendar posts", e);
    error.value = true;
  } finally {
    if (current === requestId) {
      loading.value = false;
    }
  }
}

const filteredPosts = computed(() => {
  const keywordValue = debouncedKeyword.value.toLowerCase();
  return posts.value.filter((post) => {
    if (status.value === "PUBLISHED" && !post.published) return false;
    if (status.value === "SCHEDULED" && post.published) return false;
    if (category.value) {
      const matched = post.categories?.includes(category.value);
      if (!matched) return false;
    }
    if (keywordValue) {
      const haystack = `${post.title} ${post.slug || ""}`.toLowerCase();
      if (!haystack.includes(keywordValue)) return false;
    }
    return true;
  });
});

const monthPosts = computed(() =>
  filteredPosts.value.filter((post) => isInMonth(post.publishTime, month.value))
);

const otherMonthTotal = computed(
  () => filteredPosts.value.length - monthPosts.value.length
);

const hasFilters = computed(
  () => !!debouncedKeyword.value || !!category.value || status.value !== "ALL"
);

const counts = computed(() => ({
  published: filteredPosts.value.filter((post) => post.published).length,
  scheduled: filteredPosts.value.filter((post) => !post.published).length,
}));

function clearFilters() {
  keyword.value = "";
  debouncedKeyword.value = "";
  category.value = "";
  status.value = "ALL";
}

function goPrevious() {
  month.value = addMonths(month.value, -1);
}

function goNext() {
  month.value = addMonths(month.value, 1);
}

function goToday() {
  month.value = startOfMonth(new Date());
}

function openDetail(post: CalendarPost) {
  selectedPost.value = post;
}

function handleUpdated(updated: CalendarPost) {
  posts.value = posts.value.map((post) =>
    post.name === updated.name ? updated : post
  );
  selectedPost.value = updated;
}

async function handleKeyboard(event: KeyboardEvent) {
  if (selectedPost.value) return;
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  const target = event.target as HTMLElement | null;
  // Do not hijack caret movement in search/keyword inputs.
  if (target?.closest("input, textarea, select, [contenteditable='true']")) {
    return;
  }
  if (event.key === "ArrowLeft" && view.value === "month") {
    goPrevious();
  }
  if (event.key === "ArrowRight" && view.value === "month") {
    goNext();
  }
}

onMounted(() => {
  try {
    canManage.value = utils.permission.has(["system:posts:manage"]);
  } catch {
    canManage.value = false;
  }
  loadData();
  window.addEventListener("keydown", handleKeyboard);
});

onUnmounted(() => {
  if (debounceTimer) clearTimeout(debounceTimer);
  window.removeEventListener("keydown", handleKeyboard);
});
</script>

<template>
  <VPageHeader :title="$t('core.content_calendar.title')">
    <template #icon>
      <IconCalendar />
    </template>
    <template #actions>
      <div class="inline-flex rounded border border-gray-300 bg-white p-0.5">
        <button
          type="button"
          class="rounded px-3 py-1 text-xs transition-colors"
          :class="
            view === 'month'
              ? 'bg-gray-900 text-white'
              : 'text-gray-600 hover:bg-gray-50'
          "
          :aria-pressed="view === 'month'"
          @click="view = 'month'"
        >
          {{ $t("core.content_calendar.views.month") }}
        </button>
        <button
          type="button"
          class="rounded px-3 py-1 text-xs transition-colors"
          :class="
            view === 'list'
              ? 'bg-gray-900 text-white'
              : 'text-gray-600 hover:bg-gray-50'
          "
          :aria-pressed="view === 'list'"
          @click="view = 'list'"
        >
          {{ $t("core.content_calendar.views.list") }}
        </button>
      </div>
    </template>
  </VPageHeader>

  <div class="m-0 flex min-h-0 flex-1 flex-col md:m-4">
    <VCard :body-class="['!p-0']">
      <template #header>
        <div
          class="flex flex-col gap-3 bg-gray-50 px-4 py-3 lg:flex-row lg:items-center"
        >
          <div class="flex flex-1 flex-wrap items-center gap-2">
            <input
              v-model="keyword"
              type="search"
              class="h-8 w-full rounded border border-gray-300 bg-white px-2.5 text-xs text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:w-56"
              :placeholder="
                $t('core.content_calendar.filters.keyword_placeholder')
              "
              :aria-label="$t('core.content_calendar.filters.keyword')"
              @input="resetKeywordDebounce"
            />
            <select
              v-model="category"
              class="h-8 rounded border border-gray-300 bg-white px-2 text-xs text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              :aria-label="$t('core.content_calendar.filters.category')"
            >
              <option value="">
                {{ $t("core.content_calendar.filters.all_categories") }}
              </option>
              <option v-for="item in categories" :key="item" :value="item">
                {{ item }}
              </option>
            </select>
            <select
              v-model="status"
              class="h-8 rounded border border-gray-300 bg-white px-2 text-xs text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              :aria-label="$t('core.content_calendar.filters.status')"
            >
              <option value="ALL">
                {{ $t("core.content_calendar.filters.all_status") }}
              </option>
              <option value="PUBLISHED">
                {{ $t("core.content_calendar.status.published") }}
              </option>
              <option value="SCHEDULED">
                {{ $t("core.content_calendar.status.scheduled") }}
              </option>
            </select>
            <button
              v-if="hasFilters"
              type="button"
              class="text-xs text-gray-500 hover:text-gray-900"
              @click="clearFilters"
            >
              {{ $t("core.content_calendar.actions.clear_filters") }}
            </button>
          </div>
          <div class="flex items-center gap-3 text-xs text-gray-500">
            <span>
              {{
                $t("core.content_calendar.summary.published", {
                  count: counts.published,
                })
              }}
            </span>
            <span>
              {{
                $t("core.content_calendar.summary.scheduled", {
                  count: counts.scheduled,
                })
              }}
            </span>
            <span
              v-if="mocked"
              class="rounded bg-amber-100 px-2 py-0.5 text-amber-700"
            >
              {{ $t("core.content_calendar.mock_badge") }}
            </span>
          </div>
        </div>
      </template>

      <div class="p-4">
        <div
          v-if="loading"
          class="flex flex-col items-center justify-center py-12"
        >
          <VLoading />
          <p class="mt-3 text-xs text-gray-500">
            {{ $t("core.content_calendar.state.loading") }}
          </p>
        </div>

        <div
          v-else-if="error"
          class="flex flex-col items-center justify-center py-10"
          role="alert"
        >
          <VEmpty
            :title="$t('core.content_calendar.state.error_title')"
            :message="$t('core.content_calendar.state.error_message')"
          >
            <template #actions>
              <VButton size="sm" type="secondary" @click="loadData">
                <template #icon><IconRefreshLine /></template>
                {{ $t("core.content_calendar.actions.retry") }}
              </VButton>
            </template>
          </VEmpty>
        </div>

        <template v-else>
          <template v-if="view === 'month'">
            <div
              v-if="!monthPosts.length"
              class="mb-3 flex flex-col items-center gap-2 rounded border border-dashed border-gray-200 px-4 py-6 text-center"
            >
              <p class="text-sm font-medium text-gray-800">
                {{
                  hasFilters
                    ? $t("core.content_calendar.empty.filtered_title")
                    : $t("core.content_calendar.empty.month_title")
                }}
              </p>
              <p class="text-xs text-gray-500">
                {{
                  hasFilters
                    ? $t("core.content_calendar.empty.filtered_message")
                    : $t("core.content_calendar.empty.month_message", {
                        count: otherMonthTotal,
                      })
                }}
              </p>
              <button
                v-if="hasFilters"
                type="button"
                class="text-xs text-primary hover:underline"
                @click="clearFilters"
              >
                {{ $t("core.content_calendar.actions.clear_filters") }}
              </button>
              <button
                v-else
                type="button"
                class="text-xs text-primary hover:underline"
                @click="goToday"
              >
                {{ $t("core.content_calendar.actions.today") }}
              </button>
            </div>
            <MonthGrid
              :month="month"
              :posts="monthPosts"
              :loading="loading"
              @previous="goPrevious"
              @next="goNext"
              @today="goToday"
              @select="openDetail"
            />
          </template>

          <ListView
            v-if="view === 'list'"
            :posts="filteredPosts"
            :can-manage="canManage"
            @select="openDetail"
            @clear-filters="clearFilters"
          />
        </template>
      </div>
    </VCard>
  </div>

  <PostDetailDrawer
    v-if="selectedPost"
    :key="selectedPost.name"
    :post="selectedPost"
    :source="dataSource"
    :can-manage="canManage"
    @close="selectedPost = undefined"
    @updated="handleUpdated"
  />
</template>
