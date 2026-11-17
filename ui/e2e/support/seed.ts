import { randomBytes } from "node:crypto";
import type { APIRequestContext } from "@playwright/test";
import { basicAuth, HaloApi, ownerAccount, type HaloAccount, type HaloPost } from "./halo-api";

/**
 * Prefix of every post created by this suite. Articles are filtered by this
 * prefix in the console so assertions do not depend on the site baseline.
 */
export const SEED_PREFIX = "e2e-fav-";

export const VIEW_ONLY_ROLE = "role-template-view-posts";
export const CONTRIBUTOR_ROLE = "role-template-manage-posts";

let scopeCounter = 0;

/** Unique token per test so posts never collide across specs or reruns. */
export function newScope(label = "scope"): string {
  scopeCounter += 1;
  return `${SEED_PREFIX}${label}-${Date.now().toString(36)}-${scopeCounter}-${randomBytes(3).toString("hex")}`;
}

export const password = () => `E2e-${randomBytes(6).toString("hex")}!`;

export function newAccount(username: string): HaloAccount {
  return { username, password: password(), email: `${username}@example.com` };
}

export interface SeedContext {
  owner: HaloApi;
  ownerAccount: HaloAccount;
  scope: string;
  /** Creates a published public post titled with the scope prefix. */
  publishedPost(label: string): Promise<HaloPost>;
  /** Creates a draft (never published) with the given visibility. */
  draftPost(label: string, visible?: "PUBLIC" | "PRIVATE"): Promise<HaloPost>;
  /** Creates a view-only (no manage) account. */
  viewOnlyUser(): Promise<HaloAccount>;
  /** Creates an account with the manage role. */
  managerUser(): Promise<HaloAccount>;
  /** Creates an account without any role template. */
  newUnprivilegedUser(): Promise<HaloAccount>;
  apiFor(account: HaloAccount): Promise<HaloApi>;
  titleOf(post: HaloPost): string;
}

export async function createSeedContext(
  request: APIRequestContext,
  label = "favorite"
): Promise<SeedContext> {
  const ownerCredentials = ownerAccount();
  const owner = await HaloApi.as(request, ownerCredentials);
  const scope = newScope(label);
  const accounts = new Map<string, HaloApi>();

  const apiFor = async (account: HaloAccount) => {
    const existing = accounts.get(account.username);
    if (existing) {
      return existing;
    }
    const created = await HaloApi.as(request, account);
    accounts.set(account.username, created);
    return created;
  };

  const createPost = async (
    suffix: string,
    options: { publish: boolean; visible: "PUBLIC" | "PRIVATE" }
  ) => {
    const name = `${scope}-${suffix}`;
    await owner.createDraft({ name, title: `${scope} ${suffix}`, visible: options.visible });
    if (options.publish) {
      await owner.publishPost(name);
    }
    const response = await request.get(
      `${owner.baseURL}/apis/content.halo.run/v1alpha1/posts/${encodeURIComponent(name)}`,
      { headers: { Accept: "application/json", ...basicAuth(ownerCredentials) } }
    );
    if (response.status() !== 200) {
      throw new Error(`failed to load seeded post ${name}: ${response.status()}`);
    }
    return (await response.json()) as HaloPost;
  };

  return {
    owner,
    ownerAccount: ownerCredentials,
    scope,
    publishedPost: (suffix) => createPost(suffix, { publish: true, visible: "PUBLIC" }),
    draftPost: (suffix, visible = "PUBLIC") => createPost(suffix, { publish: false, visible }),
    titleOf: itemTitle,
    async viewOnlyUser() {
      const account = newAccount(`${scope}-viewer`);
      await owner.createUser(account);
      await owner.grantRoles(account.username, [VIEW_ONLY_ROLE]);
      return account;
    },
    async newUnprivilegedUser() {
      const account = newAccount(`${scope}-plain`);
      await owner.createUser(account);
      return account;
    },
    async managerUser() {
      const account = newAccount(`${scope}-manager`);
      await owner.createUser(account);
      await owner.grantRoles(account.username, [CONTRIBUTOR_ROLE]);
      return account;
    },
    apiFor,
  };
}

function itemTitle(post: HaloPost): string {
  return String(post.spec.title);
}
