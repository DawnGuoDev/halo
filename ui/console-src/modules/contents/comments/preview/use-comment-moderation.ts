import type { ListedComment } from "@halo-dev/api-client";
import { computed, reactive, ref, toRef, unref, type Ref } from "vue";
import { createPreviewComments, type PreviewComment } from "./mock-data";
import type {
  BatchAction,
  ModerationStatus,
  PreviewScenario,
  SubjectKind,
} from "./types";
export type { BatchAction, PreviewScenario };

export interface ModerationFilters {
  keyword: string;
  status: ModerationStatus | undefined;
  subjectKind: SubjectKind | undefined;
}

export interface ModerationItemView {
  listed: ListedComment;
  status: ModerationStatus;
  subjectKind: SubjectKind | undefined;
  subjectMissing?: "deleted" | "inaccessible";
}

export interface RejectedRecord {
  name: string;
  rejectedAt: string;
}

export interface BatchFailure {
  name: string;
  author: string;
  excerpt: string;
  reason: string;
}

export interface BatchOutcome {
  action: BatchAction;
  total: number;
  successNames: string[];
  failures: BatchFailure[];
  finished: boolean;
}

const PAGE_SIZE_OPTIONS = [5, 10, 20, 30, 50, 100];

function statusOf(item: PreviewComment): ModerationStatus {
  return item.status;
}

function subjectKindOf(item: PreviewComment): SubjectKind | undefined {
  const kind =
    item.listed.subject?.kind ?? item.listed.comment.spec.subjectRef?.kind;
  if (kind === "Post") {
    return "post";
  }
  if (kind === "SinglePage") {
    return "single-page";
  }
  return undefined;
}

function matchesKeyword(item: PreviewComment, keyword: string) {
  const normalized = keyword.trim().toLowerCase();
  if (!normalized) {
    return true;
  }
  const { comment, owner } = item.listed;
  return (
    comment.spec.raw.toLowerCase().includes(normalized) ||
    (owner.displayName ?? "").toLowerCase().includes(normalized) ||
    (comment.spec.owner.displayName ?? "").toLowerCase().includes(normalized) ||
    (comment.spec.owner.name ?? "").toLowerCase().includes(normalized)
  );
}

function excerptOf(item: PreviewComment, max = 80) {
  const raw = item.listed.comment.spec.raw.replace(/\s+/g, " ").trim();
  return raw.length > max ? `${raw.slice(0, max)}…` : raw;
}

function sortByCreatedAtDesc(items: PreviewComment[]) {
  return [...items].sort((a, b) => {
    const aTime =
      a.listed.comment.spec.creationTime ??
      a.listed.comment.metadata.creationTimestamp ??
      "";
    const bTime =
      b.listed.comment.spec.creationTime ??
      b.listed.comment.metadata.creationTimestamp ??
      "";
    return bTime.localeCompare(aTime);
  });
}

/**
 * In-memory moderation store for the preview workbench.
 *
 * Data lives in a module-level reactive object so that list, drawer and stats
 * observe the same changes. Nothing here talks to the network.
 */
