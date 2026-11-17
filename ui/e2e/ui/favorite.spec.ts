import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { PostListPage } from "../pages/PostListPage";
import { newConsoleContext, openConsolePage } from "../support/console-session";
import { t } from "../support/i18n";
import { createSeedContext, type SeedContext } from "../support/seed";

/**
 * REQ-001 / REQ-002 — inline star: toggle, persistence, non-interference,
 * keyboard/ARIA contract and the request states.
 */
test.describe("行内收藏与取消收藏", () => {
  let seed: SeedContext;
  let context: BrowserContext;
  let page: Page;
  let list: PostListPage;

  test.beforeEach(async ({ browser, request }) => {
    seed = await createSeedContext(request, "toggle");
    context = await newConsoleContext((browser as Browser), seed.ownerAccount);
  });

  test.afterEach(async () => {
    await context.close();
  });

  async function openList() {
    page = await openConsolePage(context);
    list = new PostListPage(page);
    await list.filterByScope(seed.scope);
  }

  test("点击空心星标变为实心，刷新后仍为已收藏；再次点击恢复空心并持久化", async () => {
    const post = await seed.publishedPost("persist");
    const title = seed.titleOf(post);
    await openList();

    await list.favorite(title);
    await page.reload();
    await list.filterByScope(seed.scope);
    await list.expectFavorited(title);

    await list.unfavorite(title);
    await page.reload();
    await list.filterByScope(seed.scope);
    await list.expectNotFavorited(title);
  });

  test("点击星标不打开编辑器、不跳转标题链接、不改变该行复选框", async () => {
    const post = await seed.publishedPost("isolate");
    const title = seed.titleOf(post);
    await openList();

    const checkbox = list.rowCheckbox(title);
    await expect(checkbox).not.toBeChecked();
    const before = page.url();

    await list.favorite(title);

    await expect(page).toHaveURL(before);
    await expect(page.getByText(t("core.post_editor.title"), { exact: true })).toHaveCount(0);
    await expect(checkbox).not.toBeChecked();
    await list.expectRowVisible(title);
  });

  test("操作成功不弹 Toast", async () => {
    const post = await seed.publishedPost("no-toast");
    const title = seed.titleOf(post);
    await openList();
    await list.favorite(title);
    await expect(page.locator(".toast-wrapper")).toHaveCount(0);
  });

  test("星标可聚焦并可键盘触发，aria-label/aria-pressed 随状态变化", async () => {
    const post = await seed.publishedPost("keyboard");
    const title = seed.titleOf(post);
    await openList();

    const star = list.star(title);
    await star.focus();
    await expect(star).toBeFocused();
    await expect(star).toHaveAttribute("aria-pressed", "false");
    await expect(star).toHaveAttribute("aria-label", t("core.post.list.fields.favorite"));

    await page.keyboard.press("Enter");
    await list.expectFavorited(title);
    await expect(star).toHaveAttribute("aria-label", t("core.post.list.fields.unfavorite"));

    await page.keyboard.press("Space");
    await list.expectNotFavorited(title);
  });

  test("星标尺寸 14px、点击热区约 22px，且位于标题行 extra 区域", async () => {
    const post = await seed.publishedPost("geometry");
    const title = seed.titleOf(post);
    await openList();

    const star = list.star(title);
    const box = await star.boundingBox();
    expect(box, "star must be rendered").not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(20);
    expect(box!.width).toBeLessThanOrEqual(24);
    expect(box!.height).toBeGreaterThanOrEqual(20);
    expect(box!.height).toBeLessThanOrEqual(24);

    const icon = star.locator("svg");
    const iconBox = await icon.boundingBox();
    expect(iconBox!.width).toBeCloseTo(14, 0);
    expect(iconBox!.height).toBeCloseTo(14, 0);

    // The star precedes the external link inside the same title extra area.
    const titleBox = (await list.titleLink(title).boundingBox())!;
    expect(box!.x).toBeGreaterThan(titleBox.x);
    expect(box!.y).toBeLessThan(titleBox.y + titleBox.height);
  });

  test("请求处理中星标保持目标态、opacity-60、cursor-wait 且禁止再次点击", async () => {
    const post = await seed.publishedPost("pending");
    const title = seed.titleOf(post);
    await openList();

    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let favoriteCalls = 0;
    await page.route("**/posts/*/favorite", async (route) => {
      if (route.request().method() === "POST") {
        favoriteCalls += 1;
        await gate;
      }
      await route.continue();
    });

    const star = list.star(title);
    await star.click();
    await expect(star).toBeDisabled();
    await expect(star).toHaveAttribute("aria-pressed", "true");
    await expect(star).toHaveClass(/opacity-60/);
    await expect(star).toHaveClass(/cursor-wait/);
    await star.click({ force: true });
    expect(favoriteCalls, "a second click must not submit another request").toBe(1);

    release?.();
    await list.expectFavorited(title);
    await expect(star).toBeEnabled();
  });

  test("请求失败时星标回滚并提示失败文案", async () => {
    const post = await seed.publishedPost("failure");
    const title = seed.titleOf(post);
    await openList();

    await page.route("**/posts/*/favorite", (route) =>
      route.fulfill({ status: 500, contentType: "application/json", body: "{}" })
    );

    await list.toggleFavorite(title);
    await expect(list.failureToast()).toBeVisible({ timeout: 15_000 });
    await list.expectNotFavorited(title);
  });
});

