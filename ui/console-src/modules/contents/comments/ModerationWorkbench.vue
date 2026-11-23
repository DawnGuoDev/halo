<script lang="ts" setup>
import { consoleApiClient, coreApiClient } from "@halo-dev/api-client";
import {
  Dialog,
  IconRefreshLine,
  Toast,
  VButton,
  VEmpty,
  VLoading,
  VPagination,
} from "@halo-dev/components";
import { utils } from "@halo-dev/ui-shared";
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import { useRouteQuery } from "@vueuse/router";
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import ModerationBatchPanel from "./components/ModerationBatchPanel.vue";
import ModerationDetailDrawer from "./components/ModerationDetailDrawer.vue";
import ModerationListItem from "./components/ModerationListItem.vue";
import useCommentsFetch from "./composables/use-comments-fetch";
import ModerationFilters from "./preview/ModerationFilters.vue";
import ModerationStats from "./preview/ModerationStats.vue";
import { PREVIEW_SCENARIOS } from "./preview/scenarios";
import type {
  ModerationStatus,
  PreviewScenario,
  SubjectKind,
} from "./preview/types";
import {
  useCommentModeration,
  type BatchAction,
  type BatchOutcome,
} from "./preview/use-comment-moderation";
import { useCommentPreviewMode } from "./preview/use-preview-mode";

const props = withDefaults(
  defineProps<{
    /** Set only by the standalone prototype entry (`preview.html`). */
    previewOverride?: boolean;
  }>(),
  { previewOverride: false }
);

const routePreview = useCommentPreviewMode();
const preview = computed(() => props.previewOverride || routePreview.value);
const { t } = useI18n();
const queryClient = useQueryClient();
const canManage = utils.permission.has(["system:comments:manage"]);

const keyword = useRouteQuery<string>("keyword", "");
const selectedStatus = useRouteQuery<ModerationStatus | undefined>(
  "moderationStatus"
);
const selectedSubjectKind = useRouteQuery<SubjectKind | undefined>(
  "subjectKind"
);
const page = useRouteQuery<number>("page", 1, { transform: Number });
const size = useRouteQuery<number>("size", 20, { transform: Number });

watch(
  () => [keyword.value, selectedStatus.value, selectedSubjectKind.value],
  () => {
    page.value = 1;
    clearSelection();
  }
);
watch(
  () => [page.value, size.value],
  () => clearSelection()
);

const moderation = useCommentModeration(
  {
    keyword,
    status: selectedStatus,
    subjectKind: selectedSubjectKind,
    page,
    size,
  },
  { preview }
);

// ---------------------------------------------------------------------------
// Real data path. Preview mode disables these queries entirely, so no request
// is sent while the local dataset is in use.
// ---------------------------------------------------------------------------
const realPage = computed(() => (preview.value ? 1 : page.value));
const realSize = computed(() => (preview.value ? 10 : size.value));
const realDataEnabled = computed(() => !preview.value);
const realApproved = computed(() => {
  if (preview.value) {
    return undefined;
  }
  return selectedStatus.value === "approved"
    ? "true"
    : selectedStatus.value === "pending"
      ? "false"
      : undefined;
});
const realSubjectRef = ref<string | undefined>(undefined);

const {
  data: realComments,
  isLoading: isRealLoading,
  isFetching: isRealFetching,
  refetch: refetchReal,
} = useCommentsFetch(
  "core:comments",
  realPage,
  realSize,
  realApproved,
  ref(undefined),
  ref(undefined),
  keyword,
  realSubjectRef,
  { enabled: realDataEnabled }
);

const items = computed(() => {
  if (preview.value) {
    return moderation.items.value;
  }
  return (realComments.value?.items ?? []).map((listed) => ({
    listed,
    status: listed.comment.spec.approved
      ? ("approved" as const)
      : ("pending" as const),
    subjectKind:
      listed.comment.spec.subjectRef?.kind === "Post"
        ? ("post" as const)
        : listed.comment.spec.subjectRef?.kind === "SinglePage"
          ? ("single-page" as const)
          : undefined,
    subjectMissing: listed.subject ? undefined : ("deleted" as const),
  }));
});

