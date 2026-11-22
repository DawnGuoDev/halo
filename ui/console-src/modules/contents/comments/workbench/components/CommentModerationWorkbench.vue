<script setup lang="ts">
import {
  IconCheck,
  IconForbidLine,
  IconMessage,
  IconRefreshLine,
  IconSearch,
  Toast,
  VButton,
  VCard,
  VEmpty,
  VEntityContainer,
  VLoading,
  VPageHeader,
  VSpace,
} from "@halo-dev/components";
import { computed, ref, watch } from "vue";
import {
  useCommentService,
  type CommentService,
} from "../composables/comment-service";
import type {
  AuditStatus,
  BatchAction,
  BatchOperationResult,
  SubjectTypeFilter,
} from "../types";
import BatchResultPanel from "./BatchResultPanel.vue";
import CommentDrawer from "./CommentDrawer.vue";
import CommentRow from "./CommentRow.vue";
import ConfirmDialog from "./ConfirmDialog.vue";
import ReplyListModal from "./ReplyListModal.vue";
import StatsCards from "./StatsCards.vue";

const props = withDefaults(
  defineProps<{
    service: CommentService | null;
    canManage?: boolean;
    initialStatus?: AuditStatus | "all";
    initialKeyword?: string;
    scenario?: string;
  }>(),
  {
    canManage: true,
    initialStatus: "all",
    initialKeyword: "",
    scenario: "normal",
  }
);

const workbench = useCommentService(props.service);
const {
  state,
  items,
  total,
  stats,
  isLoading,
  isFetching,
  error,
  refetch,
  resetFilters,
  setFilter,
  goToPending,
  findNextPending,
} = workbench;

if (props.initialKeyword) {
  state.keyword = props.initialKeyword;
}
const readyResolved = ref(false);
const requestedScenario = ref<string>();
const scenarioOverride = ref<string>();
window.addEventListener("workbench:scenario", ((event: CustomEvent<string>) => {
  requestedScenario.value = event.detail;
  scenarioOverride.value = event.detail;
}) as EventListener);
const effectiveScenario = computed(
  () => scenarioOverride.value || props.scenario
);
watch(
  effectiveScenario,
  async (scenario) => {
    state.status =
      scenario === "pending-empty" || scenario === "pending-empty-load"
        ? "pending"
        : "all";
    state.keyword = scenario === "filter-empty" ? "不存在的关键词" : "";
    state.page = 1;
    if (props.service && "resetForScenario" in props.service) {
      await (
        props.service as CommentService & {
          resetForScenario: (scenario: string) => Promise<void>;
        }
      ).resetForScenario(scenario);
    }
    if (props.service && "resetPointers" in props.service) {
      (
        props.service as CommentService & {
          resetPointers: () => void;
        }
      ).resetPointers();
    }
    await refetch();
    readyResolved.value = true;
  },
  { immediate: true }
);

// Selection
const selected = ref<string[]>([]);
const selectableItems = computed(() =>
  items.value.filter(
    (item) => !item.comment.spec.approved && !item.comment.spec.approvedTime
  )
);
const allSelected = computed(
  () =>
    selectableItems.value.length > 0 &&
    selectableItems.value.every((item) =>
      selected.value.includes(item.comment.metadata.name)
    )
);
const someSelected = computed(
  () => selected.value.length > 0 && !allSelected.value
);
const selectedCount = computed(() => selected.value.length);
const cannotProcessSelected = computed(() =>
  items.value.filter(
    (item) =>
      selected.value.includes(item.comment.metadata.name) &&
      (item.comment.spec.approved || item.comment.spec.approvedTime)
  )
);
const clearSelection = () => {
  selected.value = [];
};

watch(
  () => [
    state.page,
    state.size,
    state.keyword,
    state.status,
    state.subjectType,
    state.sort,
  ],
  clearSelection
);

