import { expect, type Locator, type Page } from "@playwright/test";
import { t } from "../support/i18n";

/**
 * Page object for the console post list (`/console/posts`).
 *
 * Selectors follow the accessible contract the Spec defines — the star's
 * `aria-label` / `aria-pressed`, the filter trigger label, visible copy and the
 * URL — instead of Tailwind classes, which may be restyled.
 */
export class PostListPage {
  constructor(readonly page: Page) {}

  async open(pathname = "/console/posts") {
    await this.page.goto(pathname);
    await expect(this.refreshButton()).toBeVisible({ timeout: 30_000 });
    await this.waitForListSettled();
  }

  refreshButton(): Locator {
    return this.page.getByRole("button", { name: t("core.common.buttons.refresh"), exact: true });
  }

  searchInput(): Locator {
    return this.page.getByPlaceholder(t("core.common.placeholder.search"));
  }

  /** Restricts the list to the posts created by one E2E scope. */
  async filterByScope(scope: string) {
    const input = this.searchInput();
    await input.fill(scope);
    await input.press("Enter");
    await expect.poll(() => this.urlParam("keyword"), { timeout: 15_000 }).toBe(scope);
    await this.waitForListSettled();
  }

  async waitForListSettled() {
    const spinner = this.refreshButton().locator("svg.animate-spin");
    await expect(spinner).toHaveCount(0, { timeout: 20_000 });
  }

  /** A list row identified by its title link. */
  row(title: string): Locator {
    return this.page
      .locator("tr.entity-wrapper")
      .filter({ has: this.page.getByRole("link", { name: title, exact: true }) })
      .first();
  }

  async expectRowVisible(title: string) {
    await expect(this.row(title)).toBeVisible({ timeout: 15_000 });
  }

  async expectRowHidden(title: string) {
    await expect(this.row(title)).toHaveCount(0, { timeout: 15_000 });
  }

  /** The favorite star of a row; matches either tooltip state. */
  star(title: string): Locator {
    const favorite = escapeRegExp(t("core.post.list.fields.favorite"));
    const unfavorite = escapeRegExp(t("core.post.list.fields.unfavorite"));
    return this.row(title).getByRole("button", { name: new RegExp(`^(${favorite}|${unfavorite})$`) });
  }

  async expectFavorited(title: string) {
    const star = this.row(title).getByRole("button", {
      name: t("core.post.list.fields.unfavorite"),
      exact: true,
    });
    await expect(star).toBeVisible({ timeout: 15_000 });
    await expect(star).toHaveAttribute("aria-pressed", "true");
  }

  async expectNotFavorited(title: string) {
    const star = this.row(title).getByRole("button", {
      name: t("core.post.list.fields.favorite"),
      exact: true,
    });
    await expect(star).toBeVisible({ timeout: 15_000 });
    await expect(star).toHaveAttribute("aria-pressed", "false");
  }

  async toggleFavorite(title: string) {
    await this.star(title).click();
  }

  async favorite(title: string) {
    await this.expectNotFavorited(title);
    await this.toggleFavorite(title);
    await this.expectFavorited(title);
  }

  async unfavorite(title: string) {
    await this.expectFavorited(title);
    await this.toggleFavorite(title);
    await this.expectNotFavorited(title);
  }

  favoriteFilter(): Locator {
    return this.page.getByRole("button", {
      name: new RegExp(`^${escapeRegExp(t("core.post.filters.favorite.label"))}`),
    });
  }

  /** Selects 已收藏 / 未收藏 / 全部 in the 收藏 dropdown and waits for the URL. */
  async selectFavoriteFilter(option: "favorited" | "unfavorited" | "all") {
    await this.favoriteFilter().click();
    const label =
      option === "favorited"
        ? t("core.post.filters.favorite.items.favorited")
        : option === "unfavorited"
          ? t("core.post.filters.favorite.items.unfavorited")
          : t("core.common.filters.item_labels.all");
    await this.page.getByRole("option", { name: label, exact: true }).click();
    await expect
      .poll(() => this.urlParam("favorite"), { timeout: 15_000 })
      .toBe(option === "all" ? null : option === "favorited" ? "true" : "false");
    await this.waitForListSettled();
  }

  urlParam(name: string): string | null {
    return new URL(this.page.url()).searchParams.get(name);
  }

  /** Titles of the visible list rows, in DOM order. */
  async rowsTitles(): Promise<string[]> {
    return this.page.locator("tr.entity-wrapper .entity-field-title-body a.entity-field-title").allInnerTexts();
  }

  /** Asserts the favorite filter was cleared from the URL. */
  async expectFavoriteFilterCleared() {
    await expect.poll(() => this.urlParam("favorite"), { timeout: 15_000 }).toBeNull();
  }

  paginationNext(): Locator {
    return this.page.getByRole("button", { name: "Next page" });
  }

  paginationPrevious(): Locator {
    return this.page.getByRole("button", { name: "Previous page" });
  }

  async waitForFirstPage() {
    await expect.poll(async () => Number(this.urlParam("page") ?? "1"), { timeout: 15_000 }).toBe(1);
    await this.waitForListSettled();
  }

  async totalText(): Promise<string> {
    return (await this.page.locator(".pagination__total").innerText()).trim();
  }

  async total(): Promise<number> {
    const text = await this.totalText();
    const match = text.match(/(\d+)/);
    if (!match) {
      throw new Error(`unable to parse the total from "${text}"`);
    }
    return Number(match[1]);
  }

  async expectTotal(total: number) {
    await expect.poll(() => this.total(), { timeout: 15_000 }).toBe(total);
  }

  /** Compares the list state so polling refetches can safely finish. */
  async expectTotalStable(total: number) {
    await this.expectTotal(total);
    await this.waitForListSettled();
    await this.expectTotal(total);
  }

  emptyState(): Locator {
    return this.page.locator(".empty-wrapper").first();
  }

  async expectFavoriteEmptyState(kind: "favorite" | "unfavorite") {
    const title =
      kind === "favorite"
        ? t("core.post.empty.favorite.title")
        : t("core.post.empty.unfavorite.title");
    const description =
      kind === "favorite"
        ? t("core.post.empty.favorite.description")
        : t("core.post.empty.unfavorite.description");
    await expect(this.page.getByText(title, { exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(this.page.getByText(description, { exact: true })).toBeVisible();
    await expect(
      this.page.getByRole("button", { name: t("core.post.empty.favorite.action"), exact: true })
    ).toBeVisible();
  }

  async expectGenericEmptyState() {
    await expect(this.page.getByText(t("core.post.empty.title"), { exact: true })).toBeVisible();
    await expect(this.page.getByText(t("core.post.empty.favorite.title"), { exact: true })).toHaveCount(0);
    await expect(this.page.getByText(t("core.post.empty.unfavorite.title"), { exact: true })).toHaveCount(0);
  }

  async clickViewAllPosts() {
    await this.page
      .getByRole("button", { name: t("core.post.empty.favorite.action"), exact: true })
      .click();
    await this.waitForListSettled();
  }

  rowCheckbox(title: string): Locator {
    return this.row(title).getByRole("checkbox").first();
  }

  titleLink(title: string): Locator {
    return this.row(title).getByRole("link", { name: title, exact: true });
  }

  failureToast(): Locator {
    return this.page.getByText(t("core.post.toast.favorite_failed"), { exact: true });
  }
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
