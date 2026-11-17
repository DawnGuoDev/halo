import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { repoRoot } from "../support/env";

/**
 * REQ-002 / REQ-005 / REQ-006 — static accessibility and filter-placement
 * contract of the console post list source. These guard the parts of the Spec
 * that need an element tree assertion (precedence inside the title extra area,
 * focus outline, disabled semantics) without racing the live list.
 */
const TITLE_FIELD = path.join(
  repoRoot,
  "ui",
  "console-src",
  "modules",
  "contents",
  "posts",
  "components",
  "entity-fields",
  "TitleField.vue"
);
const FAVORITE_FIELD = path.join(
  repoRoot,
  "ui",
  "console-src",
  "modules",
  "contents",
  "posts",
  "components",
  "entity-fields",
  "FavoriteField.vue"
);
const POST_LIST = path.join(repoRoot, "ui", "console-src", "modules", "contents", "posts", "PostList.vue");

test.describe("收藏控件可访问性与位置契约", () => {
  test("星标位于标题 extra 区域，且在未发布状态点与外链图标之前", () => {
    const source = fs.readFileSync(TITLE_FIELD, "utf8");
    const extra = source.slice(source.indexOf("#extra"));
    const favoriteIndex = extra.indexOf("FavoriteField");
    const statusIndex = extra.indexOf("VStatusDot");
    const externalIndex = extra.indexOf("externalUrl");
    expect(favoriteIndex, "FavoriteField must be in the title extra area").toBeGreaterThan(-1);
    expect(favoriteIndex).toBeLessThan(statusIndex);
    expect(favoriteIndex).toBeLessThan(externalIndex);
  });

  test("星标可聚焦、有 outline、aria-label/aria-pressed 与处理中态", () => {
    const source = fs.readFileSync(FAVORITE_FIELD, "utf8");
    expect(source).toMatch(/:aria-label=/);
    expect(source).toMatch(/:aria-pressed=/);
    expect(source).toMatch(/:disabled="pending"/);
    expect(source).toMatch(/focus-visible:outline-2/);
    expect(source).toMatch(/outline-primary/);
    expect(source).toMatch(/opacity-60/);
    expect(source).toMatch(/cursor-wait/);
    // The click must not bubble to the row/title link or open the editor.
    expect(source).toMatch(/@click\.stop\.prevent/);
    // Icon font sizes are the Spec's 14px visual with a larger hit area.
    expect(source).toMatch(/h-3\.5 w-3\.5/);
    expect(source).toMatch(/h-\[22px\] w-\[22px\]/);
    // Recycle-bin rows must not expose the star.
    expect(source).toMatch(/v-if="!post\.post\.spec\.deleted"/);
  });

  test("筛选区顺序为 可见性 → 收藏 → 分类，且 URL favorite 有归一化", () => {
    const source = fs.readFileSync(POST_LIST, "utf8");
    const visibleIndex = source.indexOf("selectedVisible");
    const favoriteIndex = source.indexOf('v-model="selectedFavorite"');
    const categoryIndex = source.indexOf("selectedCategory");
    expect(visibleIndex).toBeGreaterThan(-1);
    expect(favoriteIndex).toBeGreaterThan(visibleIndex);
    expect(categoryIndex).toBeGreaterThan(favoriteIndex);
    expect(source).toMatch(/value === "true" \|\| value === "false" \? value : undefined/);
  });
});
