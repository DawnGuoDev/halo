import fs from "node:fs";
import path from "node:path";
import { expect, type APIRequestContext } from "@playwright/test";
import { baseURL } from "./env";

export type HaloAccount = { username: string; password: string; email?: string };

const CONSOLE_PREFIX = "/apis/api.console.halo.run/v1alpha1";
const CORE_PREFIX = "/apis/content.halo.run/v1alpha1";
const SECURITY_PREFIX = "/apis/security.halo.run/v1alpha1";

/** Credentials of the owner account created by scripts/prepare-halo.mjs. */
export function ownerAccount(): HaloAccount {
  const fromEnv = process.env.HALO_E2E_OWNER_PASSWORD;
  if (fromEnv) {
    return {
      username: process.env.HALO_E2E_OWNER_USERNAME || "e2e-owner",
      password: fromEnv,
      email: "e2e-owner@example.com",
    };
  }
  // Lazily read the file written by the harness so specs never need the password baked in.
  const dir =
    process.env.HALO_E2E_RUNTIME_DIR || path.join(__dirname, "..", "build", ".e2e-runtime");
  const parsed = JSON.parse(fs.readFileSync(path.join(dir, "owner.json"), "utf8")) as HaloAccount;
  return { username: parsed.username, password: parsed.password, email: parsed.email };
}

export function basicAuth(account: HaloAccount): { Authorization: string } {
  return {
    Authorization: `Basic ${Buffer.from(`${account.username}:${account.password}`).toString("base64")}`,
  };
}

export class HaloApi {
  constructor(readonly request: APIRequestContext) {}

  static async as(request: APIRequestContext, account: HaloAccount): Promise<HaloApi> {
    const api = new HaloApi(request);
    api.asAccount = account;
    return api;
  }

