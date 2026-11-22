import type {
  Comment,
  ListedComment,
  ListedReply,
  Reply,
} from "@halo-dev/api-client";
import { consoleApiClient, coreApiClient } from "@halo-dev/api-client";
import type { CommentService } from "./composables/comment-service";
import type {
  AuditStatus,
  BatchOperationResult,
  CommentListParams,
  CommentListResult,
  SubjectExtension,
  SubjectTypeFilter,
} from "./types";

const PAGE_SIZE_FOR_GLOBAL_COUNT = 1;
const BATCH_CHUNK_SIZE = 5;

function normalizeSubject(listed: ListedComment): SubjectExtension | null {
  const subject = listed.subject as unknown;
  if (!subject || typeof subject !== "object") {
    return null;
  }
  const candidate = subject as { kind?: string; metadata?: { name?: string } };
  if (!candidate.kind || !candidate.metadata?.name) {
    return null;
  }
  return subject as SubjectExtension;
}

function statusOf(listed: ListedComment): AuditStatus {
  if (listed.comment.spec.approved) {
    return "approved";
  }
  return listed.comment.spec.approvedTime ? "rejected" : "pending";
}

function ownerMatches(listed: ListedComment, keyword: string) {
  const normalized = keyword.trim().toLowerCase();
  const owner = listed.owner || listed.comment.spec.owner;
  const name = `${owner?.displayName || ""} ${owner?.name || ""}`.toLowerCase();
  return name.includes(normalized);
}

function matchesSubjectType(listed: ListedComment, type: SubjectTypeFilter) {
  if (type === "all") {
    return true;
  }
  return listed.comment.spec.subjectRef.kind === type;
}

async function patchApproval(comment: Comment, approved: boolean) {
  await coreApiClient.content.comment.patchComment({
    name: comment.metadata.name,
    jsonPatchInner: [
      { op: "add", path: "/spec/approved", value: approved },
      {
        op: "add",
        path: "/spec/approvedTime",
        value: approved ? new Date().toISOString() : "",
      },
    ],
  });
}

async function approveComment(comment: Comment) {
  await coreApiClient.content.comment.patchComment({
    name: comment.metadata.name,
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

/**
 * Reject reuses the existing "cancel approve" semantics: approved=false and a
 * cleared approvedTime. The visual "已驳回" state is derived in the workbench;
 * Halo currently has no persisted rejected status.
 */
async function rejectComment(comment: Comment) {
  await patchApproval(comment, false);
}

async function countComments(approved?: "true" | "false") {
  const { data } = await consoleApiClient.content.comment.listComments({
    page: 1,
    size: PAGE_SIZE_FOR_GLOBAL_COUNT,
    approved,
  });
  return data.total;
}

export function createHaloCommentService(): CommentService {
  return {
    async list(params: CommentListParams): Promise<CommentListResult> {
      const needsClientSideOwnerFilter = !!params.keyword?.trim();
      const needsClientSideTypeFilter = params.subjectType !== "all";
      const keywordForApi = needsClientSideOwnerFilter
        ? undefined
        : params.keyword;
      const approvedParam =
        params.status === "approved"
          ? "true"
          : params.status === "pending" || params.status === "rejected"
            ? "false"
            : undefined;

      const sort =
        params.sort === "oldest"
          ? ["metadata.creationTimestamp,asc"]
          : ["metadata.creationTimestamp,desc"];

      const request = (page: number, size: number) =>
        consoleApiClient.content.comment.listComments({
          page,
          size,
          keyword: keywordForApi,
          approved: approvedParam,
          sort,
        });

      const { data } = await request(params.page, params.size);
      let items = data.items;

      if (needsClientSideOwnerFilter) {
        const keyword = params.keyword?.trim().toLowerCase() || "";
        const ownerFiltered = items.filter(
          (item) =>
            ownerMatches(item, keyword) ||
            item.comment.spec.content.toLowerCase().includes(keyword)
        );
        // Owner search is not supported by the list API; the page is limited to
        // the current server page. This is documented as a follow-up contract gap.
        items = ownerFiltered;
      }

      if (needsClientSideTypeFilter) {
        items = items.filter((item) =>
          matchesSubjectType(item, params.subjectType ?? "all")
        );
      }

      if (params.status === "rejected") {
        items = items.filter((item) => statusOf(item) === "rejected");
      }

      const pendingCount = await countComments("false");
      const approvedCount = await countComments("true");
      const totalComments = await countComments(undefined);
      const approved = approvedCount;
      const pending = pendingCount;
      const rejected = Math.max(0, totalComments - approved - pending);

      return {
        page: params.page,
        size: params.size,
        total: items.length,
        items: items.map((item) => ({
          comment: item.comment,
          owner: item.owner,
          subject: normalizeSubject(item),
          stats: item.stats,
          permalink: item.permalink,
        })) as ListedComment[],
        moderationStats: { pending, approved, rejected },
      };
    },

    async listReplies(commentName: string): Promise<ListedReply[]> {
      const { data } = await consoleApiClient.content.reply.listReplies({
        commentName,
        page: 1,
        size: 1000,
      });
      return data.items;
    },

    async approve(name: string) {
      const { data } = await coreApiClient.content.comment.getComment({ name });
      await approveComment(data);
    },

    async reject(name: string) {
      const { data } = await coreApiClient.content.comment.getComment({ name });
      await rejectComment(data);
    },

    async batch(action, names: string[]): Promise<BatchOperationResult> {
      const succeeded: string[] = [];
      const failed: BatchOperationResult["failed"] = [];
      for (let i = 0; i < names.length; i += BATCH_CHUNK_SIZE) {
        const chunk = names.slice(i, i + BATCH_CHUNK_SIZE);
        await Promise.all(
          chunk.map(async (name) => {
            try {
              const { data } = await coreApiClient.content.comment.getComment({
                name,
              });
              if (data.spec.approved || data.spec.approvedTime) {
                failed.push({ name, reason: "评论已处理，不能重复审核" });
                return;
              }
              if (action === "approve") {
                await approveComment(data);
              } else {
                await rejectComment(data);
              }
              succeeded.push(name);
            } catch (error) {
              failed.push({
                name,
                reason: (error as Error).message || "请求失败",
              });
            }
          })
        );
      }
      return { succeeded, failed };
    },
  };
}

export type { Reply };
