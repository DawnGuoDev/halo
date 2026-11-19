<script lang="ts" setup>
import type { ListedPost } from "@halo-dev/api-client";
import { coreApiClient } from "@halo-dev/api-client";
import {
  IconArrowLeft,
  IconArrowRight,
  IconCalendar,
  IconRefreshLine,
  Toast,
  VButton,
  VCard,
  VEmpty,
  VFilterDropdown,
  VFilterDropdownGroup,
  VLoading,
  VModal,
  VPageHeader,
  VSpace,
  VStatusDot,
} from "@halo-dev/components";
import { utils } from "@halo-dev/ui-shared";
import { useQueryClient } from "@tanstack/vue-query";
import { useRouteQuery } from "@vueuse/router";
import type { Ref } from "vue";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import CategoryFilterDropdown from "@/components/filter/CategoryFilterDropdown.vue";
import { postLabels } from "@/constants/labels";
import PostCalendarEvent from "./components/PostCalendarEvent.vue";
import PostCalendarListItem from "./components/PostCalendarListItem.vue";
import {
  buildMonthGrid,
  dateKey,
  splitBySchedule,
  usePostCalendar,
  type PostCalendarStatus,
} from "./composables/use-post-calendar";

const props = withDefaults(
  defineProps<{
    /** Development-only mock data. Never set in production. */
    mockPosts?: ListedPost[];
  }>(),
  { mockPosts: undefined }
);

const { t } = useI18n();
const queryClient = useQueryClient();

/**
 * View and month are business state, not URL state (the console preview and
 * some embedded contexts cannot write to history). Filters stay in the URL,
 * mirroring the existing post list.
 */
const view = ref<"month" | "list">("month");
const cursor = ref(
  new Date(new Date().getFullYear(), new Date().getMonth(), 1)
);

const keyword = useRouteQuery<string>("keyword", "");
const category = useRouteQuery<string | undefined>("category");
const status = useRouteQuery<string | undefined>("status");

const filters = computed(() => ({
  keyword: keyword.value || "",
  category: category.value,
  status:
    status.value === "published" || status.value === "scheduled"
      ? (status.value as PostCalendarStatus)
      : undefined,
}));

const { posts, isLoading, isFetching, isError, refetch } = usePostCalendar(
  filters as unknown as Ref<{
    keyword: string;
    category?: string;
    status?: PostCalendarStatus;
  }>
);

const useMock = computed(() => !!props.mockPosts && import.meta.env.DEV);

const mockRevision = ref(0);
const mockPosts = computed(() => {
  void mockRevision.value;
  if (!useMock.value) {
    return [];
  }
  const keywordValue = filters.value.keyword.trim().toLowerCase();
  return (props.mockPosts || [])
    .filter((post) => {
      if (
        filters.value.category &&
        !post.categories?.some(
          (item) => item.metadata.name === filters.value.category
        )
      ) {
        return false;
      }
      if (!keywordValue) {
        return true;
      }
      return [post.post.spec.title, post.post.spec.slug]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(keywordValue));
    })
    .map((post) => ({
      post,
      status: (post.post.metadata.labels?.[postLabels.SCHEDULING_PUBLISH] ===
      "true"
        ? "scheduled"
        : "published") as PostCalendarStatus,
      publishTime: post.post.spec.publishTime
        ? new Date(post.post.spec.publishTime)
        : undefined,
    }));
});

const loadedPosts = computed(() =>
  useMock.value ? mockPosts.value : posts.value
);

const loading = computed(() => !useMock.value && isLoading.value);
const fetching = computed(() => !useMock.value && isFetching.value);
const failed = computed(() => !useMock.value && isError.value);
const empty = computed(() => !loadedPosts.value.length);

const splitPosts = computed(() => splitBySchedule(loadedPosts.value));
const scheduledPosts = computed(() => splitPosts.value.scheduled);
const unscheduledPosts = computed(() => splitPosts.value.unscheduled);

const monthGrid = computed(() => buildMonthGrid(cursor.value));

const eventsByDay = computed(() => {
  const map = new Map<string, Loaded[]>();
  scheduledPosts.value.forEach((item) => {
    const key = dateKey(item.publishTime as Date);
    const list = map.get(key) || [];
    list.push(item);
    map.set(key, list);
  });
  map.forEach((list) =>
    list.sort(
      (a, b) =>
        (a.publishTime as Date).getTime() - (b.publishTime as Date).getTime()
    )
  );
  return map;
});

const monthLabel = computed(() => {
  const date = cursor.value;
  return t("core.post.calendar.month_label", {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
  });
});