function toggleOne(name: string, checked: boolean) {
  if (checked) {
    if (!selected.value.includes(name)) {
      selected.value = [...selected.value, name];
    }
  } else {
    selected.value = selected.value.filter((item) => item !== name);
  }
}

function toggleAll(checked: boolean) {
  selected.value = checked
    ? selectableItems.value.map((item) => item.comment.metadata.name)
    : [];
}

function onSelectAll(event: Event) {
  toggleAll((event.target as HTMLInputElement).checked);
}

// Drawer
const activeName = ref<string>();
const activeComment = computed(
  () =>
    items.value.find(
      (item) => item.comment.metadata.name === activeName.value
    ) || activeDrawerSnapshot.value
);
const activeDrawerSnapshot = ref();
const replies = ref<import("../types").ListedReply[]>([]);
const repliesLoading = ref(false);
const busyComment = ref<string>();
const lastTrigger = ref<HTMLElement>();

const subjectInfo = computed(() => {
  const item = activeComment.value;
  if (!item) {
    return { label: "", title: "", available: false };
  }
  const kind = item.comment.spec.subjectRef.kind;
  const label =
    kind === "Post" ? "文章" : kind === "SinglePage" ? "独立页面" : "内容";
  if (!item.subject) {
    return {
      label,
      title: `（原内容不可用：${item.comment.spec.subjectRef.name}）`,
      available: false,
    };
  }
  const title =
    (item.subject as { spec?: { title?: string } }).spec?.title ||
    item.comment.spec.subjectRef.name;
  return { label, title, available: true };
});

const hasNextPending = computed(() => {
  const item = activeComment.value;
  if (!item || item.comment.spec.approved || !item.comment.spec.approvedTime) {
    return false;
  }
  return items.value.some(
    (candidate) =>
      candidate.comment.metadata.name !== item.comment.metadata.name &&
      !candidate.comment.spec.approved &&
      !candidate.comment.spec.approvedTime
  );
});

async function openComment(name: string, trigger?: Event) {
  lastTrigger.value =
    (trigger?.currentTarget as HTMLElement) ||
    (document.activeElement as HTMLElement);
  activeName.value = name;
  activeDrawerSnapshot.value = items.value.find(
    (item) => item.comment.metadata.name === name
  );
  await loadReplies(name);
}

async function loadReplies(name: string) {
  if (!props.service) return;
  repliesLoading.value = true;
  try {
    replies.value = await props.service.listReplies(name);
  } finally {
    repliesLoading.value = false;
  }
}

function closeDrawer() {
  activeName.value = undefined;
  activeDrawerSnapshot.value = undefined;
  replies.value = [];
  requestAnimationFrame(() => {
    if (lastTrigger.value?.isConnected) {
      lastTrigger.value.focus({ preventScroll: true });
    }
  });
}

const rejectTarget = ref<string>();
const rejectLoading = ref(false);

function requestReject(name: string) {
  rejectTarget.value = name;
}

async function confirmReject() {
  const name = rejectTarget.value;
  if (!name || !props.service) return;
  rejectLoading.value = true;
  try {
    const wasOpen = activeName.value === name;
    await props.service.reject(name);
    Toast.success("已驳回该评论（取消通过）");
    rejectTarget.value = undefined;
    await refetch();
    if (wasOpen) {
      await moveToNextAfterReview(name);
    }
  } catch (e) {
    Toast.error((e as Error).message || "操作失败");
    rejectTarget.value = undefined;
  } finally {
    rejectLoading.value = false;
  }
}

async function approveOne(name: string) {
  if (!props.service) return;
  busyComment.value = name;
  try {
    const wasOpen = activeName.value === name;
    await props.service.approve(name);
    Toast.success("已通过该评论");
    await refetch();
    if (wasOpen) {
      await moveToNextAfterReview(name);
    }
  } catch (e) {
    Toast.error((e as Error).message || "操作失败");
  } finally {
    busyComment.value = undefined;
  }
}

const processedAll = ref(false);