const total = computed(() =>
  preview.value ? moderation.total.value : (realComments.value?.total ?? 0)
);
const pendingEmpty = computed(
  () =>
    selectedStatus.value === "pending" &&
    !keyword.value &&
    !selectedSubjectKind.value
);
const noResults = computed(
  () => !isLoading.value && items.value.length === 0 && !pendingEmpty.value
);
const isLoading = computed(() => (preview.value ? false : isRealLoading.value));
const isFetching = computed(() =>
  preview.value ? false : isRealFetching.value
);

// ---------------------------------------------------------------------------
// Stats. Preview reads the in-memory dataset; the real console falls back to
// list totals until the backend exposes dedicated pending/rejected counters.
// ---------------------------------------------------------------------------
const realStatsEnabled = computed(() => !preview.value);

const { data: pendingStats, isLoading: pendingStatsLoading } = useQuery({
  queryKey: computed(() => ["core:comments", "stats", "pending"]),
  queryFn: async () => {
    const { data } = await consoleApiClient.content.comment.listComments({
      page: 1,
      size: 1,
      approved: "false",
    });
    return data.total;
  },
  enabled: realStatsEnabled,
});

const { data: approvedStats, isLoading: approvedStatsLoading } = useQuery({
  queryKey: computed(() => ["core:comments", "stats", "approved"]),
  queryFn: async () => {
    const { data } = await consoleApiClient.content.comment.listComments({
      page: 1,
      size: 1,
      approved: "true",
    });
    return data.total;
  },
  enabled: realStatsEnabled,
});

const pendingCount = computed(() =>
  preview.value ? moderation.stats.value.pending : (pendingStats.value ?? 0)
);
const approvedCount = computed(() =>
  preview.value ? moderation.stats.value.approved : (approvedStats.value ?? 0)
);
const rejectedCount = computed(() =>
  preview.value ? moderation.stats.value.rejected : 0
);
const statsLoading = computed(() =>
  preview.value
    ? false
    : pendingStatsLoading.value || approvedStatsLoading.value
);

function toggleStatus(value: ModerationStatus) {
  selectedStatus.value = selectedStatus.value === value ? undefined : value;
}

// ---------------------------------------------------------------------------
// Preview scenario controls
// ---------------------------------------------------------------------------
function changeScenario(value: PreviewScenario) {
  moderation.setScenario(value);
  clearSelection();
  Toast.success(
    t("core.comment.moderation.preview.scenario_changed") +
      "：" +
      PREVIEW_SCENARIOS.find((item) => item.value === value)?.label
  );
}

function resetDemo() {
  moderation.resetDemo();
  clearSelection();
  Toast.success(t("core.comment.moderation.preview.reset_done"));
}

// ---------------------------------------------------------------------------
// Selection
// ---------------------------------------------------------------------------
const selectedNames = ref<string[]>([]);
const checkAll = computed({
  get: () =>
    items.value.length > 0 &&
    items.value.every((item) =>
      selectedNames.value.includes(item.listed.comment.metadata.name)
    ),
  set: (checked: boolean) => {
    selectedNames.value = checked
      ? items.value.map((item) => item.listed.comment.metadata.name)
      : [];
  },
});

function clearSelection() {
  if (selectedNames.value.length) {
    selectedNames.value = [];
  }
  selectedPendingNames.value = [];
}

function toggleSelect(name: string, checked: boolean) {
  if (checked) {
    if (!selectedNames.value.includes(name)) {
      selectedNames.value = [...selectedNames.value, name];
    }
  } else {
    selectedNames.value = selectedNames.value.filter((item) => item !== name);
  }
}

const selectedItems = computed(() =>
  items.value.filter((item) =>
    selectedNames.value.includes(item.listed.comment.metadata.name)
  )
);
/** Names that were pending when selected; used for the batch result scope. */
const selectedPendingNames = ref<string[]>([]);
const actionableItems = computed(() =>
  selectedItems.value.filter(
    (item) =>
      item.status === "pending" ||
      // Keep records that were pending when selected, so a completed batch is
      // still reported with its original scope after the status changed.
      selectedPendingNames.value.includes(item.listed.comment.metadata.name)
  )
);

