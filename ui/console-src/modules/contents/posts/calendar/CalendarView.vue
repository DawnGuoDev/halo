<script lang="ts" setup>
import {
  IconCalendar,
  IconRefreshLine,
  IconSearch,
  VButton,
  VCard,
  VEmpty,
  VLoading,
  VPageHeader,
  VSpace,
} from "@halo-dev/components";
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import CalendarDetailDrawer from "./components/CalendarDetailDrawer.vue";
import CalendarListView from "./components/CalendarListView.vue";
import CalendarMonthView from "./components/CalendarMonthView.vue";
import CalendarStatusTag from "./components/CalendarStatusTag.vue";
import {
  formatMonth,
  supportsHistoryReplaceState,
} from "./composables/use-calendar-date";
import {
  useCalendarPosts,
  type ViewMode,
} from "./composables/use-calendar-posts";
import {
  mockCategories,
  type CalendarPost,
  type CalendarPostStatus,
} from "./mock-posts";

const { t } = useI18n();

const route = useRoute();
const router = useRouter();

/**
 * 静态原型在 origin=null（about:srcdoc）的沙箱 iframe 中运行，写 URL 会抛 SecurityError。
 * 此时降级为只维护内存状态；控制台 SPA 中仍与现有列表页一致同步到 URL。
 */
const canSyncQuery = supportsHistoryReplaceState();

const view = ref<ViewMode>(route.query.view === "list" ? "list" : "calendar");
const keyword = ref<string>((route.query.keyword as string) || "");
const categoryQuery = ref<string>((route.query.category as string) || "");
const statusFilter = ref<string>((route.query.status as string) || "");
const monthQuery = ref<string>((route.query.month as string) || "");

const selectedCategory = computed(() => categoryQuery.value || undefined);

watch(
  [view, keyword, categoryQuery, statusFilter, monthQuery],
  ([nextView, nextKeyword, nextCategory, nextStatus, nextMonth]) => {
    if (!canSyncQuery) return;
    const query: Record<string, string> = {};
    if (nextView === "list") query.view = "list";
    if (nextKeyword) query.keyword = nextKeyword;
    if (nextCategory) query.category = nextCategory;
    if (nextStatus) query.status = nextStatus;
    if (nextMonth) query.month = nextMonth;
    router.replace({ query }).catch(() => {
      // 非必要交互：URL 同步失败不应中断筛选或月份切换
    });
  }
);

const { posts, loading, failed, load, updatePublishTime } = useCalendarPosts();

// TODO(接入真实权限): 改为 utils.permission.has(["system:posts:manage"])
const canManage = ref(true);
const selectedPost = ref<CalendarPost>();
const now = ref(Date.now());

const month = computed({
  get() {
    const match = /^(\d{4})-(\d{2})$/.exec(monthQuery.value);
    if (match) {
      return new Date(Number(match[1]), Number(match[2]) - 1, 1);
    }
    const current = new Date();
    return new Date(current.getFullYear(), current.getMonth(), 1);
  },
  set(value: Date) {
    monthQuery.value = `${value.getFullYear()}-${`${value.getMonth() + 1}`.padStart(2, "0")}`;
  },
});

const statusOptions = computed<{ label: string; value: CalendarPostStatus }[]>(
  () => [
    {
      label: t("core.publish_calendar.status.published"),
      value: "published",
    },
    {
      label: t("core.publish_calendar.status.scheduled"),
      value: "scheduled",
    },
    { label: t("core.publish_calendar.status.draft"), value: "draft" },
    { label: t("core.publish_calendar.status.recycled"), value: "recycled" },
  ]
);

const filteredPosts = computed(() => {
  const key = keyword.value.trim().toLowerCase();
  return posts.value
    .filter((post) => {
      if (
        statusFilter.value &&
        post.status !== (statusFilter.value as CalendarPostStatus)
      ) {
        return false;
      }
      if (
        selectedCategory.value &&
        !post.categories.includes(selectedCategory.value)
      ) {
        return false;
      }
      if (key && !`${post.title} ${post.excerpt}`.toLowerCase().includes(key)) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      const at = new Date(a.publishTime || a.createdAt).getTime();
      const bt = new Date(b.publishTime || b.createdAt).getTime();
      return at - bt;
    });
});

const monthPosts = computed(() =>
  filteredPosts.value.filter((post) => {
    const source = new Date(post.publishTime || post.createdAt);
    return (
      source.getFullYear() === month.value.getFullYear() &&
      source.getMonth() === month.value.getMonth()
    );
  })
);

const hasFilters = computed(
  () => !!keyword.value || !!selectedCategory.value || !!statusFilter.value
);

const emptyState = computed(() => {
  if (hasFilters.value) {
    return {
      title: t("core.publish_calendar.empty.filtered.title"),
      description: t("core.publish_calendar.empty.filtered.description"),
    };
  }
  return {
    title: t("core.publish_calendar.empty.month.title", {
      month: formatMonth(month.value),
    }),
    description: t("core.publish_calendar.empty.month.description"),
  };
});

const visiblePosts = computed(() =>
  view.value === "calendar" ? monthPosts.value : filteredPosts.value
);

const showEmpty = computed(
  () => !loading.value && !failed.value && visiblePosts.value.length === 0
);

function clearFilters() {
  keyword.value = "";
  categoryQuery.value = "";
  statusFilter.value = "";
}

function handleSave(payload: { name: string; publishTime: string }) {
  updatePublishTime(payload.name, payload.publishTime);
  selectedPost.value = undefined;
}