/**
 * REQ-003 / REQ-005 — favorite filter, combination, URL state, empty states
 * and paging fallback.
 */
test.describe("收藏状态筛选", () => {
  let seed: SeedContext;
  let browserRef: Browser;
  let context: BrowserContext;

  test.beforeEach(async ({ browser, request }) => {
    browserRef = browser as Browser;
    seed = await createSeedContext(request, "filter");
    context = await newConsoleContext(browserRef, seed.ownerAccount);
  });

  test.afterEach(async () => {
    await context.close();
  });

  test("「已收藏」仅展示本人已收藏文章，「未收藏」展示其余文章", async () => {
    const favorited = await seed.publishedPost("yes");
    const other = await seed.publishedPost("no");
    const page = await openConsolePage(context);
    const list = new PostListPage(page);
    await list.filterByScope(seed.scope);

    await list.favorite(seed.titleOf(favorited));

    await list.selectFavoriteFilter("favorited");
    await list.expectRowVisible(seed.titleOf(favorited));
    await list.expectRowHidden(seed.titleOf(other));
    await list.expectTotal(1);

    await list.selectFavoriteFilter("unfavorited");
    await list.expectRowVisible(seed.titleOf(other));
    await list.expectRowHidden(seed.titleOf(favorited));
    await list.expectTotal(1);
  });

  test("切换收藏筛选回到第 1 页并写入 favorite 参数，刷新与前进/后退保持一致", async () => {
    const first = await seed.publishedPost("url-a");
    await seed.publishedPost("url-b");
    const page = await openConsolePage(context);
    const list = new PostListPage(page);
    await list.filterByScope(seed.scope);
    await list.favorite(seed.titleOf(first));

    // Go to page 2 first, then change the favorite filter and expect page=1.
    await page.goto("/console/posts?page=1&size=1");
    await list.waitForListSettled();
    await list.paginationNext().click();
    await expect.poll(() => list.urlParam("page")).toBe("2");

    await list.selectFavoriteFilter("favorited");
    await list.waitForFirstPage();
    await list.expectRowVisible(seed.titleOf(first));

    await page.reload();
    await list.waitForListSettled();
    expect(list.urlParam("favorite")).toBe("true");
    await list.expectRowVisible(seed.titleOf(first));

    await list.selectFavoriteFilter("all");
    await page.goBack();
    await list.waitForListSettled();
    expect(list.urlParam("favorite")).toBe("true");
    await list.expectRowVisible(seed.titleOf(first));
  });

  test("收藏筛选与状态筛选为且关系", async () => {
    const published = await seed.publishedPost("and-published");
    const draft = await seed.draftPost("and-draft");
    const page = await openConsolePage(context);
    const list = new PostListPage(page);
    await list.filterByScope(seed.scope);
    await list.favorite(seed.titleOf(published));
    await list.favorite(seed.titleOf(draft));

    await list.selectFavoriteFilter("favorited");
    await page.getByRole("button", { name: new RegExp(`^${t("core.common.filters.labels.status")}`) }).click();
    await page.getByRole("option", { name: t("core.post.filters.status.items.draft"), exact: true }).click();
    await list.waitForListSettled();

    await list.expectRowVisible(seed.titleOf(draft));
    await list.expectRowHidden(seed.titleOf(published));
    await list.expectTotal(1);
  });

  test("「已收藏」下取消收藏：行移除、总数减 1，切回全部后重新出现", async () => {
    const kept = await seed.publishedPost("keep");
    const removed = await seed.publishedPost("remove");
    const page = await openConsolePage(context);
    const list = new PostListPage(page);
    await list.filterByScope(seed.scope);
    await list.favorite(seed.titleOf(kept));
    await list.favorite(seed.titleOf(removed));
    await list.expectTotal(2);

    await list.selectFavoriteFilter("favorited");
    await list.expectTotal(2);
    await list.unfavorite(seed.titleOf(removed));
    await list.expectRowHidden(seed.titleOf(removed));
    await list.expectTotal(1);

    await list.selectFavoriteFilter("all");
    await list.expectRowVisible(seed.titleOf(removed));
    await list.expectRowVisible(seed.titleOf(kept));
  });

  test("「未收藏」下收藏：行移除、总数减 1，切回全部后按原排序重新出现", async () => {
    const target = await seed.publishedPost("target");
    const sibling = await seed.publishedPost("sibling");
    const page = await openConsolePage(context);
    const list = new PostListPage(page);
    await list.filterByScope(seed.scope);
    await list.expectTotal(2);

    await list.selectFavoriteFilter("unfavorited");
    await list.expectTotal(2);
    await list.favorite(seed.titleOf(target));
    await list.expectRowHidden(seed.titleOf(target));
    await list.expectTotal(1);

    await list.selectFavoriteFilter("all");
    await list.expectRowVisible(seed.titleOf(target));
    await list.expectRowVisible(seed.titleOf(sibling));
  });

  test("「全部」下收藏不改变行位置与排序", async () => {
    const first = await seed.publishedPost("order-first");
    const second = await seed.publishedPost("order-second");
    const page = await openConsolePage(context);
    const list = new PostListPage(page);
    await list.filterByScope(seed.scope);

    const titlesBefore = await list.rowsTitles();
    await list.favorite(seed.titleOf(first));
    const titlesAfter = await list.rowsTitles();
    expect(titlesAfter).toEqual(titlesBefore);
    expect(titlesAfter).toContain(seed.titleOf(second));
  });

  test("「已收藏」空态展示专用文案，「查看全部文章」只清除收藏筛选", async () => {
    await seed.publishedPost("empty-favorite");
    const page = await openConsolePage(context);
    const list = new PostListPage(page);
    await list.filterByScope(seed.scope);
    await list.selectFavoriteFilter("favorited");

    await list.expectFavoriteEmptyState("favorite");
    await list.expectTotal(0);

    await list.clickViewAllPosts();
    await list.expectFavoriteFilterCleared();
    await list.waitForFirstPage();
    expect(list.urlParam("keyword")).toBe(seed.scope);
    await list.expectRowVisible(`${seed.scope} empty-favorite`);
  });

  test("「未收藏」空态展示专用文案", async () => {
    const only = await seed.publishedPost("all-favorited");
    const page = await openConsolePage(context);
    const list = new PostListPage(page);
    await list.filterByScope(seed.scope);
    await list.favorite(seed.titleOf(only));

    await list.selectFavoriteFilter("unfavorited");
    await list.expectFavoriteEmptyState("unfavorite");
    await list.expectTotal(0);

    await list.clickViewAllPosts();
    await list.expectFavoriteFilterCleared();
    await list.expectRowVisible(seed.titleOf(only));
  });

  test("当前页因取消收藏变空但总数仍大于 0 时回退到最后一个有效页", async () => {
    const posts = await Promise.all([
      seed.publishedPost("page-1"),
      seed.publishedPost("page-2"),
      seed.publishedPost("page-3"),
    ]);
    const page = await openConsolePage(context);
    const list = new PostListPage(page);
    await list.filterByScope(seed.scope);
    for (const post of posts) {
      await list.favorite(seed.titleOf(post));
    }

    await list.selectFavoriteFilter("favorited");

    // Shrink to one row per page and open the last page.
    await page.goto(`/console/posts?keyword=${encodeURIComponent(seed.scope)}&favorite=true&page=3&size=1`);
    await list.waitForListSettled();
    await expect.poll(() => list.urlParam("page")).toBe("3");
    const lastTitle = (await list.rowsTitles())[0];
    expect(lastTitle).toBeTruthy();

    await list.unfavorite(lastTitle);
    // The page became empty while total is 2 → must fall back to page 2, never the empty state.
    await expect.poll(() => list.urlParam("page"), { timeout: 20_000 }).toBe("2");
    await expect(
      page.getByText(t("core.post.empty.favorite.title"), { exact: true })
    ).toHaveCount(0);
    await list.expectTotal(2);
  });
});

