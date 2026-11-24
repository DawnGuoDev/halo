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
    expect(initial.data.items).toHaveLength(6);
    expect(initial.data.total).toBe(6);

    const filtered = await consoleApiClient.content.post.listPosts({
      page: 1,
      size: 20,
      keyword: "原型",
    });
    expect(filtered.data.items).toHaveLength(1);
    expect(filtered.data.items[0].post.spec.title).toBe("Halo 原型初始化指南");
    expect(filtered.data.total).toBe(1);
  });

  it("filters by category, tag, contributor and visibility selectors", async () => {
    const reviewed = await consoleApiClient.content.post.listPosts({
      page: 1,
      size: 20,
      fieldSelector: ["status.contributors=demo-reviewer"],
    });
    expect(reviewed.data.items.map((item) => item.post.spec.title)).toEqual([
      "使用 Markdown 创建第一篇博客",
      "Halo 2.28 版本发布说明",
    ]);

    const privatePosts = await consoleApiClient.content.post.listPosts({
      page: 1,
      size: 20,
      fieldSelector: ["spec.visible=PRIVATE"],
    });
    expect(privatePosts.data.items.map((item) => item.post.spec.title)).toEqual(
      ["私有：下季度内容规划"]
    );

    const sorted = await consoleApiClient.content.post.listPosts({
      page: 1,
      size: 20,
      sort: ["spec.publishTime,asc"],
    });
    const publishTimes = sorted.data.items
      .map((item) => item.post.spec.publishTime)
      .filter(Boolean);
    expect(publishTimes).toEqual([...publishTimes].sort());
  });

  it("provides only the category tree and tag reads required by the page", async () => {
    const categories = await request(
      "/apis/api.console.halo.run/v1alpha1/categories/-/tree"
    );
    expect(categories.data[0].category.spec.displayName).toBe("原型指南");
    expect(categories.data[1].category.spec.displayName).toBe("版本发布");

    const tags = await request("/apis/api.console.halo.run/v1alpha1/tags", {
      page: 1,
      size: 1000,
    });
    expect(tags.data.items.map((tag) => tag.spec.displayName)).toEqual([
      "原型",
      "前端",
    ]);
    expect(tags.data.hasNext).toBe(false);
  });

  it("resolves the contributor display name for the filter chip", async () => {
    const users = await request("/apis/api.console.halo.run/v1alpha1/users", {
      page: 1,
      size: 30,
    });
    expect(users.data.items.map((item) => item.user.spec.displayName)).toEqual([
      "演示作者",
      "评审同学",
    ]);

    const detail = await request(
      "/apis/api.console.halo.run/v1alpha1/users/demo-reviewer"
    );
    expect(detail.data.user.spec.displayName).toBe("评审同学");
  });

  it("fails uncovered reads and writes without a network fallback", async () => {
    await expect(
      request("/apis/api.console.halo.run/v1alpha1/posts", {}, "POST")
    ).rejects.toThrow("no network fallback is allowed");
    await expect(
      request("/apis/api.console.halo.run/v1alpha1/posts/frontend-checklist")
    ).rejects.toThrow("no network fallback is allowed");
    await expect(
      request("/apis/api.console.halo.run/v1alpha1/users/unknown-user")
    ).rejects.toThrow("is not in the demo data");
  });
});
