import type { ListedPost } from "@halo-dev/api-client";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia } from "pinia";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { ref } from "vue";
import { createI18n } from "vue-i18n";

vi.mock("@halo-dev/ui-shared", () => ({
  utils: {
    permission: { has: () => true },
    date: { format: () => "Full date", timeAgo: () => "Just now" },
  },
}));

function createPost(name: string, title: string): ListedPost {
  return {
    categories: [],
    contributors: [],
    owner: { kind: "User", name: "owner", displayName: "Owner" },
    post: {
      apiVersion: "content.halo.run/v1alpha1",
      kind: "Post",
      metadata: { name, labels: {} },
      spec: {
        title,
        slug: name,
        template: "",
        cover: "",
        deleted: false,
        publish: false,
        pinned: false,
        allowComment: true,
        visible: "PUBLIC",
        priority: 0,
        excerpt: { autoGenerate: true, raw: "" },
        categories: [],
        tags: [],
        htmlMetas: [],
      },
      status: {},
    },
    stats: { visit: 0 },
    tags: [],
  } as unknown as ListedPost;
}

const i18nMessages = {
  en: {
    "core.post.list.density.label": "Reading density",
    "core.post.list.density.comfortable": "Comfortable",
    "core.post.list.density.compact": "Compact",
    "core.post.empty.message": "No posts",
    "core.post.empty.title": "Empty",
  },
};

function mockListPosts(items: ListedPost[]) {
  return vi.fn().mockResolvedValue({
    data: {
      items,
      total: items.length,
      hasNext: false,
      hasPrevious: false,
    },
  });
}

async function mountPostList(_listPosts: ReturnType<typeof mockListPosts>) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = mount(
    // Use a dynamic import path compatible with the test setup
    (await import("../../PostList.vue")).default,
    {
      global: {
        plugins: [
          createPinia(),
          [VueQueryPlugin, { queryClient: client }],
          createI18n({
            legacy: false,
            locale: "en",
            missingWarn: false,
            fallbackWarn: false,
            messages: i18nMessages,
          }),
        ],
        mocks: {
          $route: { query: {} },
          $router: { push: vi.fn() },
        },
        stubs: {
          PostListItem: {
            props: ["post", "isSelected"],
            template:
              '<div class="post-list-item-stub">{{ post.post.spec.title }}</div>',
          },
          PostSettingModal: true,
          PostBatchSettingModal: true,
          RouterLink: { template: "<a><slot /></a>" },
        },
        directives: { tooltip: () => {}, permission: () => {} },
      },
    }
  );
  await flushPromises();
  await flushPromises();
  return wrapper;
}

