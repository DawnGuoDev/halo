<script lang="ts" setup>
import {
  Dialog,
  IconCheckboxCircle,
  IconForbidLine,
  Toast,
  VButton,
  VDescription,
  VDescriptionItem,
  VLoading,
  VSpace,
  VStatusDot,
} from "@halo-dev/components";
import VModal from "@/components/halo/modal/Modal.vue";
import { onMounted, ref } from "vue";
import { t } from "@/i18n";
import {
  approveComment,
  getCommentDetail,
  rejectComment,
  type CommentDetail,
} from "@/mock/operational";
import { formatDateTime } from "@/utils/datetime";

// 待审核评论详情抽屉：完整纯文本内容、评论人、所属文章、提交时间；
// 通过 → 成功提示并关闭；驳回 → 二次确认后关闭；已被处理 → 提示并关闭。
const props = defineProps<{ commentName: string; canManage: boolean }>();
const emit = defineEmits<{
  (e: "close"): void;
  (e: "processed", payload: { result: "approved" | "rejected" | "stale" }): void;
}>();

const visible = ref(true);
const loading = ref(true);
const submitting = ref(false);
const detail = ref<CommentDetail>();

onMounted(async () => {
  try {
    detail.value = await getCommentDetail(props.commentName);
  } finally {
    loading.value = false;
  }
});

function close() {
  visible.value = false;
  emit("close");
}

async function handleApprove() {
  if (!detail.value || submitting.value) return;
  submitting.value = true;
  try {
    const { ok } = await approveComment(detail.value.name);
    if (!ok) {
      Toast.warning(t("core.operations.comment.stale"));
      emit("processed", { result: "stale" });
    } else {
      Toast.success(t("core.operations.comment.approve_success"));
      emit("processed", { result: "approved" });
    }
  } finally {
    submitting.value = false;
    close();
  }
}

function handleReject() {
  if (!detail.value || submitting.value) return;
  Dialog.warning({
    title: t("core.operations.comment.reject_dialog_title"),
    description: t("core.operations.comment.reject_dialog_description"),
    confirmType: "danger",
    confirmText: t("core.operations.comment.reject_dialog_confirm"),
    cancelText: t("core.common.buttons.cancel"),
    onConfirm: async () => {
      submitting.value = true;
      try {
        const { ok } = await rejectComment(detail.value!.name);
        if (!ok) {
          Toast.warning(t("core.operations.comment.stale"));
          emit("processed", { result: "stale" });
        } else {
          Toast.success(t("core.operations.comment.reject_success"));
          emit("processed", { result: "rejected" });
        }
      } finally {
        submitting.value = false;
        close();
      }
    },
  });
}
</script>

<template>
  <VModal
    v-model:visible="visible"
    :title="t('core.operations.comment.title')"
    :width="600"
    @close="emit('close')"
  >
    <div data-testid="comment-review-drawer">
      <VLoading v-if="loading" />
      <template v-else-if="detail">
        <VDescription>
          <VDescriptionItem :label="t('core.operations.comment.fields.author')">
            {{ detail.author }}
            <span class="ml-1 text-xs text-gray-400">{{ detail.authorEmail }}</span>
          </VDescriptionItem>
          <VDescriptionItem :label="t('core.operations.comment.fields.subject')">
            {{ detail.articleTitle }}
          </VDescriptionItem>
          <VDescriptionItem :label="t('core.operations.comment.fields.submit_time')">
            {{ formatDateTime(detail.submittedAt) }}
          </VDescriptionItem>
          <VDescriptionItem :label="t('core.operations.comment.fields.status')">
            <VStatusDot
              :state="detail.approved ? 'success' : 'warning'"
              :text="
                  detail.approved
                    ? t('core.operations.comment.status.approved')
                    : t('core.operations.comment.status.pending')
                "
            />
          </VDescriptionItem>
        </VDescription>
        <div class="mt-4">
          <div class="mb-1.5 text-xs text-gray-500">
            {{ t("core.operations.comment.fields.content") }}
          </div>
          <!-- 纯文本展示：不解析 HTML，保留换行 -->
          <div
            class="max-h-72 overflow-y-auto whitespace-pre-wrap break-words rounded border border-gray-100 bg-gray-50 p-3 text-sm text-gray-900"
            data-testid="comment-content"
          >{{ detail.content }}</div>
        </div>

        <div v-if="detail.history.length" class="mt-5">
          <div class="mb-2 text-sm font-medium text-gray-900">
            {{ t("core.operations.comment.fields.history") }}
          </div>
          <ul class="divide-y divide-gray-100 rounded border border-gray-100">
            <li
              v-for="item in detail.history"
              :key="item.name"
              class="px-3 py-2"
            >
              <div class="flex items-center justify-between text-xs text-gray-500">
                <span class="font-medium text-gray-700">{{ item.author }}</span>
                <span>{{ formatDateTime(item.submittedAt) }}</span>
              </div>
              <p class="mt-1 line-clamp-2 text-sm text-gray-600">
                {{ item.content }}
              </p>
            </li>
          </ul>
        </div>
      </template>
    </div>

    <template #footer>
      <VSpace>
        <VButton data-testid="comment-close" @click="close">
          {{ t("core.operations.comment.close") }}
        </VButton>
        <template v-if="canManage && detail">
          <VButton
            type="danger"
            :disabled="submitting"
            data-testid="comment-reject"
            @click="handleReject"
          >
            <template #icon><IconForbidLine /></template>
            {{ t("core.operations.comment.reject") }}
          </VButton>
          <VButton
            type="primary"
            :loading="submitting"
            data-testid="comment-approve"
            @click="handleApprove"
          >
            <template #icon><IconCheckboxCircle /></template>
            {{ t("core.operations.comment.approve") }}
          </VButton>
        </template>
      </VSpace>
    </template>
  </VModal>
</template>