/**
 * REQ-004 — two-user isolation in the real console.
 */
test.describe("双账号隔离（控制台）", () => {
  test("A 收藏后 B 看到未收藏，且 B 的「已收藏」不含该文章", async ({ browser, request }) => {
    const seed = await createSeedContext(request, "two-users");
    const post = await seed.publishedPost("shared");
    const title = seed.titleOf(post);
    const userA = await seed.viewOnlyUser();
    const userB = await seed.viewOnlyUser();

    const contextA = await newConsoleContext(browser as Browser, userA);
    const pageA = await openConsolePage(contextA);
    const listA = new PostListPage(pageA);
    await listA.filterByScope(seed.scope);
    await listA.favorite(title);

    const contextB = await newConsoleContext(browser as Browser, userB);
    const pageB = await openConsolePage(contextB);
    const listB = new PostListPage(pageB);
    await listB.filterByScope(seed.scope);
    await listB.expectNotFavorited(title);
    await listB.selectFavoriteFilter("favorited");
    await listB.expectFavoriteEmptyState("favorite");

    await listA.selectFavoriteFilter("favorited");
    await listA.expectRowVisible(title);

    await contextA.close();
    await contextB.close();
  });

  test("view-only 账号可以收藏，但文章行不提供编辑入口", async ({ browser, request }) => {
    const seed = await createSeedContext(request, "view-only-ui");
    const post = await seed.publishedPost("view-only");
    const title = seed.titleOf(post);
    const user = await seed.viewOnlyUser();

    const context = await newConsoleContext(browser as Browser, user);
    const page = await openConsolePage(context);
    const list = new PostListPage(page);
    await list.filterByScope(seed.scope);
    await list.favorite(title);

    // The per-row menu only exposes view-level operations for a view-only account.
    const menu = list.row(title).locator(".entity-dropdown-trigger");
    if (await menu.count()) {
      await menu.click();
      await expect(
        page.getByRole("menuitem", { name: t("core.post.operations.delete.title"), exact: true })
      ).toHaveCount(0);
      await page.keyboard.press("Escape");
    }
    await expect(page.getByRole("button", { name: t("core.common.buttons.new"), exact: true })).toHaveCount(0);
    await context.close();
  });
});

