import { computed, reactive, ref, watch } from "vue";
import type {
  AuditStatus,
  BatchAction,
  BatchOperationResult,
  CommentExtension,
  CommentListParams,
  CommentListResult,
  ListedComment,
  ListedReply,
  SubjectTypeFilter,
} from "../types";

export type {
  AuditStatus,
  BatchOperationResult,
  CommentListParams,
  CommentListResult,
  ListedComment,
  ListedReply,
  SubjectTypeFilter,
  BatchAction,
} from "../types";

export function getAuditStatus(item: ListedComment): AuditStatus {
  if (item.comment.spec.approved) {
    return "approved";
  }
  return item.comment.spec.approvedTime ? "rejected" : "pending";
}

export interface CommentService {
  list(params: CommentListParams): Promise<CommentListResult>;
  listReplies(commentName: string): Promise<ListedReply[]>;
  approve(name: string): Promise<void>;
  reject(name: string): Promise<void>;
  batch(action: BatchAction, names: string[]): Promise<BatchOperationResult>;
}

interface WorkbenchState {
  page: number;
  size: number;
  keyword: string;
  status: AuditStatus | "all";
  subjectType: SubjectTypeFilter;
  sort: "newest" | "oldest";
}

export const AUDIT_STATUS_LABEL: Record<AuditStatus, string> = {
  pending: "待审核",
  approved: "已通过",
  rejected: "已驳回",
};

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function stripHtml(content: string) {
  const el = document.createElement("div");
  el.innerHTML = content;
  return (el.textContent || "").replace(/\s+/g, " ").trim();
}

export function useCommentService(service: CommentService | null) {
  const state = reactive<WorkbenchState>({
    page: 1,
    size: 10,
    keyword: "",
    status: "all",
    subjectType: "all",
    sort: "newest",
  });

  const data = ref<CommentListResult>();
  const isLoading = ref(false);
  const isFetching = ref(false);
  const error = ref<string>();
  let requestSeq = 0;

  /** Set by the caller for manual/force failure demos. */
  const reloadToken = ref(0);

  async function refetch() {
    if (!service) {
      return;
    }
    const seq = ++requestSeq;
    const firstLoad = !data.value;
    isLoading.value = firstLoad;
    isFetching.value = true;
    error.value = undefined;
    try {
      const result = await service.list({ ...state });
      if (seq !== requestSeq) {
        return;
      }
      data.value = result;
      if (result.total > 0 && result.items.length === 0 && state.page > 1) {
        const lastPage = Math.max(1, Math.ceil(result.total / state.size));
        state.page = lastPage;
        await refetch();
      }
    } catch (e) {
      if (seq === requestSeq) {
        error.value = (e as Error).message || "加载失败";
      }
    } finally {
      if (seq === requestSeq) {
        isLoading.value = false;
        isFetching.value = false;
      }
    }
  }

  watch(
    () => [
      state.page,
      state.size,
      state.keyword,
      state.status,
      state.subjectType,
      state.sort,
      reloadToken.value,
    ],
    () => refetch(),
    { immediate: true }
  );

  watch(
    () => [state.keyword, state.status, state.subjectType, state.sort],
    () => {
      if (state.page !== 1) {
        state.page = 1;
      }
    }
  );

  const total = computed(() => data.value?.total || 0);
  const items = computed(() => data.value?.items || []);
  const stats = computed(
    () =>
      data.value?.moderationStats || { pending: 0, approved: 0, rejected: 0 }
  );

  function resetFilters() {
    state.keyword = "";
    state.status = "all";
    state.subjectType = "all";
    state.sort = "newest";
    state.page = 1;
  }

  function setFilter<K extends keyof WorkbenchState>(
    key: K,
    value: WorkbenchState[K]
  ) {
    state[key] = value;
    if (key !== "page" && key !== "size") {
      state.page = 1;
    }
  }

  function goToPending() {
    state.status = "pending";
    state.page = 1;
  }

  function findNextPending(current: ListedComment): ListedComment | undefined {
    const index = items.value.findIndex(
      (item) => item.comment.metadata.name === current.comment.metadata.name
    );
    if (index >= 0) {
      const rest = items.value.slice(index + 1);
      const found = rest.find(
        (item) =>
          item.comment.spec.approved === false &&
          !item.comment.spec.approvedTime
      );
      if (found) {
        return found;
      }
    }
    const others = items.value.filter(
      (item) =>
        item.comment.metadata.name !== current.comment.metadata.name &&
        item.comment.spec.approved === false &&
        !item.comment.spec.approvedTime
    );
    return others[0];
  }

  return {
    state,
    data,
    items,
    total,
    stats,
    isLoading,
    isFetching,
    error,
    reloadToken,
    refetch,
    resetFilters,
    setFilter,
    goToPending,
    findNextPending,
  };
}

export type CommentWorkbench = ReturnType<typeof useCommentService>;

export function patchApproved(
  comment: CommentExtension,
  approved: boolean,
  approvedTime?: string
) {
  comment.spec.approved = approved;
  comment.spec.approvedTime = approvedTime;
}

export async function simulateDelay(ms: number) {
  await wait(ms);
}

const MOCK_LABELS: Record<string, string> = {
  "comment-001": "林伟：长评论（主题模板扩展点）",
  "comment-002": "陈雨：扩展点示例请求",
  "comment-003": "一位读者：关于字体托管",
  "comment-004": "SEO 推广：所属文章已删除",
  "comment-006": "路过的访客：深色模式建议",
  "comment-007": "吴昊：插件 UI 调试",
  "comment-010": "老友：友情链接问候",
  "comment-011": "钱多：插件模板仓库",
  "comment-012": "活动推广：可疑推广",
};

export function getMockLabel(name: string) {
  return MOCK_LABELS[name] || name;
}
