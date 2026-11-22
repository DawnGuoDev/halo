/**
 * Workbench types reuse the generated console API contract.
 * Source: ui/packages/api-client/src/models/{comment,listed-comment,listed-reply}.ts
 * and application/src/main/java/run/halo/app/content/comment/ListedComment.java
 */
import type {
  Comment,
  ListedComment as ApiListedComment,
  ListedReply as ApiListedReply,
  Post,
  SinglePage,
} from "@halo-dev/api-client";

export type {
  Comment as CommentExtension,
  Post as PostExtension,
  SinglePage as SinglePageExtension,
};
export type ListedComment = ApiListedComment;
export type ListedReply = ApiListedReply;

export type SubjectExtension = Post | SinglePage;
export type AuditStatus = "pending" | "approved" | "rejected";
export type SubjectKind = "Post" | "SinglePage";
export type SubjectTypeFilter = "all" | "Post" | "SinglePage";
export type BatchAction = "approve" | "reject";

export interface CommentListResult {
  page: number;
  size: number;
  total: number;
  items: ListedComment[];
  moderationStats: { pending: number; approved: number; rejected: number };
}

export interface CommentListParams {
  page: number;
  size: number;
  keyword?: string;
  status?: AuditStatus | "all";
  subjectType?: SubjectTypeFilter;
  sort?: "newest" | "oldest";
}

export interface BatchOperationResult {
  succeeded: string[];
  failed: { name: string; reason: string }[];
}
