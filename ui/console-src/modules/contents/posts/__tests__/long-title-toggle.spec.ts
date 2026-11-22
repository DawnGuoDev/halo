import type { ListedPost } from "@halo-dev/api-client";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vite-plus/test";
import { defineComponent, h, nextTick, ref } from "vue";
import { createI18n } from "vue-i18n";
import TitleField from "../components/entity-fields/TitleField.vue";

// Mirrors the toolbar control in PostList.vue: page-level state is passed to each
// row via PostListItem's `expandTitle` prop; no route query or request involved.
function createHarness() {
  return defineComponent({
    setup() {
      const expand = ref(false);
      return { expand };
    },
    render() {
      return h("div", [
        h(
          "button",
          {
            "data-testid": "toggle",
            "aria-pressed": String(this.expand),
            onClick: () => (this.expand = !this.expand),
          },
          "Expand long titles"
        ),
        h(TitleField, { post: createPost(), expandTitle: this.expand }),
      ]);
    },
  });
}

function createPost(): ListedPost {
  const title =
    "A very long post title that must be clamped to three lines in the console list when expanded";
  return {
    categories: [],
    contributors: [],
    owner: { kind: "User", name: "owner", displayName: "Owner" },
    post: {
      apiVersion: "content.halo.run/v1alpha1",
      kind: "Post",
      metadata: { name: "long-title", labels: {} },
      spec: {
        title,
        slug: "long-title",
        template: "",
        cover: "",
        deleted: false,
        publish: true,
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
    stats: { totalComment: 0, approvedComment: 0, visit: 0 },
    tags: [],
  } as unknown as ListedPost;
}

describe("post list long title display", () => {
  it("keeps the default single-line field and expands on toggle", async () => {
    const wrapper = mount(createHarness(), {
      global: {
        plugins: [
          createI18n({
            legacy: false,
            locale: "en",
            missingWarn: false,
            fallbackWarn: false,
            messages: { en: {} },
          }),
        ],
        stubs: {
          RouterLink: { template: "<a><slot /></a>" },
        },
        directives: { permission: () => {}, tooltip: () => {} },
      },
    });

    const field = () => wrapper.get(".entity-field-wrapper");
    expect(field().classes()).not.toContain("entity-field-expandable");

    await wrapper.get('[data-testid="toggle"]').trigger("click");
    await nextTick();
    expect(
      wrapper.get('[data-testid="toggle"]').attributes("aria-pressed")
    ).toBe("true");
    expect(field().classes()).toContain("entity-field-expandable");
    expect(wrapper.get(".entity-field-title").text()).toBe(
      createPost().post.spec.title
    );

    await wrapper.get('[data-testid="toggle"]').trigger("click");
    await nextTick();
    expect(field().classes()).not.toContain("entity-field-expandable");
  });
});