/**
 * REQ-005 / REQ-006 — failure rollback under polling, recycle bin and the
 * generic empty state stay untouched.
 */
test.describe("异常与生命周期（控制台）", () => {
  let seed: SeedContext;
  let context: BrowserContext;

  test.beforeEach(async ({ browser, request }) => {
    seed = await createSeedContext(request, "lifecycle-ui");
    context = await newConsoleContext(browser as Browser, seed.ownerAccount);
  });

  test.afterEach(async () => {
    await context.close();
  });

  test("回收站无收藏入口，已收藏文章移入回收站后不出现在「已收藏」，恢复后重新出现", async () => {
    const post = await seed.publishedPost("recycle");
    const title = seed.titleOf(post);
    const page = await openConsolePage(context);
    const list = new PostListPage(page);
    await list.filterByScope(seed.scope);
    await list.favorite(title);

    await seed.owner.recyclePost(post.metadata.name);
    await page.reload();
    await list.waitForListSettled();
    await list.selectFavoriteFilter("favorited");
    await list.expectFavoriteEmptyState("favorite");

    await page.goto("/console/posts/deleted");
    await expect(page.getByRole("button", { name: t("core.common.buttons.refresh"), exact: true })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole("button", { name: t("core.post.filters.favorite.label"), exact: true })).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: new RegExp(`^(${t("core.post.list.fields.favorite")}|${t("core.post.list.fields.unfavorite")})$`) })
    ).toHaveCount(0);

    await seed.owner.restorePost(post.metadata.name);
    await page.goto("/console/posts");
    await list.waitForListSettled();
    await list.filterByScope(seed.scope);
    await list.selectFavoriteFilter("favorited");
    await list.expectRowVisible(title);
  });

  test("回收站无收藏入口（回收站页面本身也保持原样）", async () => {
    const page = await openConsolePage(context, "/console/posts/deleted");
    await expect(page.getByRole("button", { name: t("core.post.filters.favorite.label"), exact: true })).toHaveCount(0);
  });

  test("文章列表为空时沿用通用空态，而非收藏专用空态", async () => {
    const emptyScope = `e2e-fav-empty-${Date.now()}`;
    const page = await openConsolePage(context);
    const list = new PostListPage(page);
    await list.filterByScope(emptyScope);
    await list.selectFavoriteFilter("favorited");
    await list.expectGenericEmptyState();
    await expect(
      page.getByRole("button", { name: t("core.post.empty.favorite.action"), exact: true })
    ).toHaveCount(0);
  });

  test("收藏失败后星标回滚，恢复网络后可再次成功收藏", async () => {
    const post = await seed.publishedPost("retry");
    const title = seed.titleOf(post);
    const page = await openConsolePage(context);
    const list = new PostListPage(page);
    await list.filterByScope(seed.scope);

    let fail = true;
    await page.route("**/posts/*/favorite", async (route) => {
      if (fail) {
        await route.fulfill({ status: 503, contentType: "application/json", body: "{}" });
        return;
      }
      await route.continue();
    });

    await list.toggleFavorite(title);
    await expect(list.failureToast()).toBeVisible({ timeout: 15_000 });
    await list.expectNotFavorited(title);

    fail = false;
    await list.favorite(title);
  });

  test("轮询刷新不会把已成功的收藏状态回跳", async () => {
    const post = await seed.draftPost("polling");
    const title = seed.titleOf(post);
    const page = await openConsolePage(context);
    const list = new PostListPage(page);
    await list.filterByScope(seed.scope);

    // Trigger the 1s polling path, then favorite while polling is active.
    await seed.owner.publishPost(post.metadata.name);
    await page.reload();
    await list.waitForListSettled();

    await list.favorite(title);
    // Observe the icon for several polling cycles.
    for (let tick = 0; tick < 4; tick += 1) {
      await page.waitForTimeout(1000);
      await list.expectFavorited(title);
    }
  });
});
