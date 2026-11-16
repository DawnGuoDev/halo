import type { ListedPost } from "@halo-dev/api-client";
import messages from "@intlify/unplugin-vue-i18n/messages";
import { VueQueryPlugin } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { createI18n } from "vue-i18n";
import FavoriteField from "../FavoriteField.vue";

const mocks = vi.hoisted(() => ({
  favoritePost: vi.fn(),
  unfavoritePost: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@halo-dev/api-client", () => ({
  consoleApiClient: {
    content: {
      post: {
        favoritePost: mocks.favoritePost,
        unfavoritePost: mocks.unfavoritePost,
      },
    },
  },
}));

vi.mock("@halo-dev/components", () => ({
  IconStarFill: { name: "IconStarFill", render: () => null },
  IconStarLine: { name: "IconStarLine", render: () => null },
  Toast: { error: mocks.toastError },
}));

function createListedPost(favorite = false): ListedPost {
  return {
    post: {
      apiVersion: "content.halo.run/v1alpha1",
      kind: "Post",
      metadata: {
        name: "test-post",
      },
      spec: {
        title: "Test post",
        slug: "test-post",
        deleted: false,
        publish: false,
        pinned: false,
        allowComment: true,
        visible: "PUBLIC",
        priority: 0,
        excerpt: {
          autoGenerate: true,
          raw: "",
        },
        categories: [],
        tags: [],
        htmlMetas: [],
      },
    },
    categories: [],
    tags: [],
    contributors: [],
    owner: {
      name: "fake-user",
      displayName: "Fake User",
    },
    stats: {
      visit: 0,
      upvote: 0,
      totalComment: 0,
      approvedComment: 0,
    },
    favorite,
  };
}

function mountField(favorite = false) {
  return mount(FavoriteField, {
    props: {
      post: createListedPost(favorite),
    },
    global: {
      plugins: [
        VueQueryPlugin,
        createI18n({
          legacy: false,
          locale: "en",
          messages,
        }),
      ],
      directives: {
        tooltip: () => {},
      },
    },
  });
}

describe("FavoriteField", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.favoritePost.mockResolvedValue({});
    mocks.unfavoritePost.mockResolvedValue({});
  });

  it("should render an accessible unfavorited button", () => {
    const wrapper = mountField();
    const button = wrapper.get("button");

    expect(button.attributes("aria-label")).toBe("Favorite");
    expect(button.attributes("aria-pressed")).toBe("false");
  });

  it("should favorite a post when clicking the empty star", async () => {
    const wrapper = mountField();
    const button = wrapper.get("button");

    await button.trigger("click");
    await flushPromises();

    expect(mocks.favoritePost).toHaveBeenCalledWith({ name: "test-post" });
    expect(button.attributes("aria-pressed")).toBe("true");
    expect(button.attributes("aria-label")).toBe("Unfavorite");
  });

  it("should unfavorite a post when clicking the filled star", async () => {
    const wrapper = mountField(true);
    const button = wrapper.get("button");

    await button.trigger("click");
    await flushPromises();

    expect(mocks.unfavoritePost).toHaveBeenCalledWith({ name: "test-post" });
    expect(button.attributes("aria-pressed")).toBe("false");
  });

  it("should roll back and toast when the request fails", async () => {
    mocks.favoritePost.mockRejectedValueOnce(new Error("failed"));
    const wrapper = mountField();
    const button = wrapper.get("button");

    await button.trigger("click");
    await flushPromises();

    expect(mocks.toastError).toHaveBeenCalledWith(
      "Operation failed, please try again"
    );
    expect(button.attributes("aria-pressed")).toBe("false");
  });
});
