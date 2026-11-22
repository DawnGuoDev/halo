<script setup lang="ts">
import {
  IconArrowRight,
  IconCheck,
  IconClose,
  IconExternalLinkLine,
  IconForbidLine,
  VButton,
  VLoading,
  VSpace,
  VTag,
} from "@halo-dev/components";
import { computed, nextTick, onMounted, ref, useTemplateRef, watch } from "vue";
import {
  AUDIT_STATUS_LABEL,
  getAuditStatus,
} from "../composables/comment-service";
import type { ListedComment, ListedReply } from "../types";
import StatusTag from "./StatusTag.vue";

const props = defineProps<{
  comment: ListedComment;
  replies: ListedReply[];
  repliesLoading?: boolean;
  canManage: boolean;
  busy?: boolean;
  subjectLabel: string;
  subjectTitle: string;
  subjectAvailable: boolean;
  hasNextPending: boolean;
  nextPendingLabel?: string;
}>();

const emit = defineEmits<{
  (event: "close"): void;
  (event: "approve"): void;
  (event: "reject"): void;
  (event: "next"): void;
  (event: "back-to-list"): void;
}>();

const drawer = useTemplateRef<HTMLElement>("drawer");
const closeButton = ref<HTMLButtonElement>();

const status = computed(() => getAuditStatus(props.comment));
const isPending = computed(() => status.value === "pending");
const creationTime = computed(
  () =>
    props.comment.comment.spec.creationTime ||
    props.comment.comment.metadata.creationTimestamp
);
const formattedTime = computed(() =>
  creationTime.value
    ? new Date(creationTime.value).toLocaleString("zh-CN", { hour12: false })
    : "-"
);
const website = computed(
  () => props.comment.comment.spec.owner?.annotations?.website
);
const pendingReplies = computed(() =>
  props.replies.filter((item) => !item.reply.spec.approved)
);
const replyHeader = computed(() => {
  const replies = props.replies;
  return replies.length ? `父评论下的 ${replies.length} 条回复` : "暂无回复";
});

function handleKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") {
    event.preventDefault();
    emit("close");
    return;
  }
  if (event.key === "Tab" && drawer.value) {
    const focusable = Array.from(
      drawer.value.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => el.getClientRects().length > 0);
    if (!focusable.length) {
      event.preventDefault();
      drawer.value.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (
      event.shiftKey &&
      (document.activeElement === first ||
        document.activeElement === drawer.value)
    ) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
}

onMounted(async () => {
  await nextTick();
  closeButton.value?.focus();
});

watch(
  () => props.comment.comment.metadata.name,
  () => {
    nextTick(() => {
      closeButton.value?.focus();
    });
  }
);
</script>

<template>
  <div ref="root" data-testid="comment-drawer" @keydown="handleKeydown">
    <div class="workbench-drawer-mask" @click="emit('close')" />
    <button
      ref="closeButton"
      class="absolute right-6 top-4 z-10 rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-900 focus-visible:ring-2 focus-visible:ring-primary"
      type="button"
      aria-label="关闭详情"
      @click="emit('close')"
    >
      <IconClose class="h-5 w-5" />
    </button>
    <section
      ref="drawer"
      class="workbench-drawer h-full min-h-0"
      role="dialog"
      aria-modal="true"
      aria-labelledby="comment-drawer-title"
      tabindex="-1"
    >
      <header
        class="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-4"
      >
        <div>
          <div class="flex items-center gap-2">
            <h2
              id="comment-drawer-title"
              class="text-base font-bold text-gray-900"
            >
              评论详情
            </h2>
            <StatusTag :status="status" />
            <VTag v-if="comment.comment.spec.hidden">私密</VTag>
          </div>
          <div class="mt-1 text-xs text-gray-500">
            提交于 {{ formattedTime }} ·
            {{ comment.comment.metadata?.name || "" }}
          </div>
        </div>
      </header>

      <div class="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        <div class="mb-5 rounded-base border border-gray-200 bg-gray-50 p-3">
          <div class="text-xs text-gray-500">所属{{ subjectLabel }}</div>
          <div class="mt-1 flex flex-wrap items-center gap-2">
            <span v-if="subjectAvailable" class="font-medium text-gray-900">{{
              subjectTitle
            }}</span>
            <span v-else class="font-medium text-red-700">{{
              subjectTitle
            }}</span>
            <a
              v-if="subjectAvailable && comment.permalink"
              :href="comment.permalink"
              target="_blank"
              rel="noopener noreferrer"
              class="text-gray-500 hover:text-gray-900"
              aria-label="在新窗口打开所属内容"
            >
              <IconExternalLinkLine class="h-3.5 w-3.5" />
            </a>
          </div>
          <p v-if="!subjectAvailable" class="mt-1 text-xs text-red-600">
            所属内容已删除或无法访问，仍可查看评论并完成审核。
          </p>
        </div>

        <section aria-label="评论人">
          <h3 class="mb-2 text-sm font-bold text-gray-900">评论人</h3>
          <div class="rounded-base border border-gray-200 p-3 text-sm">
            <div class="font-medium text-gray-900">
              {{
                comment.comment.spec.owner.displayName ||
                comment.comment.spec.owner.name
              }}
            </div>
            <div class="mt-0.5 text-xs text-gray-500">
              {{ comment.owner.kind === "User" ? "站点用户" : "访客" }} ·
              {{ comment.owner.name }}
            </div>
            <a
              v-if="website"
              :href="website"
              target="_blank"
              rel="noopener noreferrer"
              class="mt-1 inline-block text-xs text-gray-600 underline"
            >
              {{ website }}
            </a>
          </div>
        </section>

        <section class="mt-5" aria-label="完整评论内容">
          <h3 class="mb-2 text-sm font-bold text-gray-900">完整评论</h3>
          <div
            class="comment-prose max-h-[320px] overflow-y-auto rounded-base border border-gray-200 p-4 text-sm text-gray-800"
            v-html="comment.comment.spec.content"
          ></div>
        </section>

        <section class="mt-5" aria-label="回复上下文">
          <div class="mb-2 flex items-center justify-between">
            <h3 class="text-sm font-bold text-gray-900">父评论与回复上下文</h3>
            <span class="text-xs text-gray-500">{{ replyHeader }}</span>
          </div>
          <VLoading v-if="repliesLoading" />
          <p
            v-else-if="!replies.length"
            class="rounded-base border border-dashed border-gray-200 px-3 py-4 text-sm text-gray-500"
          >
            这条评论还没有回复。
          </p>
          <ul v-else class="space-y-2">
            <li
              v-for="item in replies"
              :key="item.reply.metadata.name"
              class="rounded-base border border-gray-200 p-3 text-sm"
            >
              <div
                class="flex flex-wrap items-center gap-2 text-xs text-gray-500"
              >
                <span class="font-medium text-gray-900">
                  {{
                    item.reply.spec.owner.kind === "User"
                      ? "站长 / 用户"
                      : "访客"
                  }}
                  ·
                  {{
                    item.reply.spec.owner.displayName ||
                    item.reply.spec.owner.name
                  }}
                </span>
                <span
                  v-if="item.reply.spec.quoteReply"
                  class="rounded bg-gray-100 px-1.5 py-0.5"
                >
                  引用 {{ item.reply.spec.quoteReply }}
                </span>
                <StatusTag
                  :status="
                    item.reply.spec.approved
                      ? 'approved'
                      : item.reply.spec.approvedTime
                        ? 'rejected'
                        : 'pending'
                  "
                />
                <VTag v-if="item.reply.spec.hidden">私密</VTag>
              </div>
              <p class="mt-1 whitespace-pre-wrap text-gray-800">
                {{ item.reply.spec.raw }}
              </p>
            </li>
          </ul>
          <p
            v-if="pendingReplies.length"
            class="mt-2 rounded-base bg-amber-50 px-3 py-2 text-xs text-amber-800"
          >
            该评论下有
            {{ pendingReplies.length }}
            条待审核回复。本次审核仅处理这条顶层评论，回复请在列表中展开或打开回复详情处理。
          </p>
        </section>

        <section class="mt-5" aria-label="审核记录">
          <h3 class="mb-2 text-sm font-bold text-gray-900">审核状态</h3>
          <div class="rounded-base border border-gray-200 p-3 text-sm">
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-gray-500">当前状态</span>
              <StatusTag :status="status" />
              <span class="text-xs text-gray-500">{{
                AUDIT_STATUS_LABEL[status]
              }}</span>
            </div>
            <div
              v-if="comment.comment.spec.approvedTime"
              class="mt-1 text-xs text-gray-500"
            >
              最近审核：{{
                new Date(comment.comment.spec.approvedTime).toLocaleString(
                  "zh-CN",
                  { hour12: false }
                )
              }}
            </div>
            <p v-if="status === 'rejected'" class="mt-2 text-xs text-gray-500">
              已驳回采用「取消通过」：评论保持未通过，不会公开展示。
            </p>
            <p
              v-else-if="status === 'approved'"
              class="mt-2 text-xs text-gray-500"
            >
              已通过的评论只可查看详情；如需处理，请使用列表中既有的取消通过能力（本工作台不新增状态流转）。
            </p>
          </div>
        </section>
      </div>

      <footer class="shrink-0 border-t border-gray-100 px-6 py-4">
        <div
          v-if="isPending"
          class="flex flex-wrap items-center justify-between gap-3"
        >
          <span class="text-xs text-gray-500"
            >审核后会自动定位到下一条待审核评论</span
          >
          <VSpace>
            <VButton
              type="secondary"
              :loading="busy"
              data-testid="drawer-approve"
              @click="emit('approve')"
            >
              <template #icon><IconCheck /></template>
              通过
            </VButton>
            <VButton
              type="danger"
              :disabled="busy"
              data-testid="drawer-reject"
              @click="emit('reject')"
            >
              <template #icon><IconForbidLine /></template>
              驳回
            </VButton>
          </VSpace>
        </div>
        <div v-else class="flex flex-wrap items-center justify-between gap-3">
          <span class="text-xs text-gray-500">
            {{
              canManage
                ? "该评论已处理，不能重复审核。"
                : "当前账号只有查看权限，不能执行审核，也不能跳转到下一条。"
            }}
          </span>
          <div class="flex items-center gap-2">
            <VButton
              v-if="canManage && hasNextPending"
              :loading="busy"
              type="secondary"
              data-testid="drawer-next-pending"
              @click="emit('next')"
            >
              下一条待审核
              <template #icon><IconArrowRight /></template>
            </VButton>
            <VButton
              v-else
              type="secondary"
              data-testid="drawer-back-to-list"
              @click="emit('back-to-list')"
            >
              返回列表
            </VButton>
            <VButton @click="emit('close')">关闭</VButton>
          </div>
        </div>
      </footer>
    </section>
  </div>
</template>
