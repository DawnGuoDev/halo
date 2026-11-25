<script lang="ts" setup>
import {
  IconAddCircle,
  IconBookRead,
  IconClose,
  IconRefreshLine,
  Toast,
  VButton,
  VCard,
  VDropdownItem,
  VEmpty,
  VEntity,
  VEntityContainer,
  VEntityField,
  VLoading,
  VModal,
  VPagination,
  VPageHeader,
  VSpace,
  VStatusDot,
  VTag,
} from "@halo-dev/components";
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import SearchInput from "@/components/SearchInput.vue";
import CategoryFilterDropdown from "@/components/filter/CategoryFilterDropdown.vue";
import TagFilterDropdown from "@/components/filter/TagFilterDropdown.vue";
import UserFilterDropdown from "@/components/filter/UserFilterDropdown.vue";
import {
  VFilterDropdown,
  VFilterDropdownGroup,
} from "@/components/halo/filter";
import {
  FILTER_KEYS,
  SORT_OPTIONS,
  STATUS_OPTIONS,
  VISIBLE_OPTIONS,
  readFilters,
  statusLabel,
  usePostFilters,
  visibleLabel,
} from "@/composables/use-post-filters";
import { usePostCategory } from "@/composables/use-resource-queries";
import { useAllPostTagsQuery } from "@/composables/use-resource-queries";
import { t } from "@/i18n";
import {
  listPosts,
  postLabels,
  publishPost,
  recyclePost,
  type ListPostsResult,
} from "@/mock";
import type { MockPost } from "@/types";

// 参考业务仓库 ui/console-src/modules/contents/posts/PostList.vue（基线 f6c046cc2）：
// 页头 + 筛选 + 实体列表 + 分页 + 设置弹层保持原有结构与行为；
// 本次新增：筛选区下方的「当前筛选」可关闭标签行、筛选无结果空态。
const route = useRoute();
const router = useRouter();
const { writeFilters, clearAll } = usePostFilters();
const { categories } = usePostCategory();
const { data: allTags } = useAllPostTagsQuery();

const page = ref(1);
const size = ref(20);
const filters = ref(readFilters(route.query));
const sort = ref<string | undefined>(undefined);

const result = ref<ListPostsResult>({
  items: [],
  total: 0,
  hasNext: false,
  hasPrevious: false,
});
const loading = ref(false);
const fetching = ref(false);

const settingModalVisible = ref(false);
const selectedPost = ref<MockPost>();

// 初始分页取自 URL（刷新可复现同一页）
if (route.query.page) page.value = Number(route.query.page) || 1;
if (route.query.size) size.value = Number(route.query.size) || 20;

// URL → 本地筛选（浏览器前进/后退、直接打开带参数的链接时同步）
watch(
  () => route.query,
  () => {
    filters.value = readFilters(route.query);
  }
);

// 筛选控件 → URL：任何筛选变化都回到第 1 页（writeFilters 会移除 page）
function updateFilter(
  key: (typeof FILTER_KEYS)[number],
  value?: string | number | boolean | null
) {
  const next = value === undefined || value === null ? undefined : String(value);
  if (next === "" || (filters.value[key] === next)) return;
  filters.value = { ...filters.value, [key]: next };
  writeFilters({ [key]: next });
}

function updateSort(value?: string | number | boolean | null) {
  const next = value === undefined || value === null ? undefined : String(value);
  if (sort.value === next) return;
  sort.value = next;
}

function clearActiveFilter(key: (typeof FILTER_KEYS)[number]) {
  updateFilter(key, undefined);
}

const hasActiveFilters = computed(() =>
  FILTER_KEYS.some((key) => !!filters.value[key])
);

const filterTags = computed(() =>
  FILTER_KEYS.filter((key) => !!filters.value[key]).map((key) => ({
    key,
    name: filterLabels[key],
  }))
);

function readableFilterValue(key: string, value: string) {
  switch (key) {
    case "status":
      return (
        statusLabel(value) ||
        // 标签文案：资源被删除或详情尚未加载时回退显示原值，不阻塞列表
        value
      );
    case "visible":
      return visibleLabel(value) || value;
    case "category":
      return (
        categories.value.find((category) => category.name === value)
          ?.displayName || value
      );
    case "tag":
      return (
        allTags.value.find((tag) => tag.name === value)?.displayName || value
      );
    case "contributor":
      return value;
    default:
      return value;
  }
}

const filterLabels: Record<string, string> = {
  keyword: t("core.post.filters.active.keyword.label"),
  status: t("core.common.filters.labels.status"),
  visible: t("core.post.filters.visible.label"),
  category: t("core.post.filters.category.label"),
  tag: t("core.post.filters.tag.label"),
  contributor: t("core.post.filters.author.label"),
};

