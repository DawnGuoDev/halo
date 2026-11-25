<script lang="ts" setup>
import {
  IconClose,
  IconRiPencilFill as IconEdit,
  VButton,
  VModal,
  VSpace,
  VStatusDot,
  VTag,
} from "@halo-dev/components";
import { computed, onMounted, ref, watch } from "vue";
import { t } from "@/i18n";
import { usePostCategory, useAllPostTagsQuery } from "@/composables/use-resource-queries";
import type { MockPost } from "@/types";

// 参考业务仓库 ui/console-src/modules/contents/posts/PostList.vue 的弹层用法与
// entity-fields 的状态字段；抽屉复用 @halo-dev/components 的 VModal 能力
// （右对齐布局 + 既有 Esc/关闭/焦点陷阱），不另写弹层。
const props = withDefaults(
  defineProps<{
    post?: MockPost;
  }>(),
  { post: undefined }
);

const emit = defineEmits<{
  (event: "close"): void;
  (event: "edit", post: MockPost): void;
}>();

// 原型适配：npm 包 @halo-dev/components@2.27.0 的 Modal 在未传 visible 时不会自展开
// （业务仓库 2.28.0 源码为 ref(false)→onMounted 置 true），因此显式传入可见状态，
// 由抽屉自身状态驱动：打开时置 true，Modal 关闭（关闭按钮/Esc）后置 false 并通知列表。
// 每次打开都先以隐藏态挂载，再由 onMounted 置为可见：
// npm 包 2.27.0 的 Modal 对 mounted 时已为 true 的 visible 不会执行进入过渡（内部
// rootVisible 只由过渡钩子置位，保持 noscript 样式 display:none）。
const drawerVisible = ref(false);
onMounted(() => {
  drawerVisible.value = true;
});
onMounted(() => {
  drawerVisible.value = true;
});

function onModalVisible(visible: boolean) {
  if (visible) return;
  drawerVisible.value = false;
  emit("close");
}

const { categories } = usePostCategory();
const { data: allTags } = useAllPostTagsQuery();
// 字典由 usePostCategory 在挂载时加载；此处不额外请求，避免列表请求与浮层交互互相影响

// 每次切换文章都从当前 post 重新派生，不使用跨次保留的中间状态
const title = computed(() => props.post?.title || "");

const status = computed(() => {
  const post = props.post;
  if (!post) return { text: "", state: "default" as const, publishing: false };
  if (post.scheduling)
    return {
      text: t("core.post.quick_view.status.scheduling"),
      state: "warning" as const,
      publishing: false,
    };
  // 发布进行中：与列表 PublishStatusField 口径一致
  if (post.publicizing)
    return {
      text: t("core.common.tooltips.publishing"),
      state: "warning" as const,
      publishing: true,
    };
  if (!post.published)
    return {
      text: t("core.post.quick_view.status.draft"),
      state: "default" as const,
      publishing: false,
    };
  return {
    text: t("core.post.filters.status.items.published"),
    state: "success" as const,
    publishing: false,
  };
});

const visibleText = computed(() => {
  if (!props.post) return "";
  return props.post.visible === "PRIVATE"
    ? t("core.post.filters.visible.items.private")
    : t("core.post.filters.visible.items.public");
});

const categoryNames = computed(() =>
  (props.post?.categories || []).map((name) =>
    categories.value.find((category) => category.name === name)?.displayName ||
    name
  )
);

const tagNames = computed(() => {
  const post = props.post;
  if (!post) return { names: [] as string[], colors: {} as Record<string, string> };
  const names: string[] = [];
  const colors: Record<string, string> = {};
  post.tags.forEach((name) => {
    const tag = allTags.value.find((item) => item.name === name);
    const displayName = tag?.displayName || name;
    names.push(displayName);
    if (tag?.color) colors[displayName] = tag.color;
  });
  return { names, colors };
});

const hasPublishTime = computed(() => !!props.post?.publishTime);

// 关闭：同步自身可见状态（不等 Modal 的 200ms 动画回执）并通知列表；
// 关闭按钮与 Esc 都经过此函数，保证“内容立即消失、列表不被遮罩拦截”。
function handleClose() {
  drawerVisible.value = false;
  emit("close");
}

function handleEdit() {
  if (!props.post) return;
  // 先关闭抽屉再跳转，返回列表时抽屉保持关闭
  drawerVisible.value = false;
  emit("edit", props.post);
}
</script>

