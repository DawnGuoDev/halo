<script lang="ts" setup>
import {
  IconArrowLeft,
  IconBookRead,
  VButton,
  VCard,
  VPageHeader,
} from "@halo-dev/components";
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useLastEditTarget } from "@/composables/use-post-edit";
import { t } from "@/i18n";
import { getPost } from "@/mock";

// 原型占位页：真实业务的「文章编辑器」（/posts/:name/edit 等价路由，name: PostEditor）未纳入
// 独立工程。本页只用于验证「抽屉 → 编辑文章 → 返回列表」的跳转与筛选恢复行为。
const route = useRoute();
const router = useRouter();
const lastEditTarget = useLastEditTarget();

const postName = computed(
  () => (route.query.name as string) || lastEditTarget.value || ""
);
const post = computed(() => getPost(postName.value));

function handleBack() {
  // 返回列表：仅恢复原 query（筛选、页码），抽屉状态只存在于列表页本地状态
  const back = (route.query.back as string) || "/posts";
  router.push({ path: back.split("?")[0], query: Object.fromEntries(new URLSearchParams(back.split("?")[1] || "")) });
}
</script>

<template>
  <VPageHeader :title="t('core.post.editor.title')">
    <template #icon><IconBookRead /></template>
    <template #actions>
      <VButton data-testid="editor-back" @click="handleBack">
        {{ t("core.common.buttons.back") }}
      </VButton>
    </template>
  </VPageHeader>
  <div class="m-0 md:m-4">
    <VCard data-testid="post-editor-placeholder">
      <div class="flex flex-col gap-3 text-sm">
        <div class="text-xs text-gray-500">
          {{ t("core.post.editor.placeholder") }}
        </div>
        <div class="text-base font-semibold" data-testid="editor-post-title">
          {{ post?.title || postName || "—" }}
        </div>
        <div class="text-xs text-gray-500">
          name: <code>{{ postName || "—" }}</code>
        </div>
        <div class="flex items-center gap-2 text-xs text-gray-500">
          <IconArrowLeft class="h-4 w-4" />
          {{ t("core.post.editor.back_hint") }}
        </div>
      </div>
    </VCard>
  </div>
</template>
