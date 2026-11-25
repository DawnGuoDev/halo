<script lang="ts" setup>
import {
  IconExternalLinkLine,
  VButton,
  VDescription,
  VDescriptionItem,
  VEmpty,
  VLoading,
  VStatusDot,
} from "@halo-dev/components";
import VModal from "@/components/halo/modal/Modal.vue";
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { t } from "@/i18n";
import { getArticleSummary, type ArticleInteractionSummary } from "@/mock/operational";
import { formatDateTime } from "@/utils/datetime";

// 互动摘要抽屉（只读）：标题、发布时间、评论总数与审核状态、该文最近 5 条一级评论。
// 参考 ui/console-src/modules/contents/comments/components/CommentDetailModal.vue 的 VModal 抽屉形态。
const props = defineProps<{ articleName: string; title: string }>();
const emit = defineEmits<{ (e: "close"): void }>();

const router = useRouter();
const visible = ref(true);
const loading = ref(true);
const summary = ref<ArticleInteractionSummary>();

onMounted(async () => {
  try {
    summary.value = await getArticleSummary(props.articleName);
  } finally {
    loading.value = false;
  }
});

function close() {
  visible.value = false;
  emit("close");
}

function goToPosts() {
  close();
  router.push("/posts");
}
</script>

<template>
  <VModal
    v-model:visible="visible"
    :title="`${t('core.operations.summary.title')} · ${title}`"
    :width="640"
    @close="emit('close')"
  >
    <div data-testid="article-summary-drawer">
      <VLoading v-if="loading" />
      <template v-else-if="summary">
        <VDescription>
          <VDescriptionItem :label="t('core.operations.summary.fields.title')">
            <span class="break-all">{{ summary.title }}</span>
          </VDescriptionItem>
          <VDescriptionItem :label="t('core.operations.summary.fields.publish_time')">
            {{ formatDateTime(summary.publishTime) }}
          </VDescriptionItem>
          <VDescriptionItem :label="t('core.operations.summary.total')">
            <span class="font-medium text-gray-900" data-testid="summary-total">
              {{ summary.totalComments }}
            </span>
            <span class="ml-2 text-xs text-gray-500">
              {{ t("core.operations.summary.approved") }}
              {{ summary.approvedComments }} ·
              {{ t("core.operations.summary.unapproved") }}
              {{ summary.pendingComments }}
            </span>
          </VDescriptionItem>
        </VDescription>

        <div class="mt-5">
          <div class="mb-2 text-sm font-medium text-gray-900">
            {{ t("core.operations.summary.recent") }}
          </div>
          <VEmpty
            v-if="!summary.recentComments.length"
            :title="t('core.operations.summary.recent_empty')"
            :message="t('core.operations.summary.recent_empty_message')"
          />
          <ul v-else class="divide-y divide-gray-100 rounded border border-gray-100">
            <li
              v-for="comment in summary.recentComments"
              :key="comment.name"
              class="px-3 py-2.5"
              data-testid="summary-comment-item"
            >
              <div class="flex flex-wrap items-center justify-between gap-2">
                <span class="text-sm font-medium text-gray-900">
                  {{ comment.author }}
                </span>
                <span class="flex items-center gap-3 text-xs text-gray-500">
                  <VStatusDot
                    :state="comment.approved ? 'success' : 'warning'"
                    :text="
                      comment.approved
                        ? t('core.operations.comment.status.approved')
                        : t('core.operations.summary.unapproved')
                    "
                  />
                  <span>{{ formatDateTime(comment.submittedAt) }}</span>
                </span>
              </div>
              <p class="mt-1 whitespace-pre-wrap break-words text-sm text-gray-600">
                {{ comment.content }}
              </p>
            </li>
          </ul>
        </div>
      </template>
      <VEmpty
        v-else
        :title="t('core.operations.summary.not_found')"
        :message="t('core.operations.summary.not_found_message')"
      />
    </div>

    <template #footer>
      <div class="flex w-full items-center justify-between">
        <button
          type="button"
          class="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
          data-testid="summary-back-to-posts"
          @click="goToPosts"
        >
          {{ t("core.operations.summary.back_to_posts") }}
          <IconExternalLinkLine class="h-3.5 w-3.5" />
        </button>
        <VButton data-testid="summary-close" @click="close">
          {{ t("core.operations.comment.close") }}
        </VButton>
      </div>
    </template>
  </VModal>
</template>
