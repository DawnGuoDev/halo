<script lang="ts" setup>
import { IconExternalLinkLine } from "@halo-dev/components";
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import CommentStatusTag from "../preview/CommentStatusTag.vue";
import type { ModerationItemView } from "../preview/use-comment-moderation";
import CollapsibleCommentContent from "./CollapsibleCommentContent.vue";
import OwnerButton from "./OwnerButton.vue";

const props = defineProps<{
  item: ModerationItemView;
  selected?: boolean;
  processing?: boolean;
  selectable?: boolean;
}>();

const emit = defineEmits<{
  (e: "toggle", checked: boolean): void;
  (e: "open"): void;
  (e: "approve"): void;
  (e: "reject"): void;
  (e: "restore"): void;
  (e: "cancel-approve"): void;
}>();

const comment = computed(() => props.item.listed.comment);
const displayOwner = computed(
  () =>
    props.item.listed.owner.displayName ||
    props.item.listed.comment.spec.owner.displayName ||
    props.item.listed.comment.spec.owner.name
);

const { t } = useI18n();

const creationTime = computed(
  () =>
    comment.value.spec.creationTime ??
    comment.value.metadata.creationTimestamp ??
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

const subjectLabel = computed(() => {
  if (props.item.subjectKind === "post") {
    return "文章";
  }
  if (props.item.subjectKind === "single-page") {
    return "独立页面";
  }
  return "内容";
});

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
  <div
    class="group flex gap-3 border-b border-gray-100 px-4 py-4 transition-colors hover:bg-gray-50"
    :class="{ 'bg-gray-50': selected }"
    :data-comment-name="comment.metadata.name"
    :data-status="item.status"
  >
    <div v-if="selectable" class="flex items-start pt-1">
      <input
        type="checkbox"
        name="moderation-checkbox"
        :checked="selected"
        :disabled="processing"
        :aria-label="`选择 ${displayOwner} 的评论`"
        @change="emit('toggle', ($event.target as HTMLInputElement).checked)"
      />
    </div>
    <div class="min-w-0 flex-1">
      <div class="mb-1 flex flex-wrap items-center gap-2">
        <OwnerButton :owner="item.listed.owner" @click="emit('open')" />
        <span class="text-xs text-gray-400">评论在</span>
        <span class="inline-flex items-center gap-1 text-xs text-gray-600">
          <span class="rounded bg-gray-100 px-1.5 py-0.5">{{
            subjectLabel
          }}</span>
          <span class="max-w-xs truncate text-gray-900">{{
            subjectTitle
          }}</span>
          <a
            v-if="!item.subjectMissing && item.listed.permalink"
            :href="item.listed.permalink"
            target="_blank"
            rel="noopener noreferrer"
            class="text-gray-400 hover:text-gray-700"
            aria-label="在新窗口打开所属内容"
            @click.stop
          >
            <IconExternalLinkLine class="h-3.5 w-3.5" />
          </a>
        </span>
        <CommentStatusTag :status="item.status" />
        <span
          v-if="item.subjectMissing"
          class="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500"
          data-testid="subject-missing"
        >
          内容不可用
        </span>
      </div>

      <button
        type="button"
        class="block w-full cursor-pointer text-left"
        :aria-label="`查看 ${displayOwner} 的评论详情`"
        @click="emit('open')"
      >
        <CollapsibleCommentContent :content="comment.spec.content" />
      </button>

      <div class="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-500">
        <span>{{ formatTime(creationTime) }}</span>
        <span v-if="item.listed.comment.status?.replyCount">
          {{ item.listed.comment.status?.replyCount }} 条回复
        </span>
        <span
          v-if="item.listed.comment.status?.pendingReplyCount"
          class="text-amber-600"
        >
          {{ item.listed.comment.status?.pendingReplyCount }} 条待审核回复
        </span>
      </div>
    </div>

    <div class="flex shrink-0 flex-wrap items-start justify-end gap-2">
      <template v-if="item.status === 'pending'">
        <button
          type="button"
          class="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="processing"
          data-testid="row-approve"
          @click="emit('approve')"
        >
          {{ processing ? "处理中…" : "通过" }}
        </button>
        <button
          type="button"
          class="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="processing"
          data-testid="row-reject"
          @click="emit('reject')"
        >
          驳回
        </button>
      </template>
      <button
        v-else-if="item.status === 'rejected'"
        type="button"
        class="rounded-md border border-gray-200 px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-100"
        data-testid="row-restore"
        @click="emit('restore')"
      >
        撤销驳回
      </button>
      <button
        v-else
        type="button"
        class="rounded-md border border-gray-200 px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-100"
        data-testid="row-cancel-approve"
        @click="emit('cancel-approve')"
      >
        取消通过
      </button>
    </div>
  </div>
</template>