async function moveToNextAfterReview(previousName: string) {
  const previous = items.value.find(
    (item) => item.comment.metadata.name === previousName
  );
  const next = previous ? findNextPending(previous) : undefined;
  if (next) {
    await openComment(next.comment.metadata.name);
    return;
  }
  // If pending items exist beyond the current page, jump there instead of claiming everything is done.
  if (stats.value.pending > 0) {
    processedAll.value = true;
    state.status = "pending";
    state.page = 1;
    clearSelection();
    closeDrawer();
    Toast.info("当前页没有更多待审核评论，已切换到全部待审核列表");
    return;
  }
  processedAll.value = true;
  closeDrawer();
  Toast.success("已处理完毕：当前筛选条件下没有更多待审核评论");
}

// Batch
const batchAction = ref<BatchAction>();
const batchLoading = ref(false);
const batchDiscovered = ref<string[]>([]);
const batchResult = ref<BatchOperationResult>();
const batchNames = ref<string[]>([]);
const batchRetrying = ref(false);
const lastBatchAction = ref<BatchAction>("approve");

function requestBatch(action: BatchAction) {
  if (!selected.value.length) return;
  batchDiscovered.value = [];
  const eligible = selected.value.filter((name) => {
    const item = items.value.find(
      (candidate) => candidate.comment.metadata.name === name
    );
    return (
      !!item && !item.comment.spec.approved && !item.comment.spec.approvedTime
    );
  });
  batchDiscovered.value = eligible;
  unmatchableSelected.value = selected.value.filter(
    (name) => !eligible.includes(name)
  );
  batchFailureNames.value = [];
  batchAction.value = action;
  lastBatchAction.value = action;
}

const unmatchableSelected = ref<string[]>([]);
const batchFailureNames = ref<string[]>([]);
watch(selected, () => {
  unmatchableSelected.value = selected.value.filter((name) => {
    const item = items.value.find(
      (candidate) => candidate.comment.metadata.name === name
    );
    return (
      !item || item.comment.spec.approved || !!item.comment.spec.approvedTime
    );
  });
});

async function runBatchNow(action: BatchAction, names: string[]) {
  if (!props.service) return;
  const result = await props.service.batch(action, [...names]);
  batchDiscovered.value = [...names];
  batchResult.value = result;
  batchNames.value = [...names];
  lastBatchAction.value = action;
  const succeededSet = new Set(result.succeeded);
  selected.value = selected.value.filter((name) => !succeededSet.has(name));
  const failedSet = new Set(result.failed.map((item) => item.name));
  unmatchableSelected.value = selected.value.filter((name) => {
    if (failedSet.has(name)) return false;
    const item = items.value.find(
      (candidate) => candidate.comment.metadata.name === name
    );
    return (
      !item || item.comment.spec.approved || !!item.comment.spec.approvedTime
    );
  });
  await refetch();
  clearSelection();
  if (!result.failed.length) {
    Toast.success(
      `已${action === "approve" ? "通过" : "驳回"} ${result.succeeded.length} 条评论`
    );
  }
}

async function confirmBatch() {
  if (!batchAction.value || !props.service) return;
  batchLoading.value = true;
  const action = batchAction.value;
  try {
    batchAction.value = undefined;
    await runBatchNow(action, batchDiscovered.value);
  } catch (e) {
    Toast.error((e as Error).message || "批量操作失败");
  } finally {
    batchLoading.value = false;
  }
}

async function retryFailed() {
  if (!props.service || !batchResult.value) return;
  batchRetrying.value = true;
  const failedNames = batchResult.value.failed.map((item) => item.name);
  try {
    const retried = await props.service.batch(
      lastBatchAction.value,
      failedNames
    );
    const succeededSet = new Set(retried.succeeded);
    batchResult.value = {
      succeeded: failedNames.filter((name) => succeededSet.has(name)),
      failed: retried.failed,
    };
    await refetch();
    unmatchableSelected.value = [];
    if (!retried.failed.length) {
      Toast.success("失败项已全部重试成功");
    }
  } catch (e) {
    Toast.error((e as Error).message || "重试失败");
  } finally {
    batchRetrying.value = false;
  }
}