watch(
  () => selectedNames.value,
  (names) => {
    selectedPendingNames.value = names.filter((name) =>
      items.value.some(
        (item) =>
          item.listed.comment.metadata.name === name &&
          item.status === "pending"
      )
    );
  }
);

// ---------------------------------------------------------------------------
// Single comment actions
// ---------------------------------------------------------------------------
const activeName = ref<string | undefined>();
const detailOpen = ref(false);
const drawerName = ref<string | undefined>();
const processingName = ref<string | undefined>();

const drawerItem = computed(() =>
  items.value.find(
    (item) => item.listed.comment.metadata.name === drawerName.value
  )
);
const drawerDetail = computed(() =>
  preview.value && drawerName.value
    ? moderation.getPreviewComment(drawerName.value)
    : undefined
);
const remainingPending = computed(() => {
  if (!drawerName.value) {
    return 0;
  }
  return preview.value
    ? Math.max(
        0,
        moderation.stats.value.pending -
          (drawerItem.value?.status === "pending" ? 1 : 0)
      )
    : Math.max(0, (realComments.value?.total ?? 0) - 1);
});

function openDetail(name: string) {
  drawerName.value = name;
  detailOpen.value = true;
  activeName.value = name;
}

function closeDetail() {
  detailOpen.value = false;
  drawerName.value = undefined;
}

function toastProcessed(action: BatchAction) {
  Toast.success(
    action === "approve"
      ? t("core.comment.moderation.toast.approved")
      : t("core.comment.moderation.toast.rejected")
  );
}

async function approveOne(name: string) {
  if (processingName.value) {
    return;
  }
  processingName.value = name;
  try {
    if (preview.value) {
      const result = await moderation.approve(name);
      if (!result.ok) {
        Toast.warning(t("core.comment.moderation.toast.status_changed"));
        return;
      }
    } else {
      await coreApiClient.content.comment.patchComment({
        name,
        jsonPatchInner: [
          { op: "add", path: "/spec/approved", value: true },
          {
            op: "add",
            path: "/spec/approvedTime",
            value: new Date().toISOString(),
          },
        ],
      });
    }
    selectedNames.value = selectedNames.value.filter((item) => item !== name);
    processingName.value = undefined;
    toastProcessed("approve");
    if (!preview.value) {
      await queryClient.invalidateQueries({ queryKey: ["core:comments"] });
    }
  } catch (error) {
    console.error("Failed to approve comment", error);
    Toast.error(t("core.comment.moderation.toast.action_failed"));
  } finally {
    processingName.value = undefined;
  }
}

function rejectOne(name: string) {
  Dialog.warning({
    title: t("core.comment.moderation.reject.title"),
    description: t("core.comment.moderation.reject.description"),
    confirmType: "danger",
    confirmText: t("core.comment.moderation.reject.confirm"),
    cancelText: t("core.common.buttons.cancel"),
    onConfirm: async () => {
      await runReject(name);
    },
  });
}

async function runReject(name: string) {
  processingName.value = name;
  try {
    if (preview.value) {
      const result = await moderation.runBatch([name], "reject");
      if (!result.successNames.length) {
        Toast.warning(t("core.comment.moderation.toast.action_failed"));
        return;
      }
      moderation.clearProcessedOutcome();
    } else {
      await coreApiClient.content.comment.patchComment({
        name,
        jsonPatchInner: [
          { op: "add", path: "/spec/approved", value: false },
          { op: "add", path: "/spec/approvedTime", value: "" },
        ],
      });
    }
    selectedNames.value = selectedNames.value.filter((item) => item !== name);
    processingName.value = undefined;
    toastProcessed("reject");
    if (!preview.value) {
      await queryClient.invalidateQueries({ queryKey: ["core:comments"] });
    }
  } catch (error) {
    console.error("Failed to reject comment", error);
    Toast.error(t("core.comment.moderation.toast.action_failed"));
  } finally {
    processingName.value = undefined;
  }
}

