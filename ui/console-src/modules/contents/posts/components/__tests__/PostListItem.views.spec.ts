import type { ListedPost } from "@halo-dev/api-client";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia } from "pinia";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { ref } from "vue";
import { createI18n } from "vue-i18n";
import ViewsField from "../entity-fields/ViewsField.vue";
import PostListItem from "../PostListItem.vue";

vi.mock("@halo-dev/ui-shared", () => ({
  utils: {
    permission: { has: () => true },
    date: { format: () => "Full date", timeAgo: () => "Just now" },
  },
}));

function createPost(stats: unknown): ListedPost {
  return {
    categories: [],
    contributors: [],
    owner: { kind: "User", name: "owner", displayName: "Owner" },
    post: {
      apiVersion: "content.halo.run/v1alpha1",
      kind: "Post",
      metadata: { name: "test-post", labels: {} },
      spec: {
        title: "Test post",
        slug: "test-post",
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
    stats,
    tags: [],
  } as unknown as ListedPost;
}

async function mountListItem(stats: unknown) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = mount(PostListItem, {
    props: { post: createPost(stats) },
    global: {
      plugins: [
        createPinia(),
        [VueQueryPlugin, { queryClient: client }],
        createI18n({
          legacy: false,
          locale: "en",
          missingWarn: false,
          fallbackWarn: false,
          messages: {
            en: {
              "core.post.list.fields.views": "Visits",
              "core.post.list.fields.comments": "{comments} Comments",
              "core.post.list.fields.pinned": "Pinned",
              "core.post.filters.status.items.published": "Published",
              "core.post.filters.status.items.draft": "Draft",
              "core.post.filters.visible.items.public": "Public",
              "core.post.filters.visible.items.private": "Private",
            },
          },
        }),
      ],
      mocks: { $route: {} },
      stubs: {
        RouterLink: { template: "<a><slot /></a>" },
        SubjectQueryCommentListModal: true,
      },
      directives: { tooltip: () => {}, permission: () => {} },
    },
  });
  await flushPromises();
  await flushPromises();
  return wrapper;
}

describe("PostListItem views field", () => {
  it("renders the views field between publish status and visibility", async () => {
    const wrapper = await mountListItem({ visit: 42 });
    const endFields = wrapper.findAll(".entity-end > *");
    const viewsIndex = endFields.findIndex((field) =>
      field.findComponent(ViewsField).exists()
    );

    expect(viewsIndex).toBeGreaterThan(-1);
    expect(endFields[viewsIndex].text()).toContain("42");
    // Contributors (10) -> PublishStatus (20) -> Views (25) -> Visible (30)
    // First end field is the Contributors field.
    expect(viewsIndex).toBe(2);
    expect(
      endFields[viewsIndex].get("[aria-label]").attributes("aria-label")
    ).toBe("Visits");
  });

  it("renders 0 and no legacy visits text in the title area", async () => {
    const wrapper = await mountListItem({});
    expect(wrapper.get(".entity-end").findComponent(ViewsField).exists()).toBe(
      true
    );
    expect(wrapper.text()).not.toContain("访问量");
    expect(wrapper.text()).not.toContain("undefined");
    expect(wrapper.get(".entity-end").text()).toContain("0");
  });
});

describe("PostListItem views field request compatibility", () => {
  afterEach(() => {
    vi.doUnmock("@halo-dev/api-client");
    vi.doUnmock("@vueuse/router");
    vi.doUnmock("@/components/filter/CategoryFilterDropdown.vue");
    vi.doUnmock("@/components/filter/TagFilterDropdown.vue");
    vi.doUnmock("@/components/filter/UserFilterDropdown.vue");
    vi.doUnmock("@/components/entity-fields/EntityFieldItems.vue");
    vi.resetModules();
  });

  it("keeps the list request params unchanged while rendering views", async () => {
    const listPosts = vi.fn().mockResolvedValue({
      data: { items: [], total: 0, hasNext: false, hasPrevious: false },
    });
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
    vi.resetModules();

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

    const { default: FreshPostList } = await import("../../PostList.vue");
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    mount(FreshPostList, {
      global: {
        plugins: [
          createPinia(),
          [VueQueryPlugin, { queryClient: client }],
          createI18n({
            legacy: false,
            locale: "en",
            missingWarn: false,
            fallbackWarn: false,
            messages: { en: {} },
          }),
        ],
        mocks: {
          $route: { query: {} },
          $router: { push: vi.fn() },
        },
        stubs: {
          PostListItem: true,
          PostSettingModal: true,
          PostBatchSettingModal: true,
          RouterLink: { template: "<a><slot /></a>" },
        },
        directives: { tooltip: () => {}, permission: () => {} },
      },
    });
    await flushPromises();

    expect(listPosts).toHaveBeenCalledTimes(1);
    const params = listPosts.mock.calls[0][0];
    expect(params).toMatchObject({ page: 1, size: 20, sort: [] });
    const serialized = JSON.stringify(params).toLowerCase();
    expect(serialized).not.toContain("visit");
    expect(serialized).not.toContain("views");
  });
});
