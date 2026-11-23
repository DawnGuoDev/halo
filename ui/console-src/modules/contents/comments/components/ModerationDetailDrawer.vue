<script lang="ts" setup>
import {
  IconArrowRight,
  IconExternalLinkLine,
  VButton,
  VModal,
} from "@halo-dev/components";
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import CommentStatusTag from "../preview/CommentStatusTag.vue";
import type { PreviewComment } from "../preview/mock-data";
import type { ModerationItemView } from "../preview/use-comment-moderation";
import CommentEditor from "./CommentEditor.vue";
import DefaultCommentContent from "./DefaultCommentContent.vue";

const props = defineProps<{
  item: ModerationItemView;
  detail: PreviewComment | undefined;
  processing?: boolean;
  /** Count of remaining pending comments in the current filter, excluding this one. */
  remainingPending: number;
  canManage?: boolean;
}>();

const { t } = useI18n();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "approve"): void;
  (e: "reject"): void;
  (e: "restore"): void;
  (e: "cancel-approve"): void;
  (e: "approve-reply", replyName: string): void;
  (e: "next"): void;
  (e: "view-all-pending"): void;
}>();

const creationTime = computed(
  () =>
    props.item.listed.comment.spec.creationTime ??
    props.item.listed.comment.metadata.creationTimestamp ??
    ""
);

const subjectTitle = computed(() => {
  if (props.item.subjectMissing === "deleted") {
    return "所属内容已删除";
  }
  if (props.item.subjectMissing === "inaccessible") {
    return "所属内容无法访问";
  }
  return (
    (props.item.listed.subject as { spec?: { title?: string } } | undefined)
      ?.spec?.title ?? t("core.comment.subject_refs.unknown")
  );
});

const pendingReplies = computed(
  () =>
    props.detail?.replies.filter((reply) => reply.status === "pending") ?? []
);

const approvedReplies = computed(
  () =>
    props.detail?.replies.filter((reply) => reply.status === "approved") ?? []
);

function formatTime(value: string) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
</script>