const stats = computed(() => ({
  month: scheduledPosts.value.filter(
    (item) =>
      (item.publishTime as Date).getFullYear() === cursor.value.getFullYear() &&
      (item.publishTime as Date).getMonth() === cursor.value.getMonth()
  ).length,
  published: loadedPosts.value.filter((item) => item.status === "published")
    .length,
  scheduled: loadedPosts.value.filter((item) => item.status === "scheduled")
    .length,
  unscheduled: unscheduledPosts.value.length,
}));

function goMonth(offset: number) {
  cursor.value = new Date(
    cursor.value.getFullYear(),
    cursor.value.getMonth() + offset,
    1
  );
}

function backToThisMonth() {
  const now = new Date();
  cursor.value = new Date(now.getFullYear(), now.getMonth(), 1);
}

function resetFilters() {
  keyword.value = "";
  category.value = undefined;
  status.value = undefined;
}

// ---------- detail / adjust publish time ----------
const detail = ref<{
  post: ListedPost;
  status: PostCalendarStatus;
  publishTime?: string;
}>();
const detailVisible = ref(false);
const publishTimeInput = ref("");
const timeError = ref("");
const saving = ref(false);
const syncNotice = ref("");
type Loaded = (typeof loadedPosts.value)[number];

function openDetail(item: Loaded) {
  detail.value = {
    post: item.post,
    status: item.status,
    publishTime: item.post.post.spec.publishTime,
  };
  publishTimeInput.value = item.post.post.spec.publishTime
    ? toDatetimeLocal(new Date(item.post.post.spec.publishTime))
    : "";
  timeError.value = "";
  detailVisible.value = true;
}

