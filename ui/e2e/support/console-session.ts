import { expect, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { baseURL, consoleLocale } from "./env";
import type { HaloAccount } from "./halo-api";

/**
 * The console authenticates with the same Basic credentials the HTTP API uses,
 * so the browser can be primed without driving the login form: the API client
 * sends `Authorization: Basic ...` on every request.
 */
export const AUTH_STORAGE_KEY = "Authorization";

export async function newConsoleContext(browser: Browser, account: HaloAccount): Promise<BrowserContext> {
  const token = `Basic ${Buffer.from(`${account.username}:${account.password}`).toString("base64")}`;
  const context = await browser.newContext({
    baseURL,
    locale: "zh-CN",
    extraHTTPHeaders: { Authorization: token },
  });
  await context.addInitScript(
    ([key, value, locale]) => {
      window.localStorage.setItem(key, value);
      window.localStorage.setItem("locale", locale);
    },
    [AUTH_STORAGE_KEY, token, consoleLocale] as const
  );
  return context;
}

export async function openConsolePage(context: BrowserContext, pathname = "/console/posts"): Promise<Page> {
  const page = await context.newPage();
  await page.goto(pathname);
  // The list renders only after the session and permissions resolve.
  await expect(page.getByRole("button", { name: "刷新" })).toBeVisible({ timeout: 30_000 });
  return page;
}

/** Switches the authenticated user of an existing browser context. */
export async function switchUser(context: BrowserContext, account: HaloAccount): Promise<void> {
  const token = `Basic ${Buffer.from(`${account.username}:${account.password}`).toString("base64")}`;
  await context.setExtraHTTPHeaders({ Authorization: token });
  await context.addInitScript(
    ([key, value, locale]) => {
      window.localStorage.setItem(key, value);
      window.localStorage.setItem("locale", locale);
    },
    [AUTH_STORAGE_KEY, token, consoleLocale] as const
  );
}