async function restoreRejected(name: string) {
  if (!preview.value) {
    const comment = items.value.find(
      (item) => item.listed.comment.metadata.name === name
    )?.listed.comment;
    if (!comment) {
      return;
    }
    await coreApiClient.content.comment.patchComment({
      name,
      jsonPatchInner: [
        { op: "add", path: "/spec/approved", value: false },
        { op: "add", path: "/spec/approvedTime", value: "" },
        { op: "add", path: "/spec/hidden", value: false },
      ],
    });
    await queryClient.invalidateQueries({ queryKey: ["core:comments"] });
    Toast.success(t("core.comment.moderation.toast.restored"));
    return;
  }
  if (moderation.restoreRejected(name)) {
    Toast.success(t("core.comment.moderation.toast.restored"));
  }
}

async function cancelApproval(name: string) {
  if (!preview.value) {
    await coreApiClient.content.comment.patchComment({
      name,
      jsonPatchInner: [
        { op: "add", path: "/spec/approved", value: false },
        { op: "add", path: "/spec/approvedTime", value: "" },
      ],
    });
    await queryClient.invalidateQueries({ queryKey: ["core:comments"] });
    Toast.success(t("core.comment.moderation.toast.approval_cancelled"));
    return;
  }
  if (moderation.cancelApproval(name)) {
    Toast.success(t("core.comment.moderation.toast.approval_cancelled"));
  }
}

async function approveReply(replyName: string) {
  if (!drawerName.value) {
    return;
  }
  if (!preview.value) {
    Toast.info(t("core.comment.moderation.toast.reply_real_hint"));
    return;
  }
  const result = await moderation.approveReply(drawerName.value, replyName);
  Toast[result.ok ? "success" : "warning"](
    result.ok
      ? t("core.comment.moderation.toast.reply_approved")
      : t("core.comment.moderation.toast.status_changed")
  );
}

// ---------------------------------------------------------------------------
// Next pending / view all pending
// ---------------------------------------------------------------------------
function goNextPending() {
  if (!drawerName.value) {
    return;
  }
  if (!preview.value) {
    // Without a server-side "next pending in current order" contract the
    // prototype cannot guarantee the next item; keep the drawer open and
    // refresh so operators can continue from the list.
    Toast.info(t("core.comment.moderation.toast.next_real_hint"));
    return;
  }
  const next = moderation.nextPendingAfter(drawerName.value);
  if (next) {
    openDetail(next.listed.comment.metadata.name);
  }
}

function resetFilters() {
  keyword.value = "";
  selectedStatus.value = undefined;
  selectedSubjectKind.value = undefined;
  page.value = 1;
  clearSelection();
}

function viewAllPending() {
  selectedStatus.value = "pending";
  keyword.value = "";
  selectedSubjectKind.value = undefined;
  page.value = 1;
  clearSelection();
}