export function useCommentModeration(
  filters: {
    keyword: Ref<string>;
    status: Ref<ModerationStatus | undefined>;
    subjectKind: Ref<SubjectKind | undefined>;
    page?: Ref<number>;
    size?: Ref<number>;
  },
  options: { preview: Ref<boolean> }
) {
  const comments = reactive<PreviewComment[]>(createPreviewComments());
  const rejectedRecords = reactive<RejectedRecord[]>([]);
  const scenario = ref<PreviewScenario>("normal");
  const processingNames = ref<string[]>([]);
  const lastOutcome = ref<BatchOutcome | undefined>();

  const keywordRef = toRef(filters, "keyword");
  const statusRef = toRef(filters, "status");
  const subjectKindRef = toRef(filters, "subjectKind");
  const filtered = computed(filteredAll);

  function filteredAll(): PreviewComment[] {
    return sortByCreatedAtDesc(
      comments.filter((item) => {
        if (unref(options.preview) && scenario.value === "pending-empty") {
          if (statusRef.value === "pending") {
            return false;
          }
        }
        const status = statusOf(item);
        if (statusRef.value && status !== statusRef.value) {
          return false;
        }
        if (
          subjectKindRef.value &&
          subjectKindOf(item) !== subjectKindRef.value
        ) {
          return false;
        }
        return matchesKeyword(item, keywordRef.value);
      })
    );
  }

  const stats = computed(() => {
    const rejected = new Set(rejectedRecords.map((record) => record.name));
    comments
      .filter((item) => item.status === "rejected")
      .forEach((item) => rejected.add(item.listed.comment.metadata.name));
    return {
      pending:
        unref(options.preview) && scenario.value === "pending-empty"
          ? 0
          : comments.filter((item) => item.status === "pending").length,
      approved: comments.filter((item) => item.status === "approved").length,
      rejected: rejected.size,
    };
  });

  const page = filters.page ?? ref(1);
  const size = filters.size ?? ref(20);

  const total = computed(() => filtered.value.length);
  const pageItems = computed(() => {
    const start = (page.value - 1) * size.value;
    return filtered.value.slice(start, start + size.value);
  });

  const items = computed<ModerationItemView[]>(() =>
    pageItems.value.map((item) => ({
      listed: item.listed,
      status: item.status,
      subjectKind: subjectKindOf(item),
      subjectMissing: item.subjectMissing,
    }))
  );

  function findItem(name: string) {
    return comments.find((item) => item.listed.comment.metadata.name === name);
  }

  function updateRejectedRecords(name: string, rejected: boolean) {
    const index = rejectedRecords.findIndex((record) => record.name === name);
    if (rejected && index === -1) {
      rejectedRecords.push({ name, rejectedAt: new Date().toISOString() });
    } else if (!rejected && index !== -1) {
      rejectedRecords.splice(index, 1);
    }
  }

  function isValidStatusForAction(name: string) {
    const item = findItem(name);
    // Only pending comments can be approved or rejected; approved records must
    // go through the existing "cancel approval" path.
    return item?.status === "pending";
  }

  function applyApprove(item: PreviewComment) {
    item.status = "approved";
    updateRejectedRecords(item.listed.comment.metadata.name, false);
    item.listed.comment.spec.approved = true;
    item.listed.comment.spec.approvedTime = new Date().toISOString();
    item.listed.comment.spec.hidden = false;
  }

  function applyReject(item: PreviewComment) {
    item.status = "rejected";
    updateRejectedRecords(item.listed.comment.metadata.name, true);
    item.listed.comment.spec.approved = false;
    item.listed.comment.spec.approvedTime = undefined;
    item.listed.comment.spec.hidden = true;
  }

  function applyRestoreRejected(item: PreviewComment) {
    item.status = "pending";
    updateRejectedRecords(item.listed.comment.metadata.name, false);
    item.listed.comment.spec.approved = false;
    item.listed.comment.spec.hidden = false;
  }

  function setProcessing(name: string, processing: boolean) {
    const index = processingNames.value.indexOf(name);
    if (processing && index === -1) {
      processingNames.value = [...processingNames.value, name];
    } else if (!processing && index !== -1) {
      processingNames.value = processingNames.value.filter((n) => n !== name);
    }
  }

  function isProcessing(name: string) {
    return processingNames.value.includes(name);
  }

  async function runOne(
    input: string | PreviewComment,
    action: BatchAction,
    opts: { simulateFailure?: boolean } = {}
  ) {
    const name =
      typeof input === "string" ? input : input.listed.comment.metadata.name;
    const item = findItem(name);
    if (!item || !isValidStatusForAction(name)) {
      return { ok: false, reason: "not_pending" as const };
    }
    setProcessing(name, true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 350));
      if (opts.simulateFailure) {
        return {
          ok: false,
          reason: "server_error" as const,
        };
      }
      if (action === "approve") {
        applyApprove(item);
      } else if (action === "reject") {
        applyReject(item);
      }
      return { ok: true as const };
    } finally {
      setProcessing(name, false);
    }
  }

  async function approve(name: string) {
    return runOne(name, "approve");
  }

  async function approveReply(commentName: string, replyName: string) {
    const item = findItem(commentName);
    const reply = item?.replies.find(
      (entry) => entry.listed.reply.metadata.name === replyName
    );
    if (!item || !reply || reply.status !== "pending") {
      return { ok: false, reason: "not_pending" as const };
    }
    setProcessing(commentName, true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 250));
      reply.status = "approved";
      reply.listed.reply.spec.approved = true;
      reply.listed.reply.spec.approvedTime = new Date().toISOString();
      item.listed.comment.status = {
        ...item.listed.comment.status,
        pendingReplyCount: item.replies.filter((r) => r.status === "pending")
          .length,
        visibleReplyCount: item.replies.filter((r) => r.status === "approved")
          .length,
      };
      return { ok: true as const };
    } finally {
      setProcessing(commentName, false);
    }
  }

  function cancelApproval(name: string) {
    const item = findItem(name);
    if (!item || item.status !== "approved") {
      return false;
    }
    item.status = "pending";
    item.listed.comment.spec.approved = false;
    item.listed.comment.spec.approvedTime = undefined;
    return true;
  }

  function restoreRejected(name: string) {
    const item = findItem(name);
    if (!item || item.status !== "rejected") {
      return false;
    }
    applyRestoreRejected(item);
    return true;
  }

  async function runBatch(
    names: string[],
    action: BatchAction,
    opts: { simulatedFailureName?: string } = {}
  ) {
    const batchItems = names
      .map((name) => findItem(name))
      .filter(
        (item): item is PreviewComment => !!item && item.status === "pending"
      );
    const validNames = batchItems.map(
      (item) => item.listed.comment.metadata.name
    );
    const outcome: BatchOutcome = {
      action,
      total: validNames.length,
      successNames: [],
      failures: [],
      finished: false,
    };
    lastOutcome.value = outcome;

    for (const item of batchItems) {
      const name = item.listed.comment.metadata.name;
      const shouldFail = opts.simulatedFailureName === name;
      const result = await runOne(item, action, {
        simulateFailure: shouldFail,
      });
      if (result.ok) {
        outcome.successNames.push(name);
      } else if (item) {
        outcome.failures.push({
          name,
          author:
            item.listed.owner.displayName ??
            item.listed.comment.spec.owner.name,
          excerpt: excerptOf(item, 48),
          reason:
            result.reason === "not_pending"
              ? "状态已变化，无法处理"
              : "服务暂时不可用",
        });
      }
    }
    outcome.finished = true;
    return outcome;
  }

  async function retryFailures(action: BatchAction) {
    const current = lastOutcome.value;
    if (!current || current.failures.length === 0) {
      return current;
    }
    const retryTargets = current.failures.map((failure) => failure.name);
    const retried: BatchFailure[] = [];
    for (const name of retryTargets) {
      const item = findItem(name);
      const result = await runOne(name, action);
      if (result.ok) {
        current.successNames.push(name);
      } else if (item) {
        retried.push({
          name,
          author:
            item.listed.owner.displayName ??
            item.listed.comment.spec.owner.name,
          excerpt: excerptOf(item, 48),
          reason: "服务暂时不可用",
        });
      }
    }
    current.failures = retried;
    current.finished = true;
    return current;
  }

  function nextPendingAfter(name: string) {
    const list = sortByCreatedAtDesc(
      comments.filter((item) => {
        const status = statusOf(item);
        if (statusRef.value && status !== statusRef.value) {
          return false;
        }
        if (
          subjectKindRef.value &&
          subjectKindOf(item) !== subjectKindRef.value
        ) {
          return false;
        }
        return matchesKeyword(item, keywordRef.value);
      })
    );
    const currentIndex = list.findIndex(
      (item) => item.listed.comment.metadata.name === name
    );
    const candidates = list.filter((item) => item.status === "pending");
    if (candidates.length === 0) {
      return undefined;
    }
    const after = candidates.find((item) => {
      const index = list.findIndex(
        (entry) =>
          entry.listed.comment.metadata.name ===
          item.listed.comment.metadata.name
      );
      return index > currentIndex && item.listed.comment.metadata.name !== name;
    });
    if (after) {
      return after;
    }
    const fallback = candidates.find(
      (item) => item.listed.comment.metadata.name !== name
    );
    return fallback;
  }

  function getPreviewComment(name: string) {
    return comments.find((item) => item.listed.comment.metadata.name === name);
  }

  function setScenario(value: PreviewScenario) {
    scenario.value = value;
    page.value = 1;
  }

  function resetDemo() {
    comments.splice(0, comments.length, ...createPreviewComments());
    rejectedRecords.splice(0, rejectedRecords.length);
    lastOutcome.value = undefined;
    processingNames.value = [];
    scenario.value = "normal";
    page.value = 1;
  }

  function clearProcessedOutcome() {
    lastOutcome.value = undefined;
  }

  return {
    items,
    total,
    page,
    size,
    pageSizeOptions: PAGE_SIZE_OPTIONS,
    stats,
    scenario,
    setScenario,
    resetDemo,
    processingNames,
    isProcessing,
    approve,
    approveReply,
    cancelApproval,
    restoreRejected,
    runBatch,
    retryFailures,
    lastOutcome,
    clearProcessedOutcome,
    nextPendingAfter,
    getPreviewComment,
    isValidStatusForAction,
  };
}

export { PREVIEW_SCENARIOS } from "./scenarios";
export type PreviewModerationState = ReturnType<typeof useCommentModeration>;