async function fetchPosts() {
  loading.value = !result.value.items.length;
  fetching.value = true;
  try {
    const labelSelector: string[] = ["content.halo.run/deleted=false"];
    const fieldSelector: string[] = [];

    if (filters.value.category) {
      fieldSelector.push(`spec.categories=${filters.value.category}`);
    }
    if (filters.value.tag) {
      fieldSelector.push(`spec.tags=${filters.value.tag}`);
    }
    if (filters.value.contributor) {
      fieldSelector.push(`status.contributors=${filters.value.contributor}`);
    }
    if (filters.value.visible) {
      fieldSelector.push(`spec.visible=${filters.value.visible}`);
    }
    if (filters.value.status !== undefined) {
      labelSelector.push(filters.value.status);
    }

    result.value = await listPosts({
      labelSelector,
      fieldSelector,
      sort: sort.value ? [sort.value] : undefined,
      keyword: filters.value.keyword || "",
      page: page.value,
      size: size.value,
    });
  } finally {
    loading.value = false;
    fetching.value = false;
  }
}

watch(
  () => [
    route.query.keyword,
    route.query.status,
    route.query.visible,
    route.query.category,
    route.query.tag,
    route.query.contributor,
    sort.value,
    page.value,
    size.value,
  ],
  () => {
    fetchPosts();
  },
  { immediate: true }
);

// 仅改页码：同步到 URL，不触发筛选重置
function handlePageChange(value: number) {
  page.value = value;
  const query = { ...route.query, page: value === 1 ? undefined : String(value) };
  if (query.page === undefined) delete query.page;
  router.replace({ query });
}

function handleSizeChange(value: number) {
  size.value = value;
}

function openSettings(post: MockPost) {
  selectedPost.value = post;
  settingModalVisible.value = true;
}

async function handlePublish(post: MockPost) {
  await publishPost(post.name);
  Toast.success("文章已发布（Mock）");
  fetchPosts();
}

async function handleDelete(post: MockPost) {
  await recyclePost(post.name);
  Toast.success("文章已移入回收站（Mock）");
  fetchPosts();
}

const sortOptions = SORT_OPTIONS.map((option) => ({
  label: option.label,
  value: option.key,
}));

const statusOptions = STATUS_OPTIONS.map((option) => ({
  label: option.label,
  value: option.selector,
}));

const visibleOptions = VISIBLE_OPTIONS.map((option) => ({
  label: option.label,
  value: option.key,
}));


function publishedText(post: MockPost) {
  if (post.scheduling) return "定时发布";
  return post.published ? "已发布" : "未发布";
}
</script>

