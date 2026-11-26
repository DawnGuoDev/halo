<script lang="ts" setup>
import {
  IconRiPencilFill as IconEdit,
  VButton,
  VModal,
  VSpace,
  VStatusDot,
  VTag,
} from "@halo-dev/components";
import { computed, onMounted, ref } from "vue";
import { t } from "@/i18n";
import { usePostCategory, useAllPostTagsQuery } from "@/composables/use-resource-queries";
import type { MockPost } from "@/types";

// 参考业务仓库 ui/console-src/modules/contents/posts/PostList.vue 的弹层用法与
// entity-fields 的状态字段；抽屉复用 @halo-dev/components 的 VModal 能力
// （遮罩、Esc、焦点陷阱与焦点恢复），仅通过局部样式改为右侧全高面板，不另写弹层。
// 生命周期约定：列表仅在「正在查看」时渲染本组件（v-if），关闭即卸载；
// 每次打开都是新的实例，内容完全由当前 post 派生，不可能残留上一篇的标题/分类/标签/时间。
const props = defineProps<{
  post: MockPost;
}>();

const emit = defineEmits<{
  (event: "close"): void;
  (event: "edit", post: MockPost): void;
}>();

// 原型适配：npm 包 @halo-dev/components@2.27.0 的 Modal 在挂载时 visible 已为 true
// 不会播放进入过渡（内部 rootVisible 只由过渡钩子置位），因此先以隐藏态挂载，
// onMounted 再置为可见，与业务仓库 2.28.0 源码的写法一致。
const visible = ref(false);
onMounted(() => {
  visible.value = true;
});

const { categories } = usePostCategory();
const { data: allTags } = useAllPostTagsQuery();

const title = computed(() => props.post.title);

