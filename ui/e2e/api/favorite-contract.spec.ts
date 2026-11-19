import { expect, test } from "@playwright/test";
import fs from "node:fs";
import { openApiConsoleFile, openApiUcFile } from "../support/env";
import { createSeedContext } from "../support/seed";

/**
 * REQ-001 / REQ-004 — endpoint contract of POST|DELETE /posts/{name}/favorite.
 * Runs against the real service: authentication, authorization and persistence
 * are never mocked.
 */
test.describe("收藏接口契约", () => {
  test("收藏后列表返回 favorite=true，取消收藏后为 false，响应为 204", async ({ request }) => {
    const seed = await createSeedContext(request, "contract");
    const viewer = await seed.apiFor(await seed.viewOnlyUser());
    const post = await seed.draftPost("alpha");
    const name = post.metadata.name;

    const before = await viewer.listPosts({ labelSelector: `content.halo.run/deleted=false`, keyword: seed.scope });
    expect(before.status).toBe(200);
    expect(before.items.find((item) => item.post.metadata.name === name)?.favorite).toBe(false);

    const favorite = await viewer.favoritePost(name);
    expect(favorite.status(), "favorite should answer 204 No Content").toBe(204);
    expect(await favorite.text()).toBe("");

    const afterFavorite = await viewer.listPosts({ keyword: seed.scope });
    expect(afterFavorite.items.find((item) => item.post.metadata.name === name)?.favorite).toBe(true);
    // Contract: favorite is a boolean on every console list item, never null.
    for (const item of afterFavorite.items) {
      expect(typeof item.favorite, `favorite must be boolean for ${item.post.metadata.name}`).toBe("boolean");
    }

    const unfavorite = await viewer.unfavoritePost(name);
    expect(unfavorite.status(), "unfavorite should answer 204 No Content").toBe(204);

    const afterUnfavorite = await viewer.listPosts({ keyword: seed.scope });
    expect(afterUnfavorite.items.find((item) => item.post.metadata.name === name)?.favorite).toBe(false);
  });

  test("重复收藏与重复取消均为幂等，不失败且状态正确", async ({ request }) => {
    const seed = await createSeedContext(request, "idempotent");
    const viewer = await seed.apiFor(await seed.viewOnlyUser());
    const post = await seed.publishedPost("beta");

    for (let attempt = 0; attempt < 2; attempt += 1) {
      expect((await viewer.favoritePost(post.metadata.name)).status()).toBe(204);
    }
    const favorited = await viewer.listPosts({ keyword: seed.scope, favorite: true });
    expect(favorited.items.filter((item) => item.post.metadata.name === post.metadata.name)).toHaveLength(1);

    for (let attempt = 0; attempt < 2; attempt += 1) {
      expect((await viewer.unfavoritePost(post.metadata.name)).status()).toBe(204);
    }
    const stillEmpty = await viewer.listPosts({ keyword: seed.scope, favorite: true });
    expect(stillEmpty.total).toBe(0);
  });

  test("不存在的文章返回 404，回收站文章同样返回 404", async ({ request }) => {
    const seed = await createSeedContext(request, "notfound");

    expect((await seed.owner.favoritePost(`${seed.scope}-missing`)).status()).toBe(404);

    const recycled = await seed.draftPost("recycled");
    expect((await seed.owner.favoritePost(recycled.metadata.name)).status()).toBe(204);
    await seed.owner.recyclePost(recycled.metadata.name);
    expect((await seed.owner.favoritePost(recycled.metadata.name)).status()).toBe(404);
    expect((await seed.owner.unfavoritePost(recycled.metadata.name)).status()).toBe(404);
  });

  test("匿名请求不产生收藏记录", async ({ request, playwright }) => {
    const seed = await createSeedContext(request, "anonymous");
    const post = await seed.draftPost("anonymous");
    const anonymous = await playwright.request.newContext();
    try {
      const response = await anonymous.post(
        `${seed.owner.baseURL}/apis/api.console.halo.run/v1alpha1/posts/${post.metadata.name}/favorite`,
        { headers: { Accept: "application/json" }, failOnStatusCode: false }
      );
      expect([401, 403], "anonymous favorite must be rejected by the global login rule").toContain(response.status());
    } finally {
      await anonymous.dispose();
    }
    const list = await seed.owner.listPosts({ keyword: seed.scope, favorite: true });
    expect(list.total).toBe(0);
  });
});

