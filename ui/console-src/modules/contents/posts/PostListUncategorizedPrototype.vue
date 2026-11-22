<script lang="ts" setup>
import {
  IconAddCircle,
  IconBookRead,
  VButton,
  VCard,
  VEmpty,
  VEntity,
  VEntityContainer,
  VEntityField,
  VFilterDropdown,
  VFilterDropdownGroup,
  VPageHeader,
  VPagination,
  VSpace,
  VSwitch,
} from "@halo-dev/components";
import { computed, ref, watch } from "vue";

type PostStatus = "draft" | "published";

interface MockPost {
  id: string;
  title: string;
  excerpt: string;
  categories: string[];
  status: PostStatus;
  publishTime: string;
}

const posts: MockPost[] = [
  {
    id: "post-001",
    title: "Halo 2.28 发布说明",
    excerpt: "介绍本版本的控制台优化与主题适配要点。",
    categories: ["版本发布"],
    status: "published",
    publishTime: "2026-11-18 09:30",
  },
  {
    id: "post-002",
    title: "主题开发入门",
    excerpt: "从模板结构、模板引擎和静态资源开始。",
    categories: ["主题开发"],
    status: "published",
    publishTime: "2026-11-17 16:20",
  },
  {
    id: "post-003",
    title: "站点备份策略整理",
    excerpt: "尚未归类的备份与恢复注意事项。",
    categories: [],
    status: "published",
    publishTime: "2026-11-16 11:10",
  },
  {
    id: "post-004",
    title: "插件市场调研笔记",
    excerpt: "待补充分类的插件生态调研记录。",
    categories: [],
    status: "draft",
    publishTime: "—",
  },
  {
    id: "post-005",
    title: "内容团队写作规范",
    excerpt: "标题、摘要和封面的基础规范。",
    categories: ["内容运营"],
    status: "published",
    publishTime: "2026-11-14 10:00",
  },
  {
    id: "post-006",
    title: "迁移前的数据检查清单",
    excerpt: "尚未分类的迁移检查事项。",
    categories: [],
    status: "draft",
    publishTime: "—",
  },
  {
    id: "post-007",
    title: "SEO 基础配置指南",
    excerpt: "站点标题、描述和搜索引擎优化建议。",
    categories: ["SEO"],
    status: "published",
    publishTime: "2026-11-12 14:40",
  },
  {
    id: "post-008",
    title: "未分类文章处理草案",
    excerpt: "用于验证仅看未分类开关的示例文章。",
    categories: [],
    status: "published",
    publishTime: "2026-11-11 08:20",
  },
];

const keyword = ref("");
const selectedStatus = ref<PostStatus>();
const uncategorizedOnly = ref(false);
const page = ref(1);
const size = ref(5);
const selectedPostNames = ref<string[]>([]);

const statusOptions = [
  { label: "已发布", value: "published" },
  { label: "草稿", value: "draft" },
];

const filteredPosts = computed(() => {
  const normalizedKeyword = keyword.value.trim().toLowerCase();

  return posts.filter((post) => {
    const matchesKeyword =
      !normalizedKeyword ||
      post.title.toLowerCase().includes(normalizedKeyword) ||
      post.excerpt.toLowerCase().includes(normalizedKeyword);
    const matchesStatus =
      !selectedStatus.value || post.status === selectedStatus.value;
    const matchesUncategorized =
      !uncategorizedOnly.value || post.categories.length === 0;

    return matchesKeyword && matchesStatus && matchesUncategorized;
  });
});

const total = computed(() => filteredPosts.value.length);
const totalPages = computed(() =>
  Math.max(1, Math.ceil(total.value / size.value))
);
const pagedPosts = computed(() => {
  const start = (page.value - 1) * size.value;
  return filteredPosts.value.slice(start, start + size.value);
});

const hasActiveFilters = computed(
  () =>
    uncategorizedOnly.value ||
    selectedStatus.value !== undefined ||
    keyword.value.trim() !== ""
);

const allVisibleSelected = computed(
  () =>
    pagedPosts.value.length > 0 &&
    pagedPosts.value.every((post) => selectedPostNames.value.includes(post.id))
);

const emptyMessage = computed(() =>
  hasActiveFilters.value
    ? "当前筛选条件下没有文章，可以调整关键词、发布状态或重置筛选。"
    : "你可以尝试刷新或者新建文章。"
);

watch([keyword, selectedStatus], () => {
  page.value = 1;
});

watch(totalPages, (value) => {
  if (page.value > value) {
    page.value = value;
  }
});

