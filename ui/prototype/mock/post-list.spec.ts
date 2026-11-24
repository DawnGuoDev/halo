import { consoleApiClient } from "@halo-dev/api-client";
import { AxiosHeaders, type InternalAxiosRequestConfig } from "axios";
import { describe, expect, it } from "vitest";
import { installPostListPreview, postListPreviewAdapter } from "./post-list";

function request(
  url: string,
  params: Record<string, unknown> = {},
  method = "GET"
) {
  return postListPreviewAdapter({
    url,
    method,
    params,
    headers: new AxiosHeaders(),
  } as InternalAxiosRequestConfig);
}

describe("post list preview adapter", () => {
  it("filters real listPosts keyword parameters and preserves the list envelope", async () => {
    installPostListPreview();
    const initial = await consoleApiClient.content.post.listPosts({
      page: 1,
      size: 20,
      keyword: "",
    });
    expect(initial.data.items).toHaveLength(3);
    expect(initial.data.total).toBe(3);

    const filtered = await consoleApiClient.content.post.listPosts({
      page: 1,
      size: 20,
      keyword: "原型",
    });
    expect(filtered.data.items).toHaveLength(1);
    expect(filtered.data.items[0].post.spec.title).toBe("Halo 原型初始化指南");
    expect(filtered.data.total).toBe(1);
  });

  it("provides only the category tree and tag reads required by the page", async () => {
    const categories = await request(
      "/apis/api.console.halo.run/v1alpha1/categories/-/tree"
    );
    expect(categories.data[0].category.spec.displayName).toBe("原型指南");

    const tags = await request(
      "/apis/api.console.halo.run/v1alpha1/tags",
      { page: 1, size: 1000 }
    );
    expect(tags.data.items.map((tag) => tag.spec.displayName)).toEqual([
      "原型",
      "前端",
    ]);
    expect(tags.data.hasNext).toBe(false);
  });

  it("fails uncovered reads and writes without a network fallback", async () => {
    await expect(
      request("/apis/api.console.halo.run/v1alpha1/posts", {}, "POST")
    ).rejects.toThrow("no network fallback is allowed");
    await expect(request("/apis/api.console.halo.run/v1alpha1/users")).rejects.toThrow(
      "Prototype request is not covered: GET /apis/api.console.halo.run/v1alpha1/users"
    );
  });
});