const status = computed(() => {
  const post = props.post;
  if (post.scheduling)
    return {
      text: t("core.post.quick_view.status.scheduling"),
      state: "warning" as const,
      publishing: false,
    };
  // 发布进行中：与列表 PublishStatusField 口径一致（spec.publish 为 true 但 published /
  // scheduling 标签尚未就绪），带同名提示并显示动画点。
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

/**
 * 可见性只读文案：PUBLIC 公开 / INTERNAL 内部 / PRIVATE 私有。
 * INTERNAL 文案仅速览使用，不改动列表筛选（列表筛选沿用现有两值）。
 */
const visibleText = computed(() => {
  switch (props.post.visible) {
    case "INTERNAL":
      return t("core.post.quick_view.visible.internal");
    case "PRIVATE":
      return t("core.post.filters.visible.items.private");
    default:
      return t("core.post.filters.visible.items.public");
  }
});

const categoryNames = computed(() =>
  (props.post.categories || []).map(
    (name) =>
      categories.value.find((category) => category.name === name)?.displayName ||
      name
  )
);

const tagNames = computed(() => {
  const post = props.post;
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

const hasPublishTime = computed(() => !!props.post.publishTime);

// 关闭：同步自身可见状态并通知列表卸载本组件；不等 Modal 的 100ms 退出动画，
// 保证列表立即恢复可交互。关闭按钮与 Esc（Modal 内部调用 close）都走这里。
function handleClose() {
  visible.value = false;
  emit("close");
}

// Esc：组件对 Esc 的默认处理会在 200ms 后 emit close；若此时用户已点了下一篇，
// 该延迟回调会作用到新的抽屉实例，表现为“点了却没有打开”。因此在抽屉层截获 Esc，
// 立即关闭并卸载，卸载时组件仍会恢复焦点（onBeforeUnmount → restoreFocus）。
function handleEscape(event: KeyboardEvent) {
  if (!visible.value) return;
  event.preventDefault();
  handleClose();
}

function handleEdit() {
  visible.value = false;
  emit("edit", props.post);
}
</script>

<template>
  <!-- 使用 VModal 默认头部（组件 2.27.0 无 title 插槽，标题经 props 渲染）：
       标题「文章速览」+ 组件自带关闭按钮；Esc 与关闭按钮均调用组件 close → @close。
       遮罩不关闭（layerClosable 默认 false），符合 PRD「仅关闭按钮或 Esc」。 -->
  <VModal
    :title="t('core.post.quick_view.title')"
    :visible="visible"
    :width="420"
    height="100%"
    :centered="false"
    class="quick-view-drawer"
    data-testid="quick-view-drawer"
    @keyup.esc.stop="handleEscape"
    @close="handleClose"
  >
    <div class="quick-view-drawer__body flex h-full flex-col">
      <h2
        data-testid="quick-view-title"
        class="quick-view-drawer__title"
      >
        {{ title }}
      </h2>

      <dl class="quick-view-drawer__fields">
        <div class="quick-view-field" data-testid="quick-view-status">
          <dt class="quick-view-field__label">
            {{ t("core.common.filters.labels.status") }}
          </dt>
          <dd>
            <VStatusDot
              :text="status.text"
              :state="status.state"
              :animate="status.publishing"
            />
          </dd>
        </div>

        <div class="quick-view-field" data-testid="quick-view-visible">
          <dt class="quick-view-field__label">
            {{ t("core.post.quick_view.fields.visible") }}
          </dt>
          <dd>
            <span data-testid="quick-view-visible-value" class="quick-view-value">
              {{ visibleText }}
            </span>
          </dd>
        </div>

        <div class="quick-view-field" data-testid="quick-view-categories">
          <dt class="quick-view-field__label">
            {{ t("core.post.filters.category.label") }}
          </dt>
          <dd class="quick-view-tags">
            <template v-if="categoryNames.length">
              <VTag v-for="name in categoryNames" :key="name">
                {{ name }}
              </VTag>
            </template>
            <span
              v-else
              data-testid="quick-view-categories-empty"
              class="quick-view-empty"
            >
              {{ t("core.post.quick_view.empty.categories") }}
            </span>
          </dd>
        </div>

        <div class="quick-view-field" data-testid="quick-view-tags">
          <dt class="quick-view-field__label">
            {{ t("core.post.filters.tag.label") }}
          </dt>
          <dd class="quick-view-tags">
            <template v-if="tagNames.names.length">
              <VTag
                v-for="name in tagNames.names"
                :key="name"
                :theme="tagNames.colors[name] ? undefined : 'default'"
              >
                <span
                  v-if="tagNames.colors[name]"
                  class="quick-view-tag-dot"
                  :style="{ backgroundColor: tagNames.colors[name] }"
                ></span>
                {{ name }}
              </VTag>
            </template>
            <span
              v-else
              data-testid="quick-view-tags-empty"
              class="quick-view-empty"
            >
              {{ t("core.post.quick_view.empty.tags") }}
            </span>
          </dd>
        </div>

        <div class="quick-view-field" data-testid="quick-view-publish-time">
          <dt class="quick-view-field__label">
            {{ t("core.post.quick_view.fields.publish_time") }}
          </dt>
          <dd>
            <span v-if="hasPublishTime" class="quick-view-value">
              {{ post.publishTime }}
            </span>
            <span
              v-else
              class="quick-view-empty"
              data-testid="quick-view-publish-time-empty"
            >
              {{ t("core.post.quick_view.empty.publish_time") }}
            </span>
          </dd>
        </div>

        <div class="quick-view-field" data-testid="quick-view-update-time">
          <dt class="quick-view-field__label">
            {{ t("core.post.quick_view.fields.update_time") }}
          </dt>
          <dd>
            <span class="quick-view-value">{{ post.updateTime }}</span>
          </dd>
        </div>
      </dl>
    </div>

    <template #footer>
      <VSpace class="w-full justify-end">
        <VButton type="default" data-testid="quick-view-edit" @click="handleEdit">
          <template #icon><IconEdit /></template>
          {{ t("core.post.quick_view.edit") }}
        </VButton>
      </VSpace>
    </template>
  </VModal>
</template>