// ---------------------------------------------------------------------------
// Batch
// ---------------------------------------------------------------------------
const batchRunning = ref(false);
const retrying = ref(false);
// A local snapshot is used for rendering so the result panel is not affected
// by how the in-memory store exposes (or unwraps) its reactive outcome.
const batchOutcome = ref<BatchOutcome | undefined>();
watch(
  () => moderation.lastOutcome.value,
  (value) => {
    batchOutcome.value = value
      ? {
          ...value,
          successNames: [...value.successNames],
          failures: value.failures.map((failure) => ({ ...failure })),
        }
      : undefined;
  }
);
function batchConfirm(action: BatchAction) {
  const retryingFailed =
    !!batchOutcome.value &&
    batchOutcome.value.failures.length > 0 &&
    batchOutcome.value.action === action;
  const actionable = Array.from(
    new Set([
      ...(retryingFailed
        ? batchOutcome.value!.failures.map((failure) => failure.name)
        : []),
      ...selectedPendingNames.value,
      ...selectedItems.value
        .filter((item) => item.status === "pending")
        .map((item) => item.listed.comment.metadata.name),
    ])
  );
  if (!actionable.length) {
    Toast.warning(t("core.comment.moderation.toast.no_actionable"));
    return;
  }
  const processedNames = batchOutcome.value
    ? [
        ...batchOutcome.value.successNames,
        ...batchOutcome.value.failures.map((failure) => failure.name),
      ]
    : [];
  const blocked = selectedItems.value.filter(
    (item) =>
      !processedNames.includes(item.listed.comment.metadata.name) &&
      !actionable.includes(item.listed.comment.metadata.name) &&
      item.status !== "pending"
  );
  const blockedHint = blocked.length
    ? t("core.comment.moderation.batch.blocked_hint", {
        count: blocked.length,
        names:
          blocked
            .map((item) => item.listed.owner.displayName)
            .slice(0, 3)
            .join("、") +
          (blocked.length > 3
            ? t("core.comment.moderation.batch.and_more")
            : ""),
      })
    : "";
  Dialog.warning({
    title: t(
      action === "approve"
        ? "core.comment.moderation.batch.approve_title"
        : "core.comment.moderation.batch.reject_title"
    ),
    description:
      t(
        action === "approve"
          ? "core.comment.moderation.batch.approve_description"
          : "core.comment.moderation.batch.reject_description",
        { count: actionable.length }
      ) + blockedHint,
    confirmType: action === "approve" ? "primary" : "danger",
    confirmText: t(
      action === "approve"
        ? "core.comment.moderation.batch.approve_confirm"
        : "core.comment.moderation.batch.reject_confirm"
    ),
    cancelText: t("core.common.buttons.cancel"),
    onConfirm: async () => {
      await runBatch(action, actionable);
    },
  });
}

async function runBatch(action: BatchAction, names: string[]) {
  batchRunning.value = true;
  try {
    if (preview.value) {
      const failureTarget =
        moderation.scenario.value === "partial-failure" && names.length > 1
          ? names[Math.floor(names.length / 2)]
          : undefined;
      const outcome = await moderation.runBatch(names, action, {
        simulatedFailureName: failureTarget,
      });
      outcome.total = names.length;
      batchOutcome.value = {
        ...outcome,
        successNames: [...outcome.successNames],
        failures: outcome.failures.map((failure) => ({ ...failure })),
      };
      if (outcome.failures.length === 0) {
        // The scope is the records that were pending when the batch started,
        // including those already marked approved by this run.
        batchOutcome.value.total = names.length;
        Toast.success(
          t(
            action === "approve"
              ? "core.comment.moderation.toast.batch_approved"
              : "core.comment.moderation.toast.batch_rejected"
          )
        );
        moderation.clearProcessedOutcome();
      } else {
        Toast.warning(t("core.comment.moderation.toast.batch_partial"));
      }
      return;
    }
    await runRealBatch(action, names);
  } finally {
    batchRunning.value = false;
  }
}

async function runRealBatch(action: BatchAction, names: string[]) {
  // Per-item patch so a single failure does not hide the result of the others.
  const outcome = {
    action,
    total: names.length,
    successNames: [] as string[],
    failures: [] as { name: string; reason: string }[],
  };
  for (const name of names) {
    try {
      await coreApiClient.content.comment.patchComment({
        name,
        jsonPatchInner:
          action === "approve"
            ? [
                { op: "add", path: "/spec/approved", value: true },
                {
                  op: "add",
                  path: "/spec/approvedTime",
                  value: new Date().toISOString(),
                },
              ]
            : [
                { op: "add", path: "/spec/approved", value: false },
                { op: "add", path: "/spec/approvedTime", value: "" },
              ],
      });
      outcome.successNames.push(name);
    } catch {
      outcome.failures.push({
        name,
        reason: t("core.comment.moderation.batch.server_error"),
      });
    }
  }
  await queryClient.invalidateQueries({ queryKey: ["core:comments"] });
  selectedNames.value = selectedNames.value.filter((name) =>
    outcome.failures.some((failure) => failure.name === name)
  );
  if (!outcome.failures.length) {
    Toast.success(t("core.comment.moderation.toast.batch_success"));
  } else {
    Toast.warning(t("core.comment.moderation.toast.batch_summary", outcome));
  }
}

