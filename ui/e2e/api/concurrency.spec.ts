import { expect, test } from "@playwright/test";
import { createSeedContext } from "../support/seed";

/**
 * REQ-001 / 5.1 — concurrency and authorization edge cases that are hard to
 * drive from the UI but cheap to prove against the real service.
 */
test.describe("收藏并发与权限边界", () => {
  test("并发收藏同一文章只产生一条关系", async ({ request }) => {
    const seed = await createSeedContext(request, "concurrent");
    const viewer = await seed.apiFor(await seed.viewOnlyUser());
    const post = await seed.draftPost("burst");

    const responses = await Promise.all(
      Array.from({ length: 8 }, () => viewer.favoritePost(post.metadata.name))
    );
    for (const response of responses) {
      expect([204, 409], "concurrent favorites must stay idempotent").toContain(response.status());
    }

    const favorited = await viewer.listPosts({ keyword: seed.scope, favorite: true });
    const matching = favorited.items.filter((item) => item.post.metadata.name === post.metadata.name);
    expect(matching, "exactly one favorite row survives a burst").toHaveLength(1);
    expect(favorited.total).toBe(1);
  });

  test("并发取消收藏不会报错，最终状态为未收藏", async ({ request }) => {
    const seed = await createSeedContext(request, "concurrent-remove");
    const viewer = await seed.apiFor(await seed.viewOnlyUser());
    const post = await seed.draftPost("burst-remove");
    expect((await viewer.favoritePost(post.metadata.name)).status()).toBe(204);

    const responses = await Promise.all(
      Array.from({ length: 6 }, () => viewer.unfavoritePost(post.metadata.name))
    );
    for (const response of responses) {
      expect(response.status(), "unfavorite must be idempotent").toBe(204);
    }
    expect((await viewer.listPosts({ keyword: seed.scope, favorite: true })).total).toBe(0);
  });

  test("收藏不修改文章自身的任何字段", async ({ request }) => {
    const seed = await createSeedContext(request, "no-side-effect");
    const viewer = await seed.apiFor(await seed.viewOnlyUser());
    const post = await seed.publishedPost("immutable");

    const read = (name: string) =>
      request.get(`${seed.owner.baseURL}/apis/content.halo.run/v1alpha1/posts/${encodeURIComponent(name)}`, {
        headers: { Accept: "application/json" },
      });

    const before = (await (await read(post.metadata.name)).json()) as {
      metadata?: Record<string, unknown>;
      spec: Record<string, unknown>;
      status?: Record<string, unknown>;
    };
    expect((await viewer.favoritePost(post.metadata.name)).status()).toBe(204);
    const after = (await (await read(post.metadata.name)).json()) as typeof before;

    // Labels/annotations/finalizers are owned by the reconcilers and may legitimately change
    // while the post settles; spec and status must be untouched by a favorite.
    const metadataSubset = ({ labels, annotations, finalizers, ...rest }: Record<string, unknown>) => rest;
    expect(metadataSubset(after.metadata ?? {})).toEqual(metadataSubset(before.metadata ?? {}));
    expect(after.spec).toEqual(before.spec);
    expect(JSON.stringify(after.spec)).not.toContain("favorite");
  });
});