function handleRetry() {
  load();
}

watch(
  () => selectedPost.value?.name,
  () => {
    now.value = Date.now();
  }
);

onMounted(() => {
  load();
});
</script>

<template>
  <VPageHeader :title="$t('core.publish_calendar.title')">
    <template #icon>
      <IconCalendar class="mr-2 self-center" />
    </template>
    <template #actions>
      <div class="flex items-center gap-2">
        <span class="hidden text-xs text-gray-500 sm:inline">
          {{ $t("core.publish_calendar.permission_hint") }}
        </span>
        <label
          class="inline-flex cursor-pointer items-center gap-1.5 text-xs text-gray-600"
        >
          <input v-model="canManage" type="checkbox" class="form-checkbox" />
          {{ $t("core.publish_calendar.permission_toggle") }}
        </label>
      </div>
    </template>
  </VPageHeader>

  <div class="p-4">
    <VCard>
      <div
        class="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-3"
      >
        <div class="flex flex-wrap items-center gap-2">
          <div class="relative">
            <IconSearch
              class="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              v-model="keyword"
              type="search"
              class="form-input h-9 w-56 pl-8"
              :placeholder="
                $t('core.publish_calendar.filters.keyword_placeholder')
              "
              :aria-label="
                $t('core.publish_calendar.filters.keyword_placeholder')
              "
            />
          </div>

          <!-- TODO(接入真实数据): 使用 @/components/filter/CategoryFilterDropdown 替代原生 select -->
          <select
            v-model="categoryQuery"
            class="form-select h-9 w-36"
            :aria-label="$t('core.publish_calendar.filters.category')"
          >
            <option value="">
              {{ $t("core.publish_calendar.filters.all_categories") }}
            </option>
            <option
              v-for="category in mockCategories"
              :key="category"
              :value="category"
            >
              {{ category }}
            </option>
          </select>

          <select
            v-model="statusFilter"
            class="form-select h-9 w-32"
            :aria-label="$t('core.publish_calendar.filters.status')"
          >
            <option value="">
              {{ $t("core.publish_calendar.filters.all_status") }}
            </option>
            <option
              v-for="option in statusOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>

          <VButton v-if="hasFilters" size="sm" @click="clearFilters">
            {{ $t("core.publish_calendar.filters.clear") }}
          </VButton>
        </div>

        <div class="flex items-center gap-2">
          <div class="inline-flex rounded border border-gray-200 p-0.5">
            <button
              type="button"
              class="rounded px-3 py-1 text-xs"
              :class="
                view === 'calendar'
                  ? 'bg-primary text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              "
              :aria-pressed="view === 'calendar'"
              @click="view = 'calendar'"
            >
              {{ $t("core.publish_calendar.views.calendar") }}
            </button>
            <button
              type="button"
              class="rounded px-3 py-1 text-xs"
              :class="
                view === 'list'
                  ? 'bg-primary text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              "
              :aria-pressed="view === 'list'"
              @click="view = 'list'"
            >
              {{ $t("core.publish_calendar.views.list") }}
            </button>
          </div>
          <VButton size="sm" @click="handleRetry">
            <template #icon>
              <IconRefreshLine />
            </template>
            {{ $t("core.publish_calendar.actions.refresh") }}
          </VButton>
        </div>
      </div>

      <div class="p-3">
        <div v-if="loading" class="py-6">
          <VLoading />
          <p class="mt-3 text-center text-xs text-gray-500">
            {{ $t("core.publish_calendar.states.loading") }}
          </p>
        </div>

        <VEmpty
          v-else-if="failed"
          :title="$t('core.publish_calendar.states.error.title')"
          :message="$t('core.publish_calendar.states.error.description')"
        >
          <template #actions>
            <VSpace>
              <VButton @click="handleRetry">
                {{ $t("core.publish_calendar.actions.retry") }}
              </VButton>
            </VSpace>
          </template>
        </VEmpty>

        <VEmpty
          v-else-if="showEmpty"
          :title="emptyState.title"
          :message="emptyState.description"
        >
          <template #actions>
            <VSpace>
              <VButton v-if="hasFilters" @click="clearFilters">
                {{ $t("core.publish_calendar.filters.clear") }}
              </VButton>
            </VSpace>
          </template>
        </VEmpty>

        <CalendarMonthView
          v-else-if="view === 'calendar'"
          v-model:month="month"
          :posts="monthPosts"
          :today-label="$t('core.publish_calendar.month.today_label')"
          @select="selectedPost = $event"
        />

        <CalendarListView
          v-else
          :posts="filteredPosts"
          @select="selectedPost = $event"
        />
      </div>

      <div
        v-if="!loading && !failed && !showEmpty"
        class="flex flex-wrap items-center gap-3 border-t border-gray-100 px-3 py-2 text-xs text-gray-500"
      >
        <span>
          {{
            $t("core.publish_calendar.footer.total", {
              count: filteredPosts.length,
            })
          }}
        </span>
        <CalendarStatusTag status="published" />
        <CalendarStatusTag status="scheduled" />
        <CalendarStatusTag status="draft" />
        <span class="ml-auto">
          {{ $t("core.publish_calendar.footer.synced") }}
        </span>
      </div>
    </VCard>
  </div>

  <CalendarDetailDrawer
    :post="selectedPost"
    :can-edit="canManage"
    :now="now"
    @close="selectedPost = undefined"
    @save="handleSave"
  />
</template>