<template>
  <div data-testid="quick-view-drawer-holder">
  <VModal
    v-if="drawerVisible || !!post"
            :visible="drawerVisible"
    @update:visible="onModalVisible"
    :width="420"
    :layer-closable="true"
    height="100%"
    :centered="false"
    class="quick-view-drawer"
    data-testid="quick-view-drawer"
    @close="handleClose"
  >
    <!-- 使用 VModal 默认头部（标题 + 关闭按钮），关闭按钮与 Esc 行为沿用组件实现 -->
    <template #header>
      <div class="modal-header-title">
        {{ t("core.post.quick_view.title") }}
      </div>
      <div class="modal-header-actions">
        <span
          aria-label="Close"
          class="bg-gray-50"
          data-testid="quick-view-close"
          role="button"
          tabindex="0"
          @click="handleClose"
          @keydown.enter.prevent="handleClose"
          @keydown.space.prevent="handleClose"
        >
          <IconClose aria-hidden="true" />
        </span>
      </div>
    </template>

    <div class="quick-view-drawer__body flex h-full flex-col">
      <h2
        data-testid="quick-view-post-title"
        class="text-lg font-semibold leading-7 text-gray-900"
      >
        {{ title }}
      </h2>

      <dl class="quick-view-drawer__fields mt-6 flex flex-col gap-5 text-sm">
        <div class="flex flex-col gap-1" data-testid="quick-view-status">
          <dt class="text-xs text-gray-500">
            {{ t("core.common.filters.labels.status") }}
          </dt>
          <dd>
            <VStatusDot
              :text="status.publishing ? t('core.common.tooltips.publishing') : status.text"
              :state="status.publishing ? 'warning' : status.state"
              :animate="status.publishing"
            />
          </dd>
        </div>

        <div class="flex flex-col gap-1" data-testid="quick-view-visible">
          <dt class="text-xs text-gray-500">
            {{ t("core.post.quick_view.fields.visible") }}
          </dt>
          <dd class="flex flex-wrap items-center gap-2">
            <span
              class="inline-flex items-center gap-1.5"
              :data-testid="`quick-view-visible-value`"
            >
              <svg
                v-if="post?.visible === 'PUBLIC'"
                viewBox="0 0 24 24"
                class="h-4 w-4 text-gray-600"
                aria-hidden="true"
              >
                <path
                  fill="currentColor"
                  d="M12 5c-5 0-9 4.5-10 7 1 2.5 5 7 10 7s9-4.5 10-7c-1-2.5-5-7-10-7Zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm0-2a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"
                />
              </svg>
              <svg
                v-else
                viewBox="0 0 24 24"
                class="h-4 w-4 text-gray-600"
                aria-hidden="true"
              >
                <path
                  fill="currentColor"
                  d="M2.3 2.3a1 1 0 0 0 0 1.4l18 18a1 1 0 0 0 1.4-1.4l-3-3C20.1 16.4 21.6 14.7 22 12c-1-2.5-5-7-10-7-1.6 0-3.1.5-4.4 1.2L3.7 2.3a1 1 0 0 0-1.4 0ZM12 7a5 5 0 0 1 5 5c0 .8-.2 1.6-.6 2.3l-1.6-1.6a3 3 0 0 0-4-4L9.2 7.1A5 5 0 0 1 12 7Zm-9.9 5c.4 1 1.1 2.1 2.2 3.1l1.5-1.5A9.4 9.4 0 0 1 4.1 12 15 15 0 0 1 6.2 9L4.8 7.6C3.2 9 2.3 10.6 2 12Z"
                />
              </svg>
              <span>{{ visibleText }}</span>
            </span>
          </dd>
        </div>

        <div class="flex flex-col gap-1.5" data-testid="quick-view-categories">
          <dt class="text-xs text-gray-500">
            {{ t("core.post.filters.category.label") }}
          </dt>
          <dd class="flex flex-wrap gap-1.5">
            <template v-if="categoryNames.length">
              <VTag v-for="name in categoryNames" :key="name">
                {{ name }}
              </VTag>
            </template>
            <span v-else data-testid="quick-view-categories-empty" class="text-gray-400">
              {{ t("core.post.quick_view.empty.categories") }}
            </span>
          </dd>
        </div>

        <div class="flex flex-col gap-1.5" data-testid="quick-view-tags">
          <dt class="text-xs text-gray-500">
            {{ t("core.post.filters.tag.label") }}
          </dt>
          <dd class="flex flex-wrap gap-1.5">
            <template v-if="tagNames.names.length">
              <VTag
                v-for="name in tagNames.names"
                :key="name"
                :theme="tagNames.colors[name] ? undefined : 'default'"
              >
                <span
                  v-if="tagNames.colors[name]"
                  class="mr-1 inline-block h-2 w-2 rounded-full"
                  :style="{ backgroundColor: tagNames.colors[name] }"
                ></span>
                {{ name }}
              </VTag>
            </template>
            <span v-else data-testid="quick-view-tags-empty" class="text-gray-400">
              {{ t("core.post.quick_view.empty.tags") }}
            </span>
          </dd>
        </div>

        <div class="flex flex-col gap-1" data-testid="quick-view-publish-time">
          <dt class="text-xs text-gray-500">
            {{ t("core.post.quick_view.fields.publish_time") }}
          </dt>
          <dd>
            <span v-if="hasPublishTime" class="text-gray-900">{{ post?.publishTime }}</span>
            <span v-else class="text-gray-400" data-testid="quick-view-publish-time-empty">
              {{ t("core.post.quick_view.empty.publish_time") }}
            </span>
          </dd>
        </div>

        <div class="flex flex-col gap-1" data-testid="quick-view-update-time">
          <dt class="text-xs text-gray-500">
            {{ t("core.post.quick_view.fields.update_time") }}
          </dt>
          <dd class="text-gray-900">{{ post?.updateTime }}</dd>
        </div>
      </dl>
    </div>

    <template #footer>
      <VSpace class="w-full justify-end">
        <VButton
          type="secondary"
          data-testid="quick-view-edit"
          @click="handleEdit"
        >
          <template #icon><IconEdit /></template>
          {{ t("core.post.quick_view.edit") }}
        </VButton>
      </VSpace>
    </template>
  </VModal>
  </div>
</template>
