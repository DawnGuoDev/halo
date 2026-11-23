import { describe, expect, it } from "vite-plus/test";
import { nextTick, ref } from "vue";
import { useCommentModeration } from "../use-comment-moderation";

function setup() {
  const keyword = ref("");
  const status = ref<"pending" | "approved" | "rejected" | undefined>(
    undefined
  );
  const subjectKind = ref<"post" | "single-page" | undefined>(undefined);
  const page = ref(1);
  const size = ref(50);
  const preview = ref(true);
  const moderation = useCommentModeration(
    { keyword, status, subjectKind, page, size },
    { preview }
  );
  return { keyword, status, subjectKind, page, size, moderation };
}

describe("useCommentModeration", () => {
  it("rejects only pending comments and counts the rejection separately", async () => {
    const { moderation } = setup();
    const before = moderation.stats.value;

    const first = moderation.items.value.find(
      (item) => item.status === "pending"
    );
    expect(first).toBeDefined();

    await moderation.runBatch([first!.listed.comment.metadata.name], "reject");

    expect(moderation.stats.value.pending).toBe(before.pending - 1);
    expect(moderation.stats.value.approved).toBe(before.approved);
    expect(moderation.stats.value.rejected).toBe(before.rejected + 1);
  });

  it("keeps successful items out of the retry set", async () => {
    const { moderation } = setup();
    const pending = moderation.items.value
      .filter((item) => item.status === "pending")
      .map((item) => item.listed.comment.metadata.name);

    expect(pending.length).toBeGreaterThan(2);
    const failureTarget = pending[1];

    const outcome = await moderation.runBatch(pending, "approve", {
      simulatedFailureName: failureTarget,
    });

    expect(outcome.successNames).toHaveLength(pending.length - 1);
    expect(outcome.failures.map((failure) => failure.name)).toEqual([
      failureTarget,
    ]);

    const approvedBeforeRetry = moderation.stats.value.approved;
    const retried = await moderation.retryFailures("approve");

    expect(retried?.failures).toHaveLength(0);
    expect(moderation.stats.value.approved).toBe(approvedBeforeRetry + 1);
  });

  it("restores a rejected comment back to the pending queue", async () => {
    const { moderation } = setup();
    const rejected = moderation.items.value.find(
      (item) => item.status === "rejected"
    );
    expect(rejected).toBeDefined();

    const before = moderation.stats.value;
    expect(
      moderation.restoreRejected(rejected!.listed.comment.metadata.name)
    ).toBe(true);

    expect(moderation.stats.value.pending).toBe(before.pending + 1);
    expect(moderation.stats.value.rejected).toBe(before.rejected - 1);
  });

  it("filters by content type and keyword while keeping counts global", async () => {
    const { moderation, subjectKind, keyword, status } = setup();

    status.value = "pending";
    subjectKind.value = "single-page";
    await nextTick();
    expect(
      moderation.items.value.every((item) => item.subjectKind === "single-page")
    ).toBe(true);

    keyword.value = "陈浩";
    await nextTick();
    expect(moderation.items.value).toHaveLength(1);
    expect(moderation.items.value[0].listed.owner.displayName).toBe("陈浩");

    // A keyword from another content type must not leak into the filtered list.
    keyword.value = "王芳";
    await nextTick();
    expect(moderation.items.value).toHaveLength(0);

    // Statistics stay global and are not narrowed by list filters.
    expect(moderation.stats.value.pending).toBe(7);
    expect(moderation.stats.value.approved).toBe(4);
  });
});