  asAccount?: HaloAccount;

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    return {
      Accept: "application/json",
      ...(this.asAccount ? basicAuth(this.asAccount) : {}),
      ...extra,
    };
  }

  async listPosts(query: Record<string, string | number | boolean | undefined>): Promise<{
    total: number;
    page: number;
    size: number;
    hasNext: boolean;
    hasPrevious: boolean;
    items: ListedPost[];
    status: number;
  }> {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined) {
        params.set(key, String(value));
      }
    });
    const response = await this.request.get(`${CONSOLE_PREFIX}/posts?${params.toString()}`, {
      headers: this.headers(),
    });
    const status = response.status();
    const body = status === 200 ? ((await response.json()) as ListResult<ListedPost>) : undefined;
    return {
      status,
      total: body?.total ?? -1,
      page: body?.page ?? -1,
      size: body?.size ?? -1,
      hasNext: body?.hasNext ?? false,
      hasPrevious: body?.hasPrevious ?? false,
      items: body?.items ?? [],
    };
  }

  async favoritePost(name: string, extraHeaders: Record<string, string> = {}) {
    return this.request.post(`${CONSOLE_PREFIX}/posts/${encodeURIComponent(name)}/favorite`, {
      headers: this.headers(extraHeaders),
    });
  }

  async unfavoritePost(name: string, extraHeaders: Record<string, string> = {}) {
    return this.request.delete(`${CONSOLE_PREFIX}/posts/${encodeURIComponent(name)}/favorite`, {
      headers: this.headers(extraHeaders),
    });
  }

  /** Creates an empty draft; callers typically publish it afterwards. */
  async createDraft(input: { name: string; title: string; visible?: "PUBLIC" | "PRIVATE" }) {
    const response = await this.request.post(`${CORE_PREFIX}/posts`, {
      headers: this.headers({ "Content-Type": "application/json" }),
      data: {
        apiVersion: "content.halo.run/v1alpha1",
        kind: "Post",
        metadata: { name: input.name, generateName: "post-" },
        spec: {
          title: input.title,
          slug: input.name,
          visible: input.visible ?? "PUBLIC",
          template: "",
          cover: "",
          excerpt: { autoGenerate: true, raw: "" },
          categories: [],
          tags: [],
          pinned: false,
          allowComment: true,
          deleted: false,
          publish: false,
          priority: 0,
        },
      },
    });
    expect(response.status(), `create post ${input.name}`).toBe(201);
    return (await response.json()) as HaloPost;
  }

  async publishPost(name: string) {
    const response = await this.request.post(`${CONSOLE_PREFIX}/posts/${encodeURIComponent(name)}/publish`, {
      headers: this.headers({
        "Content-Type": "application/json",
        "X-Request-Number": "1",
      }),
      data: {},
      timeout: 60_000,
    });
    expect(response.status(), `publish post ${name}: ${await response.text()}`).toBeLessThan(300);
  }

  /** Moves a post to the recycle bin (sets `spec.deleted`). */
  async recyclePost(name: string) {
    const response = await this.request.put(`${CONSOLE_PREFIX}/posts/${encodeURIComponent(name)}/recycle`, {
      headers: this.headers(),
    });
    expect(response.status(), `recycle post ${name}`).toBe(200);
  }

  /** Restores a post from the recycle bin (sets `spec.deleted=false`). */
  async restorePost(name: string) {
    const response = await this.request.patch(`${CORE_PREFIX}/posts/${encodeURIComponent(name)}`, {
      headers: this.headers({ "Content-Type": "application/json-patch+json" }),
      data: [{ op: "add", path: "/spec/deleted", value: false }],
    });
    expect(response.status(), `restore post ${name}`).toBe(200);
  }

  /** Permanent deletion; the reconciler cleans favorites up afterwards. */
  async deletePost(name: string) {
    const response = await this.request.delete(`${CORE_PREFIX}/posts/${encodeURIComponent(name)}`, {
      headers: this.headers(),
    });
    expect([200, 202, 204], `delete post ${name}`).toContain(response.status());
  }

  async createUser(account: HaloAccount) {
    const response = await this.request.post(`${CONSOLE_PREFIX}/users`, {
      headers: this.headers({ "Content-Type": "application/json" }),
      data: {
        name: account.username,
        password: account.password,
        email: account.email ?? `${account.username}@example.com`,
        displayName: account.username,
      },
    });
    expect(response.status(), `create user ${account.username}: ${await response.text()}`).toBe(200);
  }

  async grantRoles(username: string, roles: string[]) {
    const response = await this.request.post(`${CONSOLE_PREFIX}/users/${encodeURIComponent(username)}/permissions`, {
      headers: this.headers({ "Content-Type": "application/json" }),
      data: { roles },
    });
    expect(response.status(), `grant roles ${roles.join(",")} to ${username}`).toBe(200);
  }

  /** Bundles authoritative access (view + manage) with the view-only role template. */
  async listRoles(): Promise<Array<{ name: string; labels: Record<string, string> }>> {
    const response = await this.request.get(`${SECURITY_PREFIX}/roles?size=100`, { headers: this.headers() });
    expect(response.status(), "list roles").toBe(200);
    const body = (await response.json()) as { items: Array<{ metadata: { name: string; labels?: Record<string, string> } }> };
    return body.items.map((item) => ({ name: item.metadata.name, labels: item.metadata.labels ?? {} }));
  }

  async listUsers(query: Record<string, string> = {}) {
    const params = new URLSearchParams(query);
    return this.request.get(`${CONSOLE_PREFIX}/users?${params.toString()}`, { headers: this.headers() });
  }

  get baseURL() {
    return baseURL;
  }
}

export interface HaloPost {
  apiVersion: string;
  kind: "Post";
  metadata: { name: string; labels?: Record<string, string>; [key: string]: unknown };
  spec: Record<string, unknown> & { title: string; deleted?: boolean };
}

export interface ListedPost {
  post: HaloPost;
  categories?: unknown[];
  tags?: unknown[];
  contributors?: unknown[];
  owner?: unknown;
  stats?: Record<string, number>;
  favorite?: boolean | null;
}

export interface ListResult<T> {
  total: number;
  page: number;
  size: number;
  hasNext: boolean;
  hasPrevious: boolean;
  items: T[];
}