async function moveToNextFromDrawer() {
  const current = activeComment.value;
  if (!current) {
    closeDrawer();
    return;
  }
  const next = findNextPending(current);
  if (next && next.comment.metadata.name !== current.comment.metadata.name) {
    await openComment(next.comment.metadata.name);
    return;
  }
  if (stats.value.pending > 0) {
    processedAll.value = false;
    state.status = "pending";
    state.page = 1;
    clearSelection();
    closeDrawer();
    Toast.info("当前页没有更多待审核评论，已切换到全部待审核列表");
    return;
  }
  processedAll.value = true;
  closeDrawer();
}

// Reply modal
const replyModalName = ref<string>();
const replyModalItems = ref<import("../types").ListedReply[]>([]);
const replyModalLoading = ref(false);

async function openReplies(name: string) {
  replyModalName.value = name;
  replyModalLoading.value = true;
  try {
    replyModalItems.value = props.service
      ? await props.service.listReplies(name)
      : [];
  } finally {
    replyModalLoading.value = false;
  }
}

// Empty distinction
const emptyKind = computed(() => {
  if (isLoading.value || items.value.length) return undefined;
  if (state.status === "pending" && stats.value.pending === 0) return "cleared";
  if (state.keyword || state.status !== "all" || state.subjectType !== "all")
    return "filtered";
  if (stats.value.pending === 0) return "cleared";
  return "empty";
});

const statusOptions: { label: string; value: AuditStatus | "all" }[] = [
  { label: "全部状态", value: "all" },
  { label: "待审核", value: "pending" },
  { label: "已通过", value: "approved" },
  { label: "已驳回", value: "rejected" },
];
const subjectOptions: { label: string; value: SubjectTypeFilter }[] = [
  { label: "全部内容类型", value: "all" },
  { label: "文章", value: "Post" },
  { label: "独立页面", value: "SinglePage" },
];

const totalPages = computed(() =>
  Math.max(1, Math.ceil(total.value / state.size))
);
const hasActiveFilters = computed(
  () => !!state.keyword || state.status !== "all" || state.subjectType !== "all"
);

function statusFromCard(key: string) {
  setFilter("status", key as AuditStatus);
}

function pageList() {
  const pages: number[] = [];
  const current = state.page;
  const max = totalPages.value;
  const start = Math.max(1, Math.min(current - 2, max - 4));
  for (let i = start; i <= Math.min(max, start + 4); i += 1) pages.push(i);
  return pages;
}
</script>

