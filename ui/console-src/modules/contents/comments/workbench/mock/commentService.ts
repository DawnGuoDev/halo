import type { CommentService } from "../composables/comment-service";
import type {
  AuditStatus,
  BatchAction,
  BatchOperationResult,
  CommentListParams,
  CommentListResult,
  ListedComment,
  ListedReply,
} from "../types";
import { buildMockStore, type MockStore } from "./data";

const MOCK_LATENCY = 260;

function delay(ms = MOCK_LATENCY) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let currentLatency = MOCK_LATENCY;

function stripHtml(content: string) {
  const el = document.createElement("div");
  el.innerHTML = content;
  return (el.textContent || "").replace(/\s+/g, " ").trim();
}

function statusOf(comment: ListedComment): AuditStatus {
  if (comment.comment.spec.approved) {
    return "approved";
  }
  return comment.comment.spec.approvedTime ? "rejected" : "pending";
}

export interface MockCommentServiceOptions {
  store?: MockStore;
  latency?: number;
  /**
   * Comment names that fail once during a batch operation, to demo partial failure.
   * Reset through submitBatch so retries can succeed.
   */
  flakyNames?: string[];
}

export interface MockCommentService extends CommentService {
  store: MockStore;
  /** Names that will fail on the next batch attempt. */
  nextFailureNames: Set<string>;
  submitBatch(
    action: BatchAction,
    names: string[],
    forceFailures?: string[]
  ): Promise<BatchOperationResult>;
  resetForScenario(scenario: string): Promise<void>;
  /** Restores the failure pointer after scenario reloads; the host service ignores it. */
  resetPointers?: () => void;
  /** Current scenario for the static preview demo; the host service ignores it. */
  viewScenario?: string;
  reset(): void;
}

export function createMockCommentService(
  options: MockCommentServiceOptions = {}
): MockCommentService {
  const store = options.store || buildMockStore();
  currentLatency = options.latency ?? MOCK_LATENCY;
  const nextFailureNames = new Set<string>(options.flakyNames || []);

  function globalStats() {
    const stats = { pending: 0, approved: 0, rejected: 0 };
    for (const listed of store.comments) {
      const status = statusOf(listed);
      stats[status] += 1;
    }
    return stats;
  }

  function matchesKeyword(comment: ListedComment, keyword: string) {
    const normalized = keyword.trim().toLowerCase();
    if (!normalized) {
      return true;
    }
    const ownerName = comment.owner.displayName || comment.owner.name || "";
    return (
      stripHtml(comment.comment.spec.content)
        .toLowerCase()
        .includes(normalized) ||
      ownerName.toLowerCase().includes(normalized) ||
      (comment.owner?.name || comment.comment.spec.owner.name || "")
        .toLowerCase()
        .includes(normalized)
    );
  }

  function matchesStatus(
    comment: ListedComment,
    status: CommentListParams["status"]
  ) {
    if (!status || status === "all") {
      return true;
    }
    return statusOf(comment) === status;
  }

  function matchesSubjectType(
    comment: ListedComment,
    type: CommentListParams["subjectType"]
  ) {
    if (!type || type === "all") {
      return true;
    }
    return comment.comment.spec.subjectRef.kind === type;
  }

  function creationOf(comment: ListedComment) {
    return (
      comment.comment.spec.creationTime ||
      comment.comment.metadata.creationTimestamp ||
      ""
    );
  }

  return {
    store,
    nextFailureNames,
    viewScenario: options.flakyNames?.length ? "partial-failure" : "normal",
    resetPointers() {
      nextFailureNames.clear();
      if (options.flakyNames?.length) {
        options.flakyNames.forEach((name) => nextFailureNames.add(name));
      }
    },
    async resetForScenario(scenario: string) {
      this.viewScenario = scenario;
      if (scenario === "normal") {
        return;
      }
      if (scenario === "pending-empty" || scenario === "pending-empty-load") {
        for (const item of store.comments) {
          item.comment.spec.approved = true;
          item.comment.spec.approvedTime =
            item.comment.spec.approvedTime || new Date().toISOString();
        }
      }
      if (
        scenario === "partial-failure" ||
        scenario === "partial-failure-retry"
      ) {
        nextFailureNames.add("comment-002");
      }
    },
    async list(params: CommentListParams): Promise<CommentListResult> {
      await delay(currentLatency);
      const filtered = store.comments
        .filter((item) => matchesKeyword(item, params.keyword || ""))
        .filter((item) => matchesStatus(item, params.status))
        .filter((item) => matchesSubjectType(item, params.subjectType))
        .sort((a, b) => {
          const diff = creationOf(b).localeCompare(creationOf(a));
          return params.sort === "oldest" ? -diff : diff;
        });
      const page = Math.max(1, params.page);
      const size = Math.max(1, params.size);
      const start = (page - 1) * size;
      return {
        page,
        size,
        total: filtered.length,
        items: filtered.slice(start, start + size),
        moderationStats: globalStats(),
      };
    },
    async listReplies(commentName: string): Promise<ListedReply[]> {
      await delay(currentLatency);
      return store.replies
        .filter((item) => item.reply.spec.commentName === commentName)
        .sort((a, b) =>
          (
            a.reply.spec.creationTime ||
            a.reply.metadata.creationTimestamp ||
            ""
          ).localeCompare(
            b.reply.spec.creationTime ||
              b.reply.metadata.creationTimestamp ||
              ""
          )
        );
    },
    async approve(name: string) {
      await delay(currentLatency);
      const target = store.comments.find(
        (item) => item.comment.metadata.name === name
      );
      if (!target) {
        throw new Error("评论不存在或已被删除");
      }
      target.comment.spec.approved = true;
      target.comment.spec.approvedTime = new Date().toISOString();
    },
    async reject(name: string) {
      await delay(currentLatency);
      const target = store.comments.find(
        (item) => item.comment.metadata.name === name
      );
      if (!target) {
        throw new Error("评论不存在或已被删除");
      }
      target.comment.spec.approved = false;
      target.comment.spec.approvedTime = new Date().toISOString();
    },
    async batch(action: BatchAction, names: string[]) {
      return this.submitBatch(action, names);
    },
    async submitBatch(
      action: BatchAction,
      names: string[],
      forceFailures?: string[]
    ) {
      await delay(currentLatency);
      const failureMode =
        this.viewScenario === "partial-failure" ||
        (this.viewScenario === "normal" && !!options.flakyNames?.length);
      const failedList =
        forceFailures || (failureMode ? [...nextFailureNames] : []);
      const succeeded: string[] = [];
      const failed: { name: string; reason: string }[] = [];
      for (const name of names) {
        const target = store.comments.find(
          (item) => item.comment.metadata.name === name
        );
        if (!target) {
          failed.push({ name, reason: "评论不存在或已被删除" });
          continue;
        }
        if (statusOf(target) !== "pending") {
          failed.push({ name, reason: "评论已处理，无需重复审核" });
          continue;
        }
        if (failedList.includes(name)) {
          failed.push({ name, reason: "服务暂时不可用（Mock 模拟失败）" });
          continue;
        }
        target.comment.spec.approved = action === "approve";
        target.comment.spec.approvedTime = new Date().toISOString();
        succeeded.push(name);
      }
      for (const name of failedList) {
        nextFailureNames.delete(name);
      }
      return { succeeded, failed };
    },
    reset() {
      store.comments.splice(
        0,
        store.comments.length,
        ...buildMockStore().comments
      );
    },
  };
}
