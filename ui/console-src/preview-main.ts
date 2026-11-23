/**
 * Standalone entry for the comment moderation prototype.
 *
 * It only exists under `/preview.html` / `preview.html` in the preview bundle:
 * the regular console entry (`console.html`) and its startup flow stay
 * untouched. The page mounts the real workbench component with local mock data
 * and never calls the business API.
 */
import "@console/modules/contents/comments/preview/preview-app";