/**
 * REQ-004 — personal isolation and IDOR protection.
 */
test.describe("收藏个人维度与越权防护", () => {
  test("A 的收藏对 B 不可见且 B 的操作不影响 A", async ({ request }) => {
    const seed = await createSeedContext(request, "isolation");
    const userA = await seed.viewOnlyUser();
    const userB = await seed.viewOnlyUser();
    const apiA = await seed.apiFor(userA);
    const apiB = await seed.apiFor(userB);
    const post = await seed.publishedPost("shared");
    const name = post.metadata.name;

    expect((await apiA.favoritePost(name)).status()).toBe(204);

    expect((await apiA.listPosts({ keyword: seed.scope, favorite: true })).total).toBe(1);
    const bFavorited = await apiB.listPosts({ keyword: seed.scope, favorite: true });
    expect(bFavorited.total, "B must not see A's favorite").toBe(0);
    const bAll = await apiB.listPosts({ keyword: seed.scope });
    expect(bAll.items.find((item) => item.post.metadata.name === name)?.favorite).toBe(false);

    // B unfavoriting an entry it never created is an idempotent no-op, not a delete of A's row.
    expect((await apiB.unfavoritePost(name)).status()).toBe(204);
    expect((await apiA.listPosts({ keyword: seed.scope, favorite: true })).total).toBe(1);
  });

  test("接口忽略客户端传入的用户名/用户 ID 参数", async ({ request }) => {
    const seed = await createSeedContext(request, "idor");
    const victim = await seed.viewOnlyUser();
    const victimApi = await seed.apiFor(victim);
    const attacker = await seed.viewOnlyUser();
    const attackerApi = await seed.apiFor(attacker);
    const post = await seed.publishedPost("idor");
    const name = post.metadata.name;

    const forged = await attackerApi.favoritePost(name, {
      "X-Halo-Username": victim.username,
    });
    expect(forged.status()).toBe(204);

    const withQuery = await request.post(
      `${seed.owner.baseURL}/apis/api.console.halo.run/v1alpha1/posts/${name}/favorite?username=${victim.username}`,
      { headers: { Accept: "application/json", Authorization: authorization(attacker) }, failOnStatusCode: false }
    );
    expect([204, 400], "unknown query parameters must not change the owner").toContain(withQuery.status());

    expect(
      (await victimApi.listPosts({ keyword: seed.scope, favorite: true })).total,
      "victim stays clean"
    ).toBe(0);
    expect((await attackerApi.listPosts({ keyword: seed.scope, favorite: true })).total).toBe(1);
  });

  test("仅有 system:posts:view 的账号可以收藏但无法编辑/发布/删除", async ({ request }) => {
    const seed = await createSeedContext(request, "viewonly");
    const viewerAccount = await seed.viewOnlyUser();
    const viewer = await seed.apiFor(viewerAccount);
    const post = await seed.draftPost("viewonly");
    const name = post.metadata.name;

    expect((await viewer.favoritePost(name)).status()).toBe(204);

    const publish = await request.post(
      `${seed.owner.baseURL}/apis/api.console.halo.run/v1alpha1/posts/${name}/publish`,
      { headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: authorization(viewerAccount) }, data: {}, failOnStatusCode: false }
    );
    expect(publish.status(), "favorite must not grant publish rights").toBe(403);

    const remove = await request.delete(
      `${seed.owner.baseURL}/apis/content.halo.run/v1alpha1/posts/${name}`,
      { headers: { Accept: "application/json", Authorization: authorization(viewerAccount) }, failOnStatusCode: false }
    );
    expect(remove.status(), "favorite must not grant delete rights").toBe(403);
  });

  test("无 system:posts:view 的账号访问收藏接口返回 403", async ({ request }) => {
    const seed = await createSeedContext(request, "nopermission");
    // A freshly created account without any role template keeps only the
    // authenticated identity, so it has no post permissions.
    const account = await seed.newUnprivilegedUser();
    const api = await seed.apiFor(account);
    const post = await seed.draftPost("nopermission");
    expect((await api.favoritePost(post.metadata.name)).status()).toBe(403);
  });
});

function authorization(account: { username: string; password: string }): string {
  return `Basic ${Buffer.from(`${account.username}:${account.password}`).toString("base64")}`;
}

