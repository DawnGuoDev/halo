import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { repoRoot } from "../support/env";

/**
 * 4.5 — every favorite message key exists in all four locales and no locale
 * leaks a raw key or an empty value. Static check: it reads the JSON files that
 * ship with the console bundle, no browser needed.
 */
const REQUIRED_KEYS = [
  "core.post.list.fields.favorite",
  "core.post.list.fields.unfavorite",
  "core.post.filters.favorite.label",
  "core.post.filters.favorite.items.favorited",
  "core.post.filters.favorite.items.unfavorited",
  "core.post.empty.favorite.title",
  "core.post.empty.favorite.description",
  "core.post.empty.unfavorite.title",
  "core.post.empty.unfavorite.description",
  "core.post.empty.favorite.action",
  "core.post.toast.favorite_failed",
  "core.post.toast.favorite_success",
  "core.post.toast.unfavorite_success",
];

const LOCALES = ["zh-CN", "zh-TW", "en", "es"] as const;

function loadLocale(locale: string): Record<string, string> {
  const file = path.join(repoRoot, "ui", "src", "locales", `${locale}.json`);
  return JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, string>;
}

test.describe("收藏文案国际化", () => {
  for (const locale of LOCALES) {
    test(`${locale} 覆盖全部收藏文案且无裸露 key`, () => {
      const messages = loadLocale(locale);
      for (const key of REQUIRED_KEYS) {
        const value = messages[key];
        expect(value, `${locale} is missing ${key}`).toBeTruthy();
        expect(value.trim(), `${locale} has a blank value for ${key}`).not.toBe("");
        expect(value, `${locale} leaks the raw key ${key}`).not.toBe(key);
      }
    });
  }

  test("收藏文案在四种语言下语义互不相同（未误用同一 key）", () => {
    const byLocale = Object.fromEntries(LOCALES.map((locale) => [locale, loadLocale(locale)])) as Record<
      (typeof LOCALES)[number],
      Record<string, string>
    >;
    for (const locale of LOCALES) {
      const messages = byLocale[locale];
      expect(messages["core.post.list.fields.favorite"]).not.toBe(
        messages["core.post.list.fields.unfavorite"]
      );
      expect(messages["core.post.empty.favorite.title"]).not.toBe(
        messages["core.post.empty.unfavorite.title"]
      );
    }
    // Distinct locales should not share identical favorite/unfavorite copy.
    expect(byLocale.en["core.post.list.fields.favorite"]).not.toBe(
      byLocale["zh-CN"]["core.post.list.fields.favorite"]
    );
  });
});
