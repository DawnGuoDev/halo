import type { ListedPost } from "@halo-dev/api-client";
import messages from "@intlify/unplugin-vue-i18n/messages";
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vite-plus/test";
import { createI18n } from "vue-i18n";
import ViewsField from "../ViewsField.vue";

vi.mock("@halo-dev/ui-shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@halo-dev/ui-shared")>();
  return {
    ...actual,
    utils: { ...actual.utils, permission: { has: () => true } },
  };
});

function createPost(stats?: unknown): ListedPost {
  return {
    post: {
      apiVersion: "content.halo.run/v1alpha1",
      kind: "Post",
      metadata: { name: "test-post" },
      spec: {
        title: "Test post",
        slug: "test-post",
        template: "",
        cover: "",
        deleted: false,
        publish: true,
        publishTime: "2026-01-01T00:00:00Z",
        pinned: false,
        allowComment: true,
        visible: "PUBLIC",
        priority: 0,
        excerpt: { autoGenerate: true, raw: "" },
        categories: [],
        tags: [],
        htmlMetas: [],
      },
    },
    categories: [],
    tags: [],
    contributors: [],
    owner: {
      kind: "User",
      name: "owner",
      displayName: "Owner",
    },
    stats,
  } as unknown as ListedPost;
}

function mountField(post: ListedPost) {
  return mount(ViewsField, {
    props: { post },
    global: {
      stubs: { "i18n-t": true },
      plugins: [
        createI18n({
          legacy: false,
          locale: "en",
          messages,
        }),
      ],
      directives: { tooltip: {} },
    },
  });
}

describe("ViewsField", () => {
  it("renders visit count from post.stats.visit", () => {
    const wrapper = mountField(createPost({ visit: 128 }));
    expect(wrapper.text()).toBe("128");
    expect(wrapper.find("[aria-label]").attributes("aria-label")).toBe(
      "Visits"
    );
  });

  it("renders 0 without thousand separators for large counts", () => {
    expect(mountField(createPost({ visit: 10240 })).text()).toBe("10240");
    expect(mountField(createPost({ visit: 0 })).text()).toBe("0");
  });

  it("falls back to 0 when visit is missing", () => {
    expect(mountField(createPost({})).text()).toBe("0");
    expect(mountField(createPost(undefined)).text()).toBe("0");
    expect(mountField(createPost(null)).text()).toBe("0");
  });

  it("falls back to 0 when visit is null or invalid", () => {
    expect(mountField(createPost({ visit: null })).text()).toBe("0");
    expect(mountField(createPost({ visit: -1 })).text()).toBe("0");
    expect(mountField(createPost({ visit: NaN })).text()).toBe("0");
    expect(mountField(createPost({ visit: Infinity })).text()).toBe("0");
    expect(mountField(createPost({ visit: "12" })).text()).toBe("0");
  });

  it("is not interactive", () => {
    const wrapper = mountField(createPost({ visit: 7 }));
    expect(wrapper.find("button").exists()).toBe(false);
    expect(wrapper.find("a").exists()).toBe(false);
  });
});
