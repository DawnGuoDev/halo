/**
 * Integration entry shared by the standalone prototype and the Halo console backfill.
 * Host applications inject the comment service and the current permission.
 */
export { default as CommentModerationWorkbench } from "./components/CommentModerationWorkbench.vue";
export { useCommentService } from "./composables/comment-service";
export { createMockCommentService } from "./mock/commentService";
export { createHaloCommentService } from "./api-comment-service";
export {
  getAuditStatus,
  AUDIT_STATUS_LABEL,
} from "./composables/comment-service";
export type * from "./types";