function toDatetimeLocal(date: Date) {
  const pad = (value: number) => `${value}`.padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function findItem(name: string): Loaded | undefined {
  return loadedPosts.value.find(
    (item) => item.post.post.metadata.name === name
  );
}

function openByName(name: string) {
  const item = findItem(name);
  if (item) {
    openDetail(item);
  }
}

function applyMockTime(name: string, publishTime?: string) {
  const post = props.mockPosts?.find(
    (item) => item.post.metadata.name === name
  )?.post;
  if (post) {
    post.spec.publishTime = publishTime;
  }
}

async function savePublishTime() {
  if (!detail.value || saving.value) {
    return;
  }

  const date = publishTimeInput.value
    ? new Date(publishTimeInput.value)
    : undefined;

  if (!date || Number.isNaN(date.getTime())) {
    timeError.value = t("core.post.calendar.detail.publish_time_invalid");
    return;
  }
  if (date.getTime() <= Date.now()) {
    timeError.value = t("core.post.calendar.detail.publish_time_invalid");
    return;
  }

  timeError.value = "";
  saving.value = true;
  const name = detail.value.post.post.metadata.name;

  try {
    if (useMock.value) {
      applyMockTime(name, date.toISOString());
      mockRevision.value++;
    } else {
      // Read the latest post and only change spec.publishTime: the publish
      // state stays untouched (product decision), mirroring the existing
      // "文章设置" behaviour.
      const { data: latest } = await coreApiClient.content.post.getPost({
        name,
      });
      await coreApiClient.content.post.updatePost({
        name,
        post: {
          ...latest,
          spec: { ...latest.spec, publishTime: date.toISOString() },
        },
      });
      await queryClient.invalidateQueries({ queryKey: ["post-calendar"] });
      await refetch();
    }

    if (
      date.getFullYear() !== cursor.value.getFullYear() ||
      date.getMonth() !== cursor.value.getMonth()
    ) {
      cursor.value = new Date(date.getFullYear(), date.getMonth(), 1);
    }

    detailVisible.value = false;
    Toast.success(
      t("core.post.calendar.detail.saved", {
        datetime: toDatetimeLocal(date).replace("T", " "),
      })
    );
    syncNotice.value = t("core.post.calendar.detail.sync_notice", {
      title: name,
    });
  } catch (error) {
    console.error("Failed to update calendar publish time", error);
    timeError.value = t("core.common.toast.server_internal_error");
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <VModal
    v-if="detailVisible && detail?.post"
    :visible="detailVisible"
    :title="detail.post.post.spec.title"
    :width="620"
    :mount-to-body="true"
    @close="detailVisible = false"
  >
    <div class="space-y-4 px-2 pb-2">
      <div class="flex items-center gap-2">
        <VStatusDot
          :state="detail.status === 'scheduled' ? 'success' : 'default'"
          :text="
            detail.status === 'scheduled'
              ? $t('core.post.calendar.status.scheduled')
              : $t('core.post.calendar.status.published')
          "
        />
      </div>
      <div class="flex items-center gap-1">
        <span
          v-if="detail.post.categories.length"
          class="text-xs text-gray-500"
        >
          {{ $t("core.post.calendar.fields.categories") }}：
        </span>
        <span
          v-for="item in detail.post.categories"
          :key="item.metadata.name"
          class="rounded-base border border-gray-200 px-1.5 py-0.5 text-xs text-gray-700"
        >
          {{ item.spec.displayName }}
        </span>
      </div>
      <div class="text-xs text-gray-500">
        {{ $t("core.post.calendar.fields.slug") }}：
        <span style="font-family: var(--font-mono, monospace)">
          {{ detail.post.post.spec.slug }}
        </span>
      </div>
      <div class="text-sm text-gray-600">
        {{ $t("core.post.calendar.fields.publish_time") }}：
        <span class="tabular-nums">
          {{
            detail.publishTime
              ? detail.publishTime.replace("T", " ").slice(0, 16)
              : $t("core.post.calendar.unscheduled.badge")
          }}
        </span>
      </div>

      <template v-if="detail.status === 'scheduled'">
        <div
          class="rounded-base border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600"
        >
          {{ $t("core.post.calendar.detail.scheduled_notice") }}
        </div>
        <FormKit
          :key="detail.post.post.metadata.name"
          v-model="publishTimeInput"
          type="datetime-local"
          :label="$t('core.post.calendar.fields.publish_time')"
          :help="$t('core.post.calendar.detail.publish_time_help')"
          name="publishTime"
        />
        <p v-if="timeError" class="text-xs text-red-500" role="alert">
          {{ timeError }}
        </p>
      </template>
      <div
        v-else
        class="rounded-base border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600"
      >
        {{ $t("core.post.calendar.detail.readonly") }}
      </div>
    </div>
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <VButton @click="detailVisible = false">
          {{ $t("core.common.buttons.cancel") }}
        </VButton>
        <VButton
          v-if="detail.status === 'scheduled'"
          type="secondary"
          :loading="saving"
          @click="savePublishTime"
        >
          {{ $t("core.post.calendar.detail.save") }}
        </VButton>
      </div>
    </template>
  </VModal>

  <VPageHeader :title="$t('core.post.calendar.title')">
    <template #icon>
      <IconCalendar />
    </template>
    <template #actions>
      <div
        class="flex overflow-hidden rounded-base border border-gray-300"
        role="tablist"
      >
        <button
          v-for="item in ['month', 'list'] as const"
          :key="item"
          type="button"
          role="tab"
          :aria-selected="view === item"
          class="px-3 py-1.5 text-sm"
          :class="
            view === item
              ? 'bg-gray-100 font-medium text-gray-900'
              : 'text-gray-600'
          "
          @click="view = item"
        >
          {{ $t(`core.post.calendar.views.${item}`) }}
        </button>
      </div>
      <VButton :route="{ name: 'Posts' }" size="sm">
        {{ $t("core.post.title") }}
      </VButton>
    </template>
  </VPageHeader>

  <div class="m-0 md:m-4">
    <VCard :body-class="['!p-0']">
      <template #header>
        <div class="block w-full bg-gray-50 px-4 py-3">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div class="flex-1">
              <SearchInput v-model="keyword" />
            </div>
            <VSpace spacing="lg" class="flex-wrap">
              <VFilterDropdownGroup
                :has-external-filters="!!category || !!status"
                @clear="resetFilters"
              >
                <CategoryFilterDropdown
                  v-model="category"
                  :label="$t('core.post.filters.category.label')"
                />
                <VFilterDropdown
                  v-model="status"
                  :label="$t('core.common.filters.labels.status')"
                  show-clear-option
                  :clear-label="t('core.common.filters.item_labels.all')"
                  :options="[
                    {
                      label: t('core.post.calendar.status.published'),
                      value: 'published',
                    },
                    {
                      label: t('core.post.calendar.status.scheduled'),
                      value: 'scheduled',
                    },
                  ]"
                />
              </VFilterDropdownGroup>
              <button
                v-tooltip="$t('core.common.buttons.refresh')"
                type="button"
                class="group cursor-pointer rounded p-1 hover:bg-gray-200"
                @click="refetch()"
              >
                <IconRefreshLine
                  :class="{ 'animate-spin text-gray-900': fetching }"
                  class="h-4 w-4 text-gray-600 group-hover:text-gray-900"
                />
              </button>
            </VSpace>
          </div>
        </div>
      </template>

      <VLoading v-if="loading" />
      <VEmpty
        v-else-if="failed"
        :title="$t('core.post.calendar.error.title')"
        :message="$t('core.post.calendar.error.message')"
      >
        <template #actions>
          <VButton @click="refetch()">
            {{ $t("core.common.buttons.refresh") }}
          </VButton>
        </template>
      </VEmpty>
      <VEmpty
        v-else-if="empty"
        :title="$t('core.post.calendar.empty.title')"
        :message="$t('core.post.calendar.empty.message')"
      >
        <template #actions>
          <VButton @click="resetFilters">
            {{ $t("core.common.buttons.reset") }}
          </VButton>
        </template>
      </VEmpty>

      <template v-else>
        <div
          class="grid grid-cols-2 gap-3 border-b border-gray-100 p-4 md:grid-cols-4"
        >
          <div
            v-for="item in [
              ['month', stats.month],
              ['published', stats.published],
              ['scheduled', stats.scheduled],
              ['unscheduled', stats.unscheduled],
            ]"
            :key="item[0]"
            class="rounded-base border border-gray-200 px-4 py-3"
          >
            <div class="text-xs text-gray-500">
              {{ $t(`core.post.calendar.stats.${item[0]}`) }}
            </div>
            <div class="mt-1 text-xl font-bold tabular-nums">
              {{ item[1] }}
            </div>
          </div>
        </div>

        <!-- Month view -->
        <div v-if="view === 'month'" class="overflow-x-auto">
          <div
            class="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3"
          >
            <div class="flex items-center gap-2">
              <VButton
                size="sm"
                :aria-label="$t('core.post.calendar.actions.previous_month')"
                @click="goMonth(-1)"
              >
                <IconArrowLeft />
              </VButton>
              <span class="min-w-32 text-center font-medium tabular-nums">
                {{ monthLabel }}
              </span>
              <VButton
                size="sm"
                :aria-label="$t('core.post.calendar.actions.next_month')"
                @click="goMonth(1)"
              >
                <IconArrowRight />
              </VButton>
              <VButton size="sm" @click="backToThisMonth">
                {{ $t("core.post.calendar.actions.back_to_this_month") }}
              </VButton>
            </div>
            <span class="hidden text-xs text-gray-500 md:inline">
              {{ $t("core.post.calendar.month_hint") }}
            </span>
          </div>

          <div class="min-w-[720px]">
            <div class="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
              <div
                v-for="label in $t('core.post.calendar.weekdays').split(',')"
                :key="label"
                class="px-2 py-2 text-xs text-gray-500"
              >
                {{ label }}
              </div>
            </div>
            <div class="grid grid-cols-7">
              <div
                v-for="day in monthGrid"
                :key="day.key"
                class="min-h-28 border-b border-r border-gray-100 p-1.5"
                :class="day.inMonth ? 'bg-white' : 'bg-gray-50/60'"
              >
                <div
                  class="mb-1 text-xs tabular-nums"
                  :class="day.inMonth ? 'text-gray-700' : 'text-gray-400'"
                >
                  {{ day.date.getDate() }}
                </div>
                <PostCalendarEvent
                  v-for="item in (eventsByDay.get(day.key) || []).slice(0, 3)"
                  :key="item.post.post.metadata.name"
                  :name="item.post.post.metadata.name"
                  :title="item.post.post.spec.title"
                  :status="item.status"
                  :time="
                    item.publishTime
                      ? utils.date.format(item.publishTime, 'HH:mm')
                      : undefined
                  "
                  @select="(name: string) => openByName(name)"
                />
              </div>
            </div>
          </div>

          <div class="border-t border-gray-200 bg-gray-50 px-4 py-3">
            <div class="mb-2 flex flex-wrap items-baseline gap-2">
              <span class="text-sm font-medium text-gray-900">
                {{ $t("core.post.calendar.unscheduled.title") }}
              </span>
              <span class="text-xs text-gray-500">
                {{ $t("core.post.calendar.unscheduled.description") }}
              </span>
            </div>
            <div v-if="unscheduledPosts.length" class="flex flex-wrap gap-2">
              <button
                v-for="item in unscheduledPosts"
                :key="item.post.post.metadata.name"
                type="button"
                class="rounded-base border border-dashed border-gray-300 bg-white px-2.5 py-1.5 text-xs hover:bg-gray-50"
                @click="openDetail(item)"
              >
                {{ item.post.post.spec.title }}
              </button>
            </div>
            <p v-else class="text-xs text-gray-500">
              {{ $t("core.post.calendar.unscheduled.empty") }}
            </p>
          </div>
        </div>

        <!-- List view -->
        <div v-else>
          <PostCalendarListItem
            v-for="item in scheduledPosts.concat(unscheduledPosts)"
            :key="item.post.post.metadata.name"
            :post="item.post"
            :status="item.status"
            :publish-time="
              item.publishTime ? utils.date.format(item.publishTime) : undefined
            "
            @open="openDetail(item)"
          />
        </div>
      </template>
    </VCard>
    <div
      v-if="syncNotice"
      class="mt-3 rounded-base border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800"
      role="status"
    >
      {{ syncNotice }}
    </div>
    <p class="mt-3 text-xs text-gray-500">
      {{ $t("core.post.calendar.footer_note") }}
    </p>
  </div>
</template>