/**
 * REQ-003 / REQ-006 — filtering, paging and lifecycle.
 */
test.describe("收藏筛选与生命周期", () => {
  test("favorite=true/false 与服务端分页在同一结果集上计算", async ({ request }) => {
    const seed = await createSeedContext(request, "paging");
    const viewer = await seed.apiFor(await seed.viewOnlyUser());
    const posts = await Promise.all([1, 2, 3, 4, 5].map((index) => seed.draftPost(`page-${index}`)));
    await viewer.favoritePost(posts[0].metadata.name);
    await viewer.favoritePost(posts[1].metadata.name);

    const unfavorited = await viewer.listPosts({ keyword: seed.scope, favorite: false });
    expect(unfavorited.total).toBe(3);
    expect(unfavorited.items.every((item) => item.favorite === false)).toBe(true);

    const page1 = await viewer.listPosts({ keyword: seed.scope, favorite: true, page: 1, size: 1 });
    expect(page1.total).toBe(2);
    expect(page1.items).toHaveLength(1);
    expect(page1.hasNext).toBe(true);
    expect(page1.hasPrevious).toBe(false);

    const page2 = await viewer.listPosts({ keyword: seed.scope, favorite: true, page: 2, size: 1 });
    expect(page2.items).toHaveLength(1);
    expect(page2.hasNext).toBe(false);
    expect(page2.hasPrevious).toBe(true);
    expect(page2.items[0].post.metadata.name).not.toBe(page1.items[0].post.metadata.name);
  });

  test("非法 favorite 值返回 4xx，缺省与显式过滤结果一致", async ({ request }) => {
    const seed = await createSeedContext(request, "invalid");
    const invalid = await seed.owner.listPosts({ favorite: "maybe" });
    expect(invalid.status, "non true/false values must be rejected").toBeGreaterThanOrEqual(400);
    expect(invalid.status).toBeLessThan(500);

    const all = await seed.owner.listPosts({ keyword: seed.scope });
    const favorited = await seed.owner.listPosts({ keyword: seed.scope, favorite: true });
    const unfavorited = await seed.owner.listPosts({ keyword: seed.scope, favorite: false });
    expect(favorited.total + unfavorited.total).toBe(all.total);
  });

  test("favorite 组合其它筛选为且关系，且始终排除回收站文章", async ({ request }) => {
    const seed = await createSeedContext(request, "combined");
    const viewer = await seed.apiFor(await seed.viewOnlyUser());
    const published = await seed.publishedPost("combined");
    const draft = await seed.draftPost("combined-draft");
    await viewer.favoritePost(published.metadata.name);
    await viewer.favoritePost(draft.metadata.name);

    const publishedOnly = await viewer.listPosts({
      keyword: seed.scope,
      favorite: true,
      labelSelector: "content.halo.run/published=true",
    });
    expect(publishedOnly.items.map((item) => item.post.metadata.name)).toEqual([published.metadata.name]);

    await seed.owner.recyclePost(published.metadata.name);
    const afterRecycle = await viewer.listPosts({ keyword: seed.scope, favorite: true });
    expect(afterRecycle.items.map((item) => item.post.metadata.name)).toEqual([draft.metadata.name]);

    await viewer.unfavoritePost(published.metadata.name);
    expect((await seed.owner.favoritePost(published.metadata.name)).status()).toBe(404);

    await seed.owner.restorePost(published.metadata.name);
    const afterRestore = await viewer.listPosts({ keyword: seed.scope, favorite: true });
    expect(afterRestore.items.map((item) => item.post.metadata.name)).toContain(published.metadata.name);
  });

  test("永久删除文章后收藏关系被清理，不残留可查询数据", async ({ request }) => {
    const seed = await createSeedContext(request, "purge");
    const viewer = await seed.apiFor(await seed.viewOnlyUser());
    const post = await seed.draftPost("purge");
    expect((await viewer.favoritePost(post.metadata.name)).status()).toBe(204);

    await seed.owner.recyclePost(post.metadata.name);
    await seed.owner.deletePost(post.metadata.name);

    await expect
      .poll(
        async () => {
          const response = await request.get(
            `${seed.owner.baseURL}/apis/security.halo.run/v1alpha1/postfavorites?fieldSelector=${encodeURIComponent(`spec.postName=${post.metadata.name}`)}`,
            { headers: { Accept: "application/json", Authorization: authorization(seed.ownerAccount) } }
          );
          if (response.status() === 404) {
            return -1;
          }
          const body = (await response.json()) as { total?: number; items?: unknown[] };
          return body.total ?? body.items?.length ?? 0;
        },
        { timeout: 20_000, message: "favorite relations must be purged with the post" }
      )
      .toBe(0);
  });

  test("草稿、未发布、私有与已发布文章均可收藏，可收藏范围与列表可见范围一致", async ({ request }) => {
    const seed = await createSeedContext(request, "lifecycle");
    const viewer = await seed.apiFor(await seed.viewOnlyUser());
    const samples = [
      await seed.draftPost("draft-public"),
      await seed.draftPost("draft-private", "PRIVATE"),
      await seed.publishedPost("published-public"),
    ];
    for (const post of samples) {
      expect((await viewer.favoritePost(post.metadata.name)).status(), post.metadata.name).toBe(204);
    }
    const visible = await viewer.listPosts({ keyword: seed.scope });
    expect(visible.total).toBe(samples.length);
    expect(visible.items.every((item) => item.favorite === true)).toBe(true);
  });
});