<template>
  <VPageHeader :title="t('core.post.title')">
    <template #icon>
      <IconBookRead />
    </template>
    <template #actions>
      <VButton size="sm" @click="Toast.info('原型预览：分类管理未接入')">
        {{ t("core.post.actions.categories") }}
      </VButton>
      <VButton size="sm" @click="Toast.info('原型预览：标签管理未接入')">
        {{ t("core.post.actions.tags") }}
      </VButton>
      <VButton size="sm" @click="Toast.info('原型预览：回收站未接入')">
        {{ t("core.post.actions.recycle_bin") }}
      </VButton>
      <VButton
        type="secondary"
        @click="Toast.info('原型预览：文章编辑器未接入')"
      >
        <template #icon><IconAddCircle /></template>
        {{ t("core.common.buttons.new") }}
      </VButton>
    </template>
  </VPageHeader>

  <div class="m-0 md:m-4">
    <VCard :body-class="['!p-0']">
      <template #header>
        <div class="block w-full bg-gray-50 px-4 py-3">
          <div
            class="relative flex flex-col flex-wrap items-start gap-4 sm:flex-row sm:items-center"
          >
            <div class="flex w-full flex-1 items-center sm:w-auto">
              <SearchInput
                :model-value="filters.keyword || ''"
                placeholder="搜索文章…"
                @update:model-value="updateFilter('keyword', $event)"
              />
            </div>
            <VSpace spacing="lg" class="flex-wrap">
              <VFilterDropdownGroup
                :clear-label="t('core.common.buttons.reset')"
                :has-external-filters="!!filters.contributor"
                @clear="updateFilter('contributor', undefined)"
              >
                <VFilterDropdown
                  :model-value="filters.status"
                  :label="t('core.common.filters.labels.status')"
                  show-clear-option
                  :clear-label="t('core.common.filters.item_labels.all')"
                  :options="statusOptions"
                  @update:model-value="updateFilter('status', $event)"
                />
                <VFilterDropdown
                  :model-value="filters.visible"
                  :label="t('core.post.filters.visible.label')"
                  show-clear-option
                  :clear-label="t('core.common.filters.item_labels.all')"
                  :options="visibleOptions"
                  @update:model-value="updateFilter('visible', $event)"
                />
                <CategoryFilterDropdown
                  :model-value="filters.category"
                  :label="t('core.post.filters.category.label')"
                  @update:model-value="updateFilter('category', $event)"
                />
                <TagFilterDropdown
                  :model-value="filters.tag"
                  :label="t('core.post.filters.tag.label')"
                  @update:model-value="updateFilter('tag', $event)"
                />
                <UserFilterDropdown
                  :model-value="filters.contributor"
                  :label="t('core.post.filters.author.label')"
                  @update:model-value="updateFilter('contributor', $event)"
                />
                <VFilterDropdown
                  :model-value="sort"
                  :label="t('core.common.filters.labels.sort')"
                  show-clear-option
                  :clear-label="t('core.common.filters.item_labels.default')"
                  :options="sortOptions"
                  @update:model-value="updateSort"
                />
              </VFilterDropdownGroup>
              <div class="flex flex-row gap-2">
                <button
                  v-tooltip="t('core.common.buttons.refresh')"
                  type="button"
                  data-testid="post-refresh"
                  class="group cursor-pointer rounded p-1 hover:bg-gray-200"
                  @click="fetchPosts"
                >
                  <IconRefreshLine
                    :class="{ 'animate-spin text-gray-900': fetching }"
                    class="h-4 w-4 text-gray-600 group-hover:text-gray-900"
                  />
                </button>
              </div>
            </VSpace>
          </div>
        </div>
      </template>

      <!-- 本次新增：当前生效筛选（无筛选时整行不渲染） -->
      <div
        v-if="hasActiveFilters"
        data-testid="active-filters"
        class="flex flex-wrap items-center gap-2 border-b border-gray-100 bg-white px-4 py-2.5"
      >
        <span class="mr-1 text-xs text-gray-500">
          {{ t("core.post.filters.active.label") }}
        </span>
        <span
          v-for="item in filterTags"
          :key="item.key"
          :data-testid="`filter-tag-${item.key}`"
          class="filter-chip"
        >
          <span class="filter-chip__text">
            {{ filterLabels[item.key] }}：{{
              readableFilterValue(item.key, filters[item.key]!)
            }}
          </span>
          <button
            type="button"
            :data-testid="`filter-tag-remove-${item.key}`"
            :aria-label="
              t('core.post.filters.active.remove', {
                label: `${filterLabels[item.key]}：${readableFilterValue(item.key, filters[item.key]!)}`,
              })
            "
            class="flex h-4 w-4 cursor-pointer items-center justify-center rounded text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
            @click="clearActiveFilter(item.key)"
          >
            <IconClose class="h-3 w-3" />
          </button>
        </span>
        <button
          type="button"
          data-testid="clear-all-filters"
          class="ml-1 cursor-pointer text-xs font-medium text-primary hover:underline"
          @click="clearAll"
        >
          {{ t("core.post.filters.active.clear_all") }}
        </button>
      </div>

      <VLoading v-if="loading" class="py-10" />
      <!-- 本次新增：有筛选条件且结果为 0 时，引导清除筛选；不提供刷新/新建 -->
      <VEmpty
        v-else-if="!result.items.length && hasActiveFilters"
        :title="t('core.post.empty_filtered.title')"
        :message="t('core.post.empty_filtered.message')"
      >
        <template #actions>
          <VButton data-testid="empty-clear-filters" @click="clearAll">
            {{ t("core.post.empty_filtered.clear") }}
          </VButton>
        </template>
      </VEmpty>
      <!-- 原有空态：站点没有文章（无筛选） -->
      <VEmpty
        v-else-if="!result.items.length"
        data-testid="post-empty"
        :title="t('core.post.empty.title')"
        :message="t('core.post.empty.message')"
      >
        <template #actions>
          <VSpace>
            <VButton @click="fetchPosts">
              {{ t("core.common.buttons.refresh") }}
            </VButton>
            <VButton
              type="secondary"
              @click="Toast.info('原型预览：文章编辑器未接入')"
            >
              <template #icon><IconAddCircle /></template>
              {{ t("core.common.buttons.new") }}
            </VButton>
          </VSpace>
        </template>
      </VEmpty>
      <VEntityContainer v-else data-testid="post-list">
        <VEntity
          v-for="post in result.items"
          :key="post.name"
          :data-testid="`post-row-${post.name}`"
          :is-selected="selectedPost?.name === post.name"
          @click="openSettings(post)"
        >
          <template #start>
            <VEntityField :title="post.title">
              <template #extra>
                <VStatusDot
                  v-if="post.pinned"
                  state="success"
                  :text="t('core.post.list.fields.pinned')"
                />
              </template>
              <template #description>
                <div class="flex flex-col gap-1.5">
                  <VSpace class="flex-wrap !gap-y-1">
                    <p
                      v-if="post.categories.length"
                      class="inline-flex flex-wrap gap-1 text-xs text-gray-500"
                    >
                      {{ t("core.post.list.fields.categories") }}
                      <span
                        v-for="category in post.categories"
                        :key="category"
                        class="cursor-pointer hover:text-gray-900"
                      >
                        {{ readableFilterValue("category", category) }}
                      </span>
                    </p>
                    <span class="text-xs text-gray-500">
                      {{ t("core.post.list.fields.comments", { comments: post.comments }) }}
                    </span>
                  </VSpace>
                  <VSpace v-if="post.tags.length" class="flex-wrap">
                    <VTag v-for="tag in post.tags" :key="tag">
                      {{ readableFilterValue("tag", tag) }}
                    </VTag>
                  </VSpace>
                </div>
              </template>
            </VEntityField>
          </template>
          <template #end>
            <VEntityField>
              <template #description>
                <span class="text-xs text-gray-500">
                  {{ t("core.post.list.fields.views", { visits: post.views }) }}
                </span>
              </template>
            </VEntityField>
            <VEntityField>
              <template #description>
                <VStatusDot
                  :text="publishedText(post)"
                  :state="
                    post.scheduling
                      ? 'warning'
                      : post.published
                        ? 'success'
                        : 'default'
                  "
                />
              </template>
            </VEntityField>
            <VEntityField>
              <template #description>
                <span class="text-xs text-gray-500">{{ post.updateTime }}</span>
              </template>
            </VEntityField>
          </template>
          <template #dropdownItems>
            <VDropdownItem
              v-if="!post.published || post.scheduling"
              @click.stop="handlePublish(post)"
            >
              {{ t("core.common.buttons.publish") }}
            </VDropdownItem>
            <VDropdownItem @click.stop="openSettings(post)">
              {{ t("core.common.buttons.setting") }}
            </VDropdownItem>
            <VDropdownItem type="danger" @click.stop="handleDelete(post)">
              {{ t("core.common.buttons.delete") }}
            </VDropdownItem>
          </template>
        </VEntity>
      </VEntityContainer>

      <template #footer>
        <VPagination
          :page="page"
          :size="size"
          :total="result.total"
          :size-options="[20, 30, 50, 100]"
          :page-label="t('core.components.pagination.page_label')"
          :size-label="t('core.components.pagination.size_label')"
          :total-label="
            t('core.components.pagination.total_label', { total: result.total })
          "
          data-testid="post-pagination"
          @update:page="handlePageChange"
          @update:size="handleSizeChange"
        />
      </template>
    </VCard>
  </div>

  <VModal
    v-if="settingModalVisible"
    :visible="settingModalVisible"
    :title="t('core.post.settings.title')"
    :width="520"
    @close="settingModalVisible = false"
  >
    <div v-if="selectedPost" class="flex flex-col gap-4 text-sm">
      <div class="font-semibold">{{ selectedPost.title }}</div>
      <div class="text-xs text-gray-500">
        此弹层仅用于确认设置入口仍可打开；表单校验等业务能力尚未迁入。
      </div>
      <div class="flex flex-col gap-1">
        <span class="font-medium">{{ t("core.post.settings.fields.slug.label") }}</span>
        <input
          :value="selectedPost.slug"
          class="h-9 rounded border-gray-300 text-sm focus:border-primary focus:ring-primary"
        />
      </div>
      <div class="flex flex-col gap-1">
        <span class="font-medium">
          {{ t("core.post.settings.fields.visible.label") }}
        </span>
        <select
          :value="selectedPost.visible"
          class="h-9 rounded border-gray-300 text-sm focus:border-primary focus:ring-primary"
        >
          <option value="PUBLIC">{{ visibleLabel("PUBLIC") }}</option>
          <option value="INTERNAL">{{ visibleLabel("INTERNAL") }}</option>
          <option value="PRIVATE">{{ visibleLabel("PRIVATE") }}</option>
        </select>
      </div>
    </div>
    <template #footer>
      <VSpace>
        <VButton @click="settingModalVisible = false">
          {{ t("core.common.buttons.cancel") }}
        </VButton>
        <VButton
          type="secondary"
          @click="
            settingModalVisible = false;
            Toast.success('预览：设置已保存（未持久化）');
          "
        >
          {{ t("core.common.buttons.save") }}
        </VButton>
      </VSpace>
    </template>
  </VModal>
</template>
