<script setup lang="ts">
import { VButton, VEntity, VEntityField, VTag } from "@halo-dev/components";
import { computed, ref, watch } from "vue";
import { getAuditStatus, stripHtml } from "../composables/comment-service";
import type { ListedComment } from "../types";
import StatusTag from "./StatusTag.vue";

const props = withDefaults(
  defineProps<{
    comment: ListedComment;
    selected: boolean;
    canManage: boolean;
    subjectLabel: string;
    subjectTitle: string;
    subjectAvailable: boolean;
    busy?: boolean;
  }>(),
  { busy: false }
);

const emit = defineEmits<{
  (event: "toggle", checked: boolean): void;
  (event: "open"): void;
  (event: "approve"): void;
  (event: "reject"): void;
  (event: "show-replies"): void;
  (event: "next-pending"): void;
}>();

const status = computed(() => getAuditStatus(props.comment));
const expanded = ref(false);
const brief = computed(() => stripHtml(props.comment.comment.spec.content));
const isLong = computed(() => brief.value.length > 120);
const displayed = computed(() =>
  expanded.value || !isLong.value
    ? brief.value
    : `${brief.value.slice(0, 120)}…`
);
const creationTime = computed(
  () =>
    props.comment.comment.spec.creationTime ||
    props.comment.comment.metadata.creationTimestamp
);
const timeText = computed(() =>
  creationTime.value
    ? new Date(creationTime.value).toLocaleString("zh-CN", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : "-"
);
const replyCount = computed(
  () => props.comment.comment.status?.replyCount || 0
);
const pendingReplyCount = computed(
  () => props.comment.comment.status?.pendingReplyCount || 0
);
const ownerInitial = computed(() =>
  (
    props.comment.comment.spec.owner.displayName ||
    props.comment.comment.spec.owner.name ||
    "?"
  )
    .slice(0, 1)
    .toUpperCase()
);

watch(
  () => props.comment,
  () => {
    expanded.value = false;
  }
);

function handleToggle(event: Event) {
  emit("toggle", (event.target as HTMLInputElement).checked);
}
</script>

<template>
  <VEntity
    :is-selected="selected"
    :data-testid="`comment-row-${comment.comment.metadata.name}`"
  >
    <template v-if="canManage" #checkbox>
      <input
        :checked="selected"
        :aria-label="`选择 ${comment.comment.spec.owner.displayName || comment.comment.spec.owner.name} 的评论`"
        :data-testid="`select-${comment.comment.metadata.name}`"
        type="checkbox"
        class="rounded border-gray-300"
        @change="handleToggle"
      />
    </template>
    <template #start>
      <VEntityField width="560px" max-width="560px">
        <template #description>
          <div class="flex w-full min-w-0 flex-col gap-2">
            <div class="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <button
                class="flex items-center gap-2 text-left"
                type="button"
                data-testid="open-comment"
                @click="emit('open')"
              >
                <span
                  class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-600"
                >
                  {{ ownerInitial }}
                </span>
                <span
                  class="text-sm font-medium text-gray-900 hover:text-gray-700"
                >
                  {{
                    comment.comment.spec.owner.displayName ||
                    comment.comment.spec.owner.name
                  }}
                </span>
              </button>
              <span class="text-xs text-gray-400">
                {{
                  comment.comment.spec.owner.kind === "User" ? "用户" : "访客"
                }}
              </span>
              <VTag v-if="comment.comment.spec.hidden">私密</VTag>
              <span class="text-xs text-gray-400">评论在</span>
              <span
                v-if="subjectAvailable"
                class="inline-block max-w-[16rem] truncate text-sm text-gray-700"
                :title="subjectTitle"
              >
                {{ subjectLabel }}「{{ subjectTitle }}」
              </span>
              <span
                v-else
                class="inline-flex items-center gap-1 rounded bg-red-50 px-1.5 py-0.5 text-xs text-red-700"
                :title="subjectTitle"
              >
                所属内容已删除或无法访问
              </span>
            </div>

            <div
              class="w-full max-w-[34rem] overflow-hidden text-sm text-gray-800"
            >
              <button
                class="block w-full text-left"
                type="button"
                :aria-label="`查看完整评论：${comment.comment.spec.owner.displayName || comment.comment.spec.owner.name}`"
                data-testid="comment-content"
                @click="emit('open')"
              >
                <span :class="{ 'whitespace-pre-line': expanded }">{{
                  displayed
                }}</span>
              </button>
              <button
                v-if="isLong"
                class="mt-1 text-xs text-gray-600 hover:text-gray-900"
                type="button"
                data-testid="toggle-long-comment"
                :aria-expanded="expanded"
                @click="expanded = !expanded"
              >
                {{ expanded ? "收起" : "展开全部" }}
              </button>
            </div>

            <div
              class="flex flex-wrap items-center gap-3 text-xs text-gray-600"
            >
              <button
                v-if="replyCount > 0"
                type="button"
                class="hover:text-gray-900"
                data-testid="show-replies"
                @click="emit('show-replies')"
              >
                {{ replyCount }} 条回复
              </button>
              <span v-if="pendingReplyCount > 0" class="text-amber-700">
                {{ pendingReplyCount }} 条待审核回复
              </span>
              <span
                v-if="!replyCount && !pendingReplyCount"
                class="text-gray-400"
                >暂无回复</span
              >
            </div>
          </div>
        </template>
      </VEntityField>
    </template>

    <template #end>
      <VEntityField>
        <template #description>
          <StatusTag :status="status" />
        </template>
      </VEntityField>
      <VEntityField>
        <template #description>
          <span
            class="whitespace-nowrap text-xs text-gray-500"
            :title="
              creationTime
                ? new Date(creationTime).toLocaleString('zh-CN', {
                    hour12: false,
                  })
                : ''
            "
          >
            {{ timeText }}
          </span>
        </template>
      </VEntityField>
      <VEntityField width="72px" max-width="72px">
        <template #description>
          <div v-if="canManage" class="flex flex-col items-end gap-1">
            <template v-if="status === 'pending'">
              <VButton
                size="sm"
                type="secondary"
                :loading="busy"
                :data-testid="`approve-${comment.comment.metadata.name}`"
                @click="emit('approve')"
              >
                通过
              </VButton>
              <VButton
                size="sm"
                type="danger"
                :disabled="busy"
                :data-testid="`reject-${comment.comment.metadata.name}`"
                @click="emit('reject')"
              >
                驳回
              </VButton>
            </template>
            <VButton
              v-else
              size="sm"
              :data-testid="`open-${comment.comment.metadata.name}`"
              @click="emit('open')"
            >
              查看
            </VButton>
          </div>
          <span v-else class="text-xs text-gray-400" data-testid="readonly-hint"
            >只读</span
          >
        </template>
      </VEntityField>
    </template>
  </VEntity>
</template>
