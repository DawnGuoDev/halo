<script lang="ts" setup>
import {
  IconAddCircle,
  IconBookRead,
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
import { computed, onMounted, ref, watch } from "vue";
import SearchInput from "@/components/SearchInput.vue";
import {
  VFilterDropdown,
  VFilterDropdownGroup,
} from "@/components/halo/filter";
import {
  listPosts,
  publishPost,
  recyclePost,
  type ListPostsResult,
} from "@/mock";
import type { MockPost } from "@/types";

// 参考业务仓库 ui/console-src/modules/contents/posts/PostList.vue，数据入口替换为本地 Mock
const keyword = ref("");
const status = ref<string | undefined>();
const visible = ref<string | undefined>();
const category = ref<string | undefined>();
const sort = ref<string | undefined>();
const page = ref(1);
const size = ref(10);

const result = ref<ListPostsResult>({
  items: [],
  total: 0,
  hasNext: false,
  hasPrevious: false,
});
const loading = ref(false);

const settingModalVisible = ref(false);
const selectedPost = ref<MockPost>();

const filters = computed(() => [
  keyword.value,
  status.value,
  visible.value,
  category.value,
  sort.value,
]);

async function fetchPosts() {
  loading.value = true;
  try {
    result.value = await listPosts({
      page: page.value,
      size: size.value,
      keyword: keyword.value,
      status: status.value,
      visible: visible.value,
      category: category.value,
      sort: sort.value,
    });
  } finally {
    loading.value = false;
  }
}

watch(
  filters,
  () => {
    page.value = 1;
    fetchPosts();
  },
  { deep: true }
);

watch([page, size], fetchPosts);

onMounted(fetchPosts);

function openSettings(post: MockPost) {
  selectedPost.value = post;
  settingModalVisible.value = true;
}

async function handlePublish(post: MockPost) {
  await publishPost(post.name);
  Toast.success("文章已发布（Mock）");
  fetchPosts();
}

function handleDelete(post: MockPost) {
  recyclePost(post.name).then(() => {
    Toast.success("文章已移入回收站（Mock）");
    fetchPosts();
  });
}
</script>

<template>
  <VPageHeader title="文章">
    <template #icon>
      <IconBookRead />
    </template>
    <template #actions>
      <VButton size="sm" @click="Toast.info('原型预览：分类管理未接入')">
        分类
      </VButton>
      <VButton size="sm" @click="Toast.info('原型预览：标签管理未接入')">
        标签
      </VButton>
      <VButton size="sm" @click="Toast.info('原型预览：回收站未接入')">
        回收站
      </VButton>
      <VButton
        type="secondary"
        @click="Toast.info('原型预览：文章编辑器未接入')"
      >
        <template #icon><IconAddCircle /></template>
        新建
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
              <SearchInput v-model="keyword" />
            </div>
            <VSpace spacing="lg" class="flex-wrap">
              <VFilterDropdown
                v-model="status"
                label="状态"
                show-clear-option
                clear-label="全部"
                :options="[
                  { label: '已发布', value: 'published' },
                  { label: '未发布', value: 'draft' },
                ]"
              />
              <VFilterDropdown
                v-model="visible"
                label="可见性"
                show-clear-option
                clear-label="全部"
                :options="[
                  { label: '公开', value: 'PUBLIC' },
                  { label: '内部', value: 'INTERNAL' },
                  { label: '私有', value: 'PRIVATE' },
                ]"
              />
              <VFilterDropdown
                v-model="category"
                label="分类"
                show-clear-option
                clear-label="全部"
                :options="[
                  { label: '默认分类', value: '默认分类' },
                  { label: '文档', value: '文档' },
                  { label: '公告', value: '公告' },
                ]"
              />
              <VFilterDropdown
                v-model="sort"
                label="排序"
                show-clear-option
                clear-label="默认"
                :options="[{ label: '浏览量', value: 'views' }]"
              />
            </VSpace>
          </div>
        </div>
      </template>

      <VLoading v-if="loading" class="py-10" />
      <VEmpty
        v-else-if="!result.items.length"
        title="没有匹配的文章"
        message="尝试调整筛选条件，或新建一篇文章。"
      />
      <VEntityContainer v-else>
        <VEntity
          v-for="post in result.items"
          :key="post.name"
          :is-selected="selectedPost?.name === post.name"
          @click="openSettings(post)"
        >
          <template #start>
            <VEntityField :title="post.title" :description="post.excerpt">
              <template #description>
                <div class="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  <span>{{ post.publishTime ?? "尚未发布" }}</span>
                  <span>·</span>
                  <span>{{ post.views }} 次浏览</span>
                  <span>·</span>
                  <span>{{ post.contributor }}</span>
                </div>
              </template>
            </VEntityField>
          </template>
          <template #end>
            <VEntityField>
              <template #description>
                <div class="flex items-center gap-2">
                  <VTag v-for="tag in post.tags" :key="tag">
                    {{ tag }}
                  </VTag>
                </div>
              </template>
            </VEntityField>
            <VEntityField>
              <template #description>
                <VStatusDot
                  :text="post.published ? '已发布' : '未发布'"
                  :state="post.published ? 'success' : 'default'"
                />
              </template>
            </VEntityField>
          </template>
          <template #dropdownItems>
            <VDropdownItem
              v-if="!post.published"
              @click.stop="handlePublish(post)"
            >
              发布
            </VDropdownItem>
            <VDropdownItem @click.stop="openSettings(post)">
              设置
            </VDropdownItem>
            <VDropdownItem type="danger" @click.stop="handleDelete(post)">
              删除
            </VDropdownItem>
          </template>
        </VEntity>
      </VEntityContainer>

      <template #footer>
        <VPagination
          v-model:page="page"
          v-model:size="size"
          :total="result.total"
          :size-options="[5, 10, 20]"
          total-label="篇文章"
        />
      </template>
    </VCard>
  </div>

  <VModal
    v-if="settingModalVisible"
    :visible="settingModalVisible"
    title="文章设置"
    :width="520"
    @close="settingModalVisible = false"
  >
    <div v-if="selectedPost" class="flex flex-col gap-4 text-sm">
      <div class="font-semibold">{{ selectedPost.title }}</div>
      <div class="text-xs text-gray-500">
        此弹层用于验证 VModal 的宿主接入；表单校验等业务能力尚未迁入。
      </div>
      <div class="flex flex-col gap-1">
        <span class="font-medium">别名</span>
        <input
          :value="selectedPost.slug"
          class="h-9 rounded border-gray-300 text-sm focus:border-primary focus:ring-primary"
        />
      </div>
      <div class="flex flex-col gap-1">
        <span class="font-medium">可见性</span>
        <select
          :value="selectedPost.visible"
          class="h-9 rounded border-gray-300 text-sm focus:border-primary focus:ring-primary"
        >
          <option value="PUBLIC">公开</option>
          <option value="INTERNAL">内部</option>
          <option value="PRIVATE">私有</option>
        </select>
      </div>
    </div>
    <template #footer>
      <VSpace>
        <VButton @click="settingModalVisible = false">关闭</VButton>
        <VButton
          type="secondary"
          @click="
            settingModalVisible = false;
            Toast.success('预览：设置已保存（未持久化）');
          "
        >
          保存
        </VButton>
      </VSpace>
    </template>
  </VModal>
</template>