function handleUncategorizedChange() {
  page.value = 1;
  selectedPostNames.value = [];
}

function handleCheckAllChange(event: Event) {
  const { checked } = event.target as HTMLInputElement;

  if (checked) {
    selectedPostNames.value = pagedPosts.value.map((post) => post.id);
  } else {
    selectedPostNames.value = [];
  }
}

function resetFilters() {
  keyword.value = "";
  selectedStatus.value = undefined;
  uncategorizedOnly.value = false;
  page.value = 1;
  selectedPostNames.value = [];
}
</script>

<template>
  <div class="min-h-screen bg-gray-100" data-testid="page-ready">
    <VPageHeader title="文章">
      <template #icon>
        <IconBookRead />
      </template>
      <template #actions>
        <VButton size="sm">分类</VButton>
        <VButton size="sm">标签</VButton>
        <VButton size="sm">回收站</VButton>
        <VButton type="secondary">
          <template #icon>
            <IconAddCircle />
          </template>
          新建
        </VButton>
      </template>
    </VPageHeader>

    <main class="m-0 md:m-4">
      <VCard :body-class="['!p-0']">
        <template #header>
          <div class="block w-full bg-gray-50 px-4 py-3">
            <div
              class="relative flex flex-col flex-wrap items-start gap-4 sm:flex-row sm:items-center"
            >
              <div class="hidden items-center sm:flex">
                <input
                  :checked="allVisibleSelected"
                  type="checkbox"
                  data-testid="check-all"
                  aria-label="全选当前页文章"
                  @change="handleCheckAllChange"
                />
              </div>

              <div class="flex w-full flex-1 items-center sm:w-auto">
                <SearchInput
                  v-model="keyword"
                  placeholder="搜索文章标题或摘要"
                />
              </div>

              <VSpace spacing="lg" class="flex-wrap">
                <VFilterDropdownGroup
                  clear-label="重置筛选"
                  :has-external-filters="
                    uncategorizedOnly || keyword.trim() !== ''
                  "
                  @clear="resetFilters"
                >
                  <VFilterDropdown
                    v-model="selectedStatus"
                    label="发布状态"
                    show-clear-option
                    clear-label="全部"
                    :options="statusOptions"
                  />
                  <div
                    class="flex h-8 items-center gap-2 rounded-md px-2 transition-colors hover:bg-gray-100"
                    data-testid="uncategorized-switch"
                  >
                    <span
                      class="text-sm"
                      :class="
                        uncategorizedOnly
                          ? 'font-semibold text-gray-900'
                          : 'text-gray-700'
                      "
                    >
                      仅看未分类
                    </span>
                    <VSwitch
                      v-model="uncategorizedOnly"
                      aria-label="仅看未分类"
                      @change="handleUncategorizedChange"
                    />
                  </div>
                </VFilterDropdownGroup>
              </VSpace>
            </div>
          </div>
        </template>

        <VEmpty
          v-if="pagedPosts.length === 0"
          title="暂无文章"
          :message="emptyMessage"
        >
          <template #actions>
            <VSpace>
              <VButton v-if="hasActiveFilters" @click="resetFilters">
                重置筛选
              </VButton>
              <VButton type="secondary">
                <template #icon>
                  <IconAddCircle />
                </template>
                新建
              </VButton>
            </VSpace>
          </template>
        </VEmpty>

        <VEntityContainer v-else>
          <VEntity
            v-for="post in pagedPosts"
            :key="post.id"
            :is-selected="selectedPostNames.includes(post.id)"
          >
            <template #checkbox>
              <input
                v-model="selectedPostNames"
                type="checkbox"
                :value="post.id"
                :data-testid="`post-checkbox-${post.id}`"
              />
            </template>
            <template #start>
              <VEntityField
                :title="post.title"
                :description="post.excerpt"
                max-width="480px"
              />
            </template>
            <template #end>
              <VEntityField
                :description="
                  post.categories.length ? post.categories.join('、') : '未分类'
                "
              />
              <VEntityField
                :description="post.status === 'published' ? '已发布' : '草稿'"
              />
              <VEntityField :description="post.publishTime" />
            </template>
          </VEntity>
        </VEntityContainer>

        <template #footer>
          <VPagination
            v-model:page="page"
            v-model:size="size"
            page-label="页"
            size-label="条 / 页"
            :total-label="`共 ${total} 篇文章`"
            :total="total"
            :size-options="[5, 10, 20]"
          />
        </template>
      </VCard>
    </main>
  </div>
</template>