<template>
  <VModal
    :title="`评论详情`"
    :width="760"
    :body-class="['!p-0']"
    mount-to-body
    :centered="false"
    @close="emit('close')"
  >
    <div
      class="max-h-[70vh] overflow-y-auto px-5 py-4"
      data-testid="detail-drawer"
    >
      <div class="mb-3 flex flex-wrap items-center gap-2">
        <CommentStatusTag :status="item.status" />
        <span class="text-xs text-gray-400"
          >评论时间：{{ formatTime(creationTime) }}</span
        >
      </div>

      <dl class="grid grid-cols-1 gap-3 text-sm">
        <div class="flex gap-3">
          <dt class="w-16 shrink-0 text-gray-500">评论人</dt>
          <dd class="min-w-0 text-gray-900">
            <div class="font-medium">
              {{
                item.listed.owner.displayName ||
                item.listed.comment.spec.owner.name
              }}
            </div>
            <div class="break-all text-xs text-gray-500">
              {{ item.listed.comment.spec.owner.name }}
              <span v-if="item.listed.comment.spec.owner.kind === 'Email'"
                >（邮箱）</span
              >
            </div>
          </dd>
        </div>
        <div class="flex gap-3">
          <dt class="w-16 shrink-0 text-gray-500">所属内容</dt>
          <dd class="min-w-0 text-gray-900">
            <div class="flex flex-wrap items-center gap-2">
              <span class="rounded bg-gray-100 px-1.5 py-0.5 text-xs">
                {{
                  item.subjectKind === "post"
                    ? "文章"
                    : item.subjectKind === "single-page"
                      ? "独立页面"
                      : "内容"
                }}
              </span>
              <span :class="{ 'text-gray-500': item.subjectMissing }">{{
                subjectTitle
              }}</span>
              <a
                v-if="!item.subjectMissing && item.listed.permalink"
                :href="item.listed.permalink"
                target="_blank"
                rel="noopener noreferrer"
                class="text-gray-400 hover:text-gray-700"
              >
                <IconExternalLinkLine class="h-3.5 w-3.5" />
              </a>
            </div>
            <p v-if="item.subjectMissing" class="mt-1 text-xs text-gray-500">
              该评论仍保留在审核队列中，不影响审核操作。
            </p>
          </dd>
        </div>

        <div v-if="detail?.parent" class="flex gap-3">
          <dt class="w-16 shrink-0 text-gray-500">父评论</dt>
          <dd class="min-w-0 rounded-lg bg-gray-50 px-3 py-2 text-gray-700">
            <div class="mb-1 text-xs font-medium text-gray-500">
              {{ detail.parent.author }}
            </div>
            <div class="whitespace-pre-wrap text-sm">
              {{ detail.parent.raw }}
            </div>
          </dd>
        </div>

        <div class="flex gap-3">
          <dt class="w-16 shrink-0 text-gray-500">评论内容</dt>
          <dd class="min-w-0 flex-1">
            <DefaultCommentContent
              :content="item.listed.comment.spec.content"
            />
          </dd>
        </div>

        <div v-if="detail?.replies.length" class="flex gap-3">
          <dt class="w-16 shrink-0 text-gray-500">回复</dt>
          <dd class="min-w-0 flex-1 space-y-2">
            <div
              v-for="reply in detail.replies"
              :key="reply.listed.reply.metadata.name"
              class="rounded-lg border border-gray-100 px-3 py-2"
              :data-reply-name="reply.listed.reply.metadata.name"
            >
              <div class="mb-1 flex items-center justify-between gap-2">
                <span class="text-xs font-medium text-gray-700">
                  {{ reply.listed.owner.displayName }}
                </span>
                <div class="flex items-center gap-2">
                  <CommentStatusTag :status="reply.status" />
                  <VButton
                    v-if="reply.status === 'pending' && canManage"
                    size="sm"
                    type="secondary"
                    @click="
                      emit('approve-reply', reply.listed.reply.metadata.name)
                    "
                  >
                    通过回复
                  </VButton>
                </div>
              </div>
              <div class="whitespace-pre-wrap text-sm text-gray-700">
                {{ reply.listed.reply.spec.raw }}
              </div>
            </div>
            <p
              v-if="!pendingReplies.length && approvedReplies.length"
              class="text-xs text-gray-500"
            >
              该评论下的回复均已处理。
            </p>
          </dd>
        </div>

        <div v-if="item.status === 'pending' && canManage" class="flex gap-3">
          <dt class="w-16 shrink-0 text-gray-500">快速回复</dt>
          <dd
            class="min-w-0 flex-1 rounded-lg border border-dashed border-gray-200 px-3 py-2"
          >
            <CommentEditor />
            <p class="mt-1 text-xs text-gray-500">
              本次原型不演示回复编辑，正式接入后沿用现有编辑器。
            </p>
          </dd>
        </div>
      </dl>
    </div>

    <template #footer>
      <div class="flex w-full flex-wrap items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <template v-if="canManage">
            <template v-if="item.status === 'pending'">
              <VButton
                type="secondary"
                :disabled="processing"
                data-testid="detail-approve"
                @click="emit('approve')"
              >
                {{ processing ? "处理中…" : "通过" }}
              </VButton>
              <VButton
                type="danger"
                :disabled="processing"
                data-testid="detail-reject"
                @click="emit('reject')"
              >
                驳回
              </VButton>
            </template>
            <VButton
              v-else-if="item.status === 'rejected'"
              type="default"
              data-testid="detail-restore"
              @click="emit('restore')"
            >
              撤销驳回
            </VButton>
            <VButton
              v-else
              type="default"
              data-testid="detail-cancel-approve"
              @click="emit('cancel-approve')"
            >
              取消通过
            </VButton>
          </template>
          <VButton type="default" @click="emit('close')">关闭</VButton>
        </div>
        <div class="flex items-center gap-2" data-testid="detail-next">
          <template v-if="remainingPending > 0">
            <span class="text-xs text-gray-500" data-testid="remaining-pending"
              >还有 {{ remainingPending }} 条待审核</span
            >
            <VButton type="primary" data-testid="go-next" @click="emit('next')">
              下一条待审核
              <IconArrowRight class="ml-1 inline h-3.5 w-3.5" />
            </VButton>
          </template>
          <template v-else>
            <span class="text-xs text-gray-500" data-testid="all-processed">
              当前筛选条件下的待审核评论已处理完毕
            </span>
            <VButton type="default" @click="emit('view-all-pending')"
              >查看全部待审核</VButton
            >
          </template>
        </div>
      </div>
    </template>
  </VModal>
</template>
