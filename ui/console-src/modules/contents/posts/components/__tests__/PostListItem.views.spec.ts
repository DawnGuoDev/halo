import type { ListedPost } from "@halo-dev/api-client";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia } from "pinia";
import { describe, expect, it, vi } from "vite-plus/test";
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