describe("PostList reading density", () => {
  afterEach(() => {
    vi.doUnmock("@halo-dev/api-client");
    vi.doUnmock("@vueuse/router");
    vi.doUnmock("@/components/filter/CategoryFilterDropdown.vue");
    vi.doUnmock("@/components/filter/TagFilterDropdown.vue");
    vi.doUnmock("@/components/filter/UserFilterDropdown.vue");
    vi.doUnmock("@/components/entity-fields/EntityFieldItems.vue");
    vi.resetModules();
  });

  it("defaults to comfortable density", async () => {
    const listPosts = mockListPosts([createPost("p1", "Post 1")]);

    vi.doMock("@halo-dev/api-client", async (importOriginal) => {
      const actual =
        await importOriginal<typeof import("@halo-dev/api-client")>();
      return {
        ...actual,
        consoleApiClient: {
          ...actual.consoleApiClient,
          content: {
            ...actual.consoleApiClient.content,
            post: {
              ...actual.consoleApiClient.content.post,
              listPosts,
            },
          },
        },
      };
    });
    vi.doMock("@vueuse/router", () => ({
      useRouteQuery: (_key: string, defaultValue: unknown) => ref(defaultValue),
    }));
    vi.doMock("@/components/filter/CategoryFilterDropdown.vue", () => ({
      default: { template: "<div />" },
    }));
    vi.doMock("@/components/filter/TagFilterDropdown.vue", () => ({
      default: { template: "<div />" },
    }));
    vi.doMock("@/components/filter/UserFilterDropdown.vue", () => ({
      default: { template: "<div />" },
    }));
    vi.doMock("@/components/entity-fields/EntityFieldItems.vue", () => ({
      default: { template: "<div />" },
    }));

    const wrapper = await mountPostList(listPosts);

    const densityContainer = wrapper.find(".post-list");
    expect(densityContainer.exists()).toBe(true);
    expect(densityContainer.classes()).toContain("post-list");
    expect(densityContainer.classes()).not.toContain("post-list--compact");

    const comfortableRadio = wrapper.find(
      'input[name="post-list-density"][value="comfortable"]'
    );
    expect(comfortableRadio.element.checked).toBe(true);
  });

  it("switches to compact without refetching data", async () => {
    const listPosts = mockListPosts([
      createPost("p1", "Post 1"),
      createPost("p2", "Post 2"),
    ]);

    vi.doMock("@halo-dev/api-client", async (importOriginal) => {
      const actual =
        await importOriginal<typeof import("@halo-dev/api-client")>();
      return {
        ...actual,
        consoleApiClient: {
          ...actual.consoleApiClient,
          content: {
            ...actual.consoleApiClient.content,
            post: {
              ...actual.consoleApiClient.content.post,
              listPosts,
            },
          },
        },
      };
    });
    vi.doMock("@vueuse/router", () => ({
      useRouteQuery: (_key: string, defaultValue: unknown) => ref(defaultValue),
    }));
    vi.doMock("@/components/filter/CategoryFilterDropdown.vue", () => ({
      default: { template: "<div />" },
    }));
    vi.doMock("@/components/filter/TagFilterDropdown.vue", () => ({
      default: { template: "<div />" },
    }));
    vi.doMock("@/components/filter/UserFilterDropdown.vue", () => ({
      default: { template: "<div />" },
    }));
    vi.doMock("@/components/entity-fields/EntityFieldItems.vue", () => ({
      default: { template: "<div />" },
    }));

    const wrapper = await mountPostList(listPosts);

    const callsBefore = listPosts.mock.calls.length;

    // Switch to compact
    const compactRadio = wrapper.find(
      'input[name="post-list-density"][value="compact"]'
    );
    await compactRadio.trigger("change");

    await flushPromises();

    const densityContainer = wrapper.find(".post-list");
    expect(densityContainer.classes()).toContain("post-list--compact");

    // No additional listPosts calls
    expect(listPosts.mock.calls.length).toBe(callsBefore);
  });

  it("renders empty state in both densities", async () => {
    const listPosts = mockListPosts([]);

    vi.doMock("@halo-dev/api-client", async (importOriginal) => {
      const actual =
        await importOriginal<typeof import("@halo-dev/api-client")>();
      return {
        ...actual,
        consoleApiClient: {
          ...actual.consoleApiClient,
          content: {
            ...actual.consoleApiClient.content,
            post: {
              ...actual.consoleApiClient.content.post,
              listPosts,
            },
          },
        },
      };
    });
    vi.doMock("@vueuse/router", () => ({
      useRouteQuery: (_key: string, defaultValue: unknown) => ref(defaultValue),
    }));
    vi.doMock("@/components/filter/CategoryFilterDropdown.vue", () => ({
      default: { template: "<div />" },
    }));
    vi.doMock("@/components/filter/TagFilterDropdown.vue", () => ({
      default: { template: "<div />" },
    }));
    vi.doMock("@/components/filter/UserFilterDropdown.vue", () => ({
      default: { template: "<div />" },
    }));
    vi.doMock("@/components/entity-fields/EntityFieldItems.vue", () => ({
      default: { template: "<div />" },
    }));

    const wrapper = await mountPostList(listPosts);

    // Empty state should be visible
    expect(wrapper.find(".post-list").exists()).toBe(false);
    expect(wrapper.text()).toContain("No posts");

    // Density switch should still be visible and functional
    const compactRadio = wrapper.find(
      'input[name="post-list-density"][value="compact"]'
    );
    expect(compactRadio.exists()).toBe(true);
    await compactRadio.trigger("change");
    await flushPromises();

    // Empty state still visible after switching to compact
    expect(wrapper.text()).toContain("No posts");
  });
});