async function retryFailed() {
  if (!preview.value) {
    return;
  }
  retrying.value = true;
  try {
    const outcome = moderation.lastOutcome.value;
    if (!outcome) {
      return;
    }
    await moderation.retryFailures(outcome.action);
    if (outcome.failures.length === 0) {
      Toast.success(t("core.comment.moderation.toast.retry_success"));
      moderation.clearProcessedOutcome();
      selectedNames.value = [];
    } else {
      Toast.warning(t("core.comment.moderation.toast.retry_partial"));
    }
  } finally {
    retrying.value = false;
  }
}

function refresh() {
  if (preview.value) {
    moderation.resetDemo();
    return;
  }
  refetchReal();
}
</script>

<template>
  <div class="m-0 space-y-4 md:m-4">
    <div
      v-if="preview"
      class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 px-4 py-2 text-xs text-gray-700"
      data-testid="preview-banner"
    >
      <span>
        原型预览模式（本地 Mock 数据，无真实接口请求）。通过 URL
        {{ t("core.comment.moderation.preview.hint") }}
        <code class="rounded bg-white px-1">?preview=comments</code>
      </span>
      <div class="flex items-center gap-2">
        <label class="flex items-center gap-1">
          {{ t("core.comment.moderation.preview.scenario") }}
          <select
            :value="moderation.scenario.value"
            class="rounded border border-gray-300 bg-white px-1 py-0.5"
            data-testid="scenario-select"
            @change="
              changeScenario(
                ($event.target as HTMLSelectElement).value as PreviewScenario
              )
            "
          >
            <option
              v-for="scenario in PREVIEW_SCENARIOS"
              :key="scenario.value"
              :value="scenario.value"
            >
              {{ scenario.label }}
            </option>
          </select>
        </label>
        <VButton size="xs" type="default" @click="resetDemo">
          {{ t("core.comment.moderation.preview.reset") }}
        </VButton>
      </div>
    </div>

    <div class="space-y-1">
      <h2 class="text-base font-semibold text-gray-900">
        {{ t("core.comment.moderation.title") }}
      </h2>
      <p class="text-xs text-gray-500">
        {{ t("core.comment.moderation.description") }}
      </p>
    </div>

    <ModerationStats
      :pending="pendingCount"
      :approved="approvedCount"
      :rejected="rejectedCount"
      :active="selectedStatus"
      :loading="statsLoading"
      @select="toggleStatus"
    />

    <div class="rounded-lg border border-gray-200 bg-white">
      <div class="border-b border-gray-100 bg-gray-50 px-4 py-3">
        <div class="flex flex-wrap items-center gap-3">
          <div
            v-if="canManage && items.length"
            class="hidden items-center sm:flex"
          >
            <input
              v-model="checkAll"
              type="checkbox"
              :aria-label="t('core.comment.moderation.selection.select_all')"
              data-testid="select-all"
            />
          </div>
          <ModerationFilters
            v-model:keyword="keyword"
            v-model:status="selectedStatus"
            v-model:subject-kind="selectedSubjectKind"
            :has-filters="
              !!keyword || !!selectedStatus || !!selectedSubjectKind
            "
            @reset="resetFilters"
          />
          <div class="ml-auto flex items-center gap-2">
            <button
              type="button"
              class="group cursor-pointer rounded p-1 hover:bg-gray-200"
              :aria-label="t('core.common.buttons.refresh')"
              @click="refresh"
            >
              <IconRefreshLine
                :class="{ 'animate-spin text-gray-900': isFetching }"
                class="h-4 w-4 text-gray-600 group-hover:text-gray-900"
              />
            </button>
          </div>
        </div>

        <div
          v-if="selectedNames.length"
          class="mt-3 flex flex-wrap items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2"
          data-testid="batch-bar"
        >
          <span class="text-sm text-gray-700">
            {{
              t("core.comment.moderation.selection.summary", {
                selected: selectedNames.length,
                actionable: actionableItems.length,
              })
            }}
          </span>
          <VButton
            v-if="canManage"
            size="sm"
            type="secondary"
            :disabled="batchRunning || actionableItems.length === 0"
            data-testid="batch-approve"
            @click="batchConfirm('approve')"
          >
            {{ t("core.comment.moderation.batch.approve_button") }}
          </VButton>
          <VButton
            v-if="canManage"
            size="sm"
            type="danger"
            :disabled="batchRunning || actionableItems.length === 0"
            data-testid="batch-reject"
            @click="batchConfirm('reject')"
          >
            {{ t("core.comment.moderation.batch.reject_button") }}
          </VButton>
          <VButton size="sm" type="default" @click="clearSelection">
            {{ t("core.comment.moderation.selection.clear") }}
          </VButton>
        </div>

        <div v-if="batchOutcome" class="mt-3">
          <ModerationBatchPanel
            :outcome="batchOutcome"
            :retrying="retrying"
            @retry="retryFailed"
            @dismiss="
              moderation.clearProcessedOutcome();
              selectedNames = [];
            "
          />
        </div>
      </div>

      <VLoading v-if="isLoading" />
      <div v-else-if="!items.length" class="py-10">
        <VEmpty
          v-if="pendingEmpty"
          :title="t('core.comment.moderation.empty.pending_title')"
          :message="t('core.comment.moderation.empty.pending_message')"
          data-testid="empty-pending"
        >
          <template #actions>
            <VButton @click="refresh">{{
              t("core.common.buttons.refresh")
            }}</VButton>
          </template>
        </VEmpty>
        <VEmpty
          v-else-if="noResults"
          :title="t('core.comment.moderation.empty.filtered_title')"
          :message="t('core.comment.moderation.empty.filtered_message')"
          data-testid="empty-filtered"
        >
          <template #actions>
            <VButton @click="resetFilters">{{
              t("core.comment.moderation.filters.reset")
            }}</VButton>
          </template>
        </VEmpty>
        <VEmpty
          v-else
          :title="t('core.comment.empty.title')"
          :message="t('core.comment.empty.message')"
          data-testid="empty-all"
        >
          <template #actions>
            <VButton @click="refresh">{{
              t("core.common.buttons.refresh")
            }}</VButton>
          </template>
        </VEmpty>
      </div>
      <div v-else class="divide-y divide-gray-100">
        <ModerationListItem
          v-for="item in items"
          :key="item.listed.comment.metadata.name"
          :item="item"
          :selected="selectedNames.includes(item.listed.comment.metadata.name)"
          :processing="processingName === item.listed.comment.metadata.name"
          :selectable="canManage"
          @toggle="
            (checked) =>
              toggleSelect(item.listed.comment.metadata.name, checked)
          "
          @open="openDetail(item.listed.comment.metadata.name)"
          @approve="approveOne(item.listed.comment.metadata.name)"
          @reject="rejectOne(item.listed.comment.metadata.name)"
          @restore="restoreRejected(item.listed.comment.metadata.name)"
          @cancel-approve="cancelApproval(item.listed.comment.metadata.name)"
        />
      </div>

      <div class="border-t border-gray-100 px-4 py-2">
        <VPagination
          v-model:page="page"
          v-model:size="size"
          :page-label="t('core.comment.moderation.pagination.page')"
          :size-label="t('core.comment.moderation.pagination.size')"
          :total-label="
            t('core.comment.moderation.pagination.total', { total })
          "
          :total="total"
          :size-options="moderation.pageSizeOptions"
        />
      </div>
    </div>

    <ModerationDetailDrawer
      v-if="drawerItem"
      v-model:visible="detailOpen"
      :item="drawerItem"
      :detail="drawerDetail"
      :processing="processingName === drawerItem.listed.comment.metadata.name"
      :remaining-pending="remainingPending"
      :can-manage="canManage"
      @close="closeDetail"
      @approve="approveOne(drawerItem.listed.comment.metadata.name)"
      @reject="rejectOne(drawerItem.listed.comment.metadata.name)"
      @restore="restoreRejected(drawerItem.listed.comment.metadata.name)"
      @cancel-approve="cancelApproval(drawerItem.listed.comment.metadata.name)"
      @approve-reply="approveReply"
      @next="goNextPending"
      @view-all-pending="viewAllPending"
    />
  </div>
</template>