/**
 * REQ-002 / 5.2 — favorites must not leak into non-console consumers and the
 * generated artifacts must stay in sync with the committed contract.
 */
test.describe("接口兼容与生成物一致性", () => {
  test("用户中心「我的文章」响应不包含 favorite 字段", async ({ request }) => {
    const seed = await createSeedContext(request, "uc");
    const post = await seed.publishedPost("uc");
    await seed.owner.favoritePost(post.metadata.name);

    const response = await request.get(
      `${seed.owner.baseURL}/apis/uc.api.content.halo.run/v1alpha1/posts?page=0&size=50`,
      { headers: { Accept: "application/json", Authorization: authorization(seed.ownerAccount) } }
    );
    expect(response.status()).toBe(200);
    const body = (await response.json()) as { items: Array<Record<string, unknown>> };
    const item = body.items.find(
      (entry) => (entry.post as { metadata?: { name?: string } } | undefined)?.metadata?.name === post.metadata.name
    );
    expect(item, "the seeded post must be visible in the user center list").toBeDefined();
    expect(item).not.toHaveProperty("favorite");
  });

  test("OpenAPI 生成物包含 favorite 契约且未泄漏到用户中心", async () => {
    expect(fs.existsSync(openApiConsoleFile), `missing ${openApiConsoleFile}`).toBe(true);
    const consoleSpec = JSON.parse(fs.readFileSync(openApiConsoleFile, "utf8")) as OpenApiDocument;
    const favoritePath = consoleSpec.paths["/apis/api.console.halo.run/v1alpha1/posts/{name}/favorite"];
    expect(favoritePath, "console OpenAPI must expose the favorite path").toBeDefined();
    expect(Object.keys(favoritePath)).toEqual(expect.arrayContaining(["post", "delete"]));
    expect(consoleSpec.components.schemas.ListedPost.properties).toHaveProperty("favorite");

    const listParams = consoleSpec.paths["/apis/api.console.halo.run/v1alpha1/posts"].get.parameters ?? [];
    expect(listParams.some((param) => param.name === "favorite")).toBe(true);

    expect(fs.existsSync(openApiUcFile)).toBe(true);
    const ucSpec = JSON.parse(fs.readFileSync(openApiUcFile, "utf8")) as OpenApiDocument;
    expect(ucSpec.paths["/apis/api.uc.content.halo.run/v1alpha1/posts"], "user center path must exist").toBeDefined();
    // The UC API must not expose favorite-specific endpoints or query parameters.
    for (const [path, methods] of Object.entries(ucSpec.paths)) {
      expect(path, "UC must not expose a favorite sub-resource").not.toMatch(/\/favorite$/);
      for (const method of Object.keys(methods)) {
        const params = (methods as Record<string, { parameters?: Array<{ name: string }> }>)[method]?.parameters ?? [];
        expect(
          params.some((p) => p.name === "favorite"),
          `UC ${method.toUpperCase()} ${path} must not accept a favorite parameter`
        ).toBe(false);
      }
    }
  });
});

interface OpenApiDocument {
  paths: Record<string, Record<string, { parameters?: Array<{ name: string }> }>>;
  components: { schemas: Record<string, { properties: Record<string, unknown> }> };
}