<template>
  <div :class="['m-0', 'md:m-4', { 'workbench-ready': readyResolved }]">
    <VPageHeader title="评论审核工作台">
      <template #icon><IconMessage /></template>
      <template #actions>
        <VSpace>
          <VButton
            v-if="canManage && stats.pending > 0"
            type="secondary"
            data-testid="go-pending"
            @click="goToPending"
          >
            查看 {{ stats.pending }} 条待审核
          </VButton>
          <button
            v-tooltip="'刷新'"
            type="button"
            class="group cursor-pointer rounded p-1 hover:bg-gray-200 focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="刷新列表"
            data-testid="refresh"
            @click="refetch()"
          >
            <IconRefreshLine
              :class="{ 'animate-spin text-gray-900': isFetching }"
              class="h-4 w-4 text-gray-600 group-hover:text-gray-900"
            />
          </button>
        </VSpace>
      </template>
    </VPageHeader>

    <div class="space-y-3 py-3">
      <StatsCards
        :stats="stats"
        :active="state.status"
        :loading="isLoading && !items.length"
        @select="statusFromCard"
      />

      <VCard :body-class="['!p-0']">
        <template #header>
          <div class="block w-full bg-gray-50 px-4 py-3">
            <div
              v-if="canManage && selectedCount > 0"
              class="mb-3 flex flex-wrap items-center gap-2 rounded-base border border-gray-200 bg-white px-3 py-2"
              data-testid="batch-bar"
            >
              <span class="text-sm text-gray-700"
                >已选择 <strong>{{ selectedCount }}</strong> 条</span
              >
              <span
                v-if="cannotProcessSelected.length"
                class="rounded bg-amber-50 px-2 py-0.5 text-xs text-amber-800"
              >
                其中 {{ cannotProcessSelected.length }} 条已处理，不能再次审核
              </span>
              <div class="ml-auto flex items-center gap-2">
                <VButton
                  size="sm"
                  type="secondary"
                  data-testid="batch-approve"
                  :disabled="!selectedCount"
                  @click="requestBatch('approve')"
                >
                  <template #icon><IconCheck /></template>
                  批量通过
                </VButton>
                <VButton
                  size="sm"
                  type="danger"
                  data-testid="batch-reject"
                  :disabled="!selectedCount"
                  @click="requestBatch('reject')"
                >
                  <template #icon><IconForbidLine /></template>
                  批量驳回
                </VButton>
                <VButton
                  size="sm"
                  data-testid="clear-selection"
                  @click="clearSelection"
                  >清空选择</VButton
                >
              </div>
            </div>

            <div class="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div class="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                <label
                  class="flex min-w-[240px] flex-1 items-center gap-2 rounded-base border border-gray-300 bg-white px-2.5 py-1.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 lg:max-w-md"
                >
                  <IconSearch
                    class="h-4 w-4 shrink-0 text-gray-400"
                    aria-hidden="true"
                  />
                  <input
                    v-model="state.keyword"
                    type="search"
                    class="w-full border-0 bg-transparent p-0 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-0"
                    placeholder="搜索评论内容或评论人"
                    aria-label="搜索评论内容或评论人"
                    data-testid="keyword"
                  />
                </label>
                <select
                  v-model="state.status"
                  class="h-9 rounded-base border-gray-300 bg-white text-sm"
                  aria-label="审核状态"
                  data-testid="status-filter"
                >
                  <option
                    v-for="option in statusOptions"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </option>
                </select>
                <select
                  v-model="state.subjectType"
                  class="h-9 rounded-base border-gray-300 bg-white text-sm"
                  aria-label="所属内容类型"
                  data-testid="subject-filter"
                >
                  <option
                    v-for="option in subjectOptions"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </option>
                </select>
                <select
                  v-model="state.sort"
                  class="h-9 rounded-base border-gray-300 bg-white text-sm"
                  aria-label="排序"
                  data-testid="sort-filter"
                >
                  <option value="newest">较近提交</option>
                  <option value="oldest">较早提交</option>
                </select>
                <VButton
                  size="sm"
                  :disabled="!hasActiveFilters"
                  data-testid="reset-filters"
                  @click="resetFilters"
                >
                  重置筛选
                </VButton>
              </div>
              <div class="text-xs text-gray-500" data-testid="result-count">
                共 {{ total }} 条{{
                  state.status === "pending" ? "待审核" : ""
                }}结果
              </div>
            </div>
          </div>
        </template>

        <div
          v-if="selectedCount > 0"
          class="border-b border-gray-100 bg-white px-4 py-2 text-xs text-gray-500"
        >
          切换筛选条件或分页会清空当前勾选。
        </div>

        <VLoading v-if="isLoading" class="py-16" />

        <div v-else-if="error" class="px-4 py-10 text-center">
          <p class="text-sm text-red-700">{{ error }}</p>
          <VButton class="mt-3" @click="refetch()">重新加载</VButton>
        </div>

        <Transition v-else-if="!items.length" appear name="fade">
          <div class="px-4 py-10" data-testid="empty-state">
            <VEmpty
              :title="
                emptyKind === 'cleared'
                  ? '待审核评论已全部处理'
                  : '没有符合条件的评论'
              "
              :message="
                emptyKind === 'cleared'
                  ? '当前没有需要审核的评论，新的评论提交后会出现在这里。'
                  : '可以尝试调整关键词、审核状态或所属内容类型。'
              "
            >
              <template #actions>
                <VSpace>
                  <VButton
                    v-if="hasActiveFilters"
                    data-testid="empty-reset"
                    @click="resetFilters"
                  >
                    重置筛选
                  </VButton>
                  <VButton v-else data-testid="empty-refresh" @click="refetch()"
                    >刷新</VButton
                  >
                </VSpace>
              </template>
            </VEmpty>
          </div>
        </Transition>

        <Transition v-else appear name="fade">
          <div>
            <div
              v-if="processedAll && stats.pending === 0"
              class="m-4 rounded-base border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900"
              data-testid="all-done-banner"
            >
              已处理完毕：当前筛选条件下没有更多待审核评论。
            </div>
            <div
              v-if="canManage"
              class="flex items-center gap-2 border-b border-gray-100 bg-white px-4 py-2 text-xs text-gray-600"
            >
              <label class="inline-flex cursor-pointer items-center gap-2">
                <input
                  :checked="allSelected"
                  :indeterminate="someSelected"
                  type="checkbox"
                  class="rounded border-gray-300"
                  aria-label="全选当前页待审核评论"
                  data-testid="select-all"
                  @change="onSelectAll"
                />
                全选当前页待审核评论
              </label>
              <span v-if="selectableItems.length === 0" class="text-gray-400"
                >当前页没有可批量处理的待审核评论</span
              >
            </div>
            <VEntityContainer>
              <CommentRow
                v-for="item in items"
                :key="item.comment.metadata.name"
                :comment="item"
                :selected="selected.includes(item.comment.metadata.name)"
                :can-manage="canManage"
                :subject-label="
                  item.comment.spec.subjectRef.kind === 'Post'
                    ? '文章'
                    : '独立页面'
                "
                :subject-title="
                  item.subject
                    ? (item.subject as { spec?: { title?: string } }).spec
                        ?.title || item.comment.spec.subjectRef.name
                    : '所属内容已删除或无法访问'
                "
                :subject-available="!!item.subject"
                @toggle="toggleOne(item.comment.metadata.name, $event)"
                @open="openComment(item.comment.metadata.name, $event)"
                @approve="approveOne(item.comment.metadata.name)"
                @reject="requestReject(item.comment.metadata.name)"
                @show-replies="openReplies(item.comment.metadata.name)"
                @next-pending="openComment(item.comment.metadata.name)"
              />
            </VEntityContainer>
          </div>
        </Transition>

        <template #footer>
          <div
            class="flex flex-wrap items-center justify-between gap-3"
            data-testid="pagination"
          >
            <span class="text-xs text-gray-500"
              >共 {{ total }} 条 · 第 {{ state.page }} /
              {{ totalPages }} 页</span
            >
            <div class="flex flex-wrap items-center gap-2">
              <select
                v-model.number="state.size"
                class="h-8 rounded-base border-gray-300 text-xs"
                aria-label="每页条数"
              >
                <option :value="10">10 条 / 页</option>
                <option :value="20">20 条 / 页</option>
                <option :value="50">50 条 / 页</option>
              </select>
              <VButton
                size="sm"
                :disabled="state.page <= 1"
                data-testid="prev-page"
                @click="state.page -= 1"
                >上一页</VButton
              >
              <button
                v-for="p in pageList()"
                :key="p"
                :class="[
                  'h-8 min-w-8 rounded-base px-2 text-xs',
                  p === state.page
                    ? 'bg-secondary text-white'
                    : 'bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50',
                ]"
                type="button"
                :aria-current="p === state.page ? 'page' : undefined"
                :data-testid="`page-${p}`"
                @click="state.page = p"
              >
                {{ p }}
              </button>
              <VButton
                size="sm"
                :disabled="state.page >= totalPages"
                data-testid="next-page"
                @click="state.page += 1"
                >下一页</VButton
              >
            </div>
          </div>
        </template>
      </VCard>
    </div>

    <CommentDrawer
      v-if="activeComment"
      :comment="activeComment"
      :replies="replies"
      :replies-loading="repliesLoading"
      :can-manage="canManage"
      :busy="busyComment === activeComment.comment.metadata.name"
      :subject-label="subjectInfo.label"
      :subject-title="subjectInfo.title"
      :subject-available="subjectInfo.available"
      :has-next-pending="hasNextPending"
      @close="closeDrawer"
      @approve="approveOne(activeComment.comment.metadata.name)"
      @reject="requestReject(activeComment.comment.metadata.name)"
      @next="moveToNextFromDrawer"
      @back-to-list="closeDrawer"
    />

    <ConfirmDialog
      v-if="rejectTarget"
      title="确认驳回这条评论？"
      confirm-text="确认驳回"
      tone="danger"
      testid="reject-dialog"
      :loading="rejectLoading"
      @cancel="rejectTarget = undefined"
      @confirm="confirmReject"
    >
      <p>
        驳回后该评论将保持未通过状态，不会公开显示。驳回采用仓库现有的“取消通过”能力，不会删除评论。
      </p>
      <p
        class="mt-2 rounded-base bg-gray-50 px-2 py-1.5 text-xs text-gray-600"
        data-testid="reject-target"
      >
        {{
          items.find((item) => item.comment.metadata.name === rejectTarget)
            ?.owner.displayName || rejectTarget
        }}
      </p>
    </ConfirmDialog>

    <ConfirmDialog
      v-if="batchAction"
      :key="`batch-confirm-${batchAction}-${batchDiscovered.join(',')}`"
      :title="batchAction === 'approve' ? '确认批量通过？' : '确认批量驳回？'"
      :confirm-text="
        batchAction === 'approve'
          ? `通过 ${batchDiscovered.length} 条`
          : `驳回 ${batchDiscovered.length} 条`
      "
      :tone="batchAction === 'approve' ? 'default' : 'danger'"
      testid="batch-confirm"
      :loading="batchLoading"
      :confirm-disabled="batchDiscovered.length === 0"
      @cancel="batchAction = undefined"
      @confirm="confirmBatch"
    >
      <p>
        将对
        <strong data-testid="batch-eligible-count">{{
          batchDiscovered.length
        }}</strong>
        条待审核评论执行“{{ batchAction === "approve" ? "通过" : "驳回" }}”。
        <template v-if="batchAction === 'reject'"
          >驳回后评论保持未通过，不会公开展示。</template
        >
      </p>
      <div
        v-if="unmatchableSelected.length"
        class="mt-3 rounded-base border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900"
        data-testid="batch-unavailable"
      >
        <div class="font-medium">
          以下 {{ unmatchableSelected.length }} 条记录不能处理，将被跳过：
        </div>
        <ul class="mt-1 list-inside list-disc space-y-0.5">
          <li v-for="name in unmatchableSelected" :key="name">
            {{
              items.find((item) => item.comment.metadata.name === name)?.owner
                .displayName || name
            }}
            —— 已通过或已驳回，不能重复审核
          </li>
        </ul>
      </div>
    </ConfirmDialog>

    <BatchResultPanel
      v-if="batchResult"
      :action="lastBatchAction"
      :result="batchResult"
      :retrying="batchRetrying"
      :names="batchNames"
      @retry="retryFailed"
      @close="batchResult = undefined"
    />

    <ReplyListModal
      v-if="replyModalName"
      :comment-name="replyModalName"
      :replies="replyModalItems"
      :loading="replyModalLoading"
      @close="
        replyModalName = undefined;
        replyModalItems = [];
      "
    />
  </div>
</template>
