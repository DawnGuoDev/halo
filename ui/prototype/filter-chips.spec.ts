import PostFilterChips from "@console/modules/contents/posts/components/PostFilterChips.vue";
import { hasActivePostFilters } from "@console/modules/contents/posts/utils/post-filter-chips";
import { consoleApiClient } from "@halo-dev/api-client";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { createI18n } from "vue-i18n";
import zhCN from "@/locales/zh-CN.json";
import { installPostListPreview } from "./mock/post-list";

function mountChips(props: Record<string, string | undefined>) {
  const i18n = createI18n({
    legacy: false,
    locale: "zh-CN",
    fallbackLocale: "zh-CN",
    messages: { "zh-CN": zhCN as Record<string, string> },
  });
  const queryClient = new QueryClient();
  return mount(PostFilterChips, {
    props,
    global: {
      plugins: [i18n, [VueQueryPlugin, { queryClient }]],
    },
  });
}

describe("PostFilterChips", () => {
  it("is hidden when no filter is active", () => {
    const wrapper = mountChips({ keyword: "", status: undefined });
    expect(wrapper.find(".post-filter-chips").exists()).toBe(false);
  });

  it("shows readable names and only clears the removed filter", async () => {
    installPostListPreview();

    const categories =
      await consoleApiClient.content.category.listCategoryTree();
    expect(
      categories.data.map((node) => node.category.spec.displayName)
    ).toEqual(["原型指南", "版本发布"]);

    const wrapper = mountChips({
      keyword: "原型",
      status: "content.halo.run/published=true",
      category: "release-notes",
      tag: undefined,
    });
    await flushPromises();

    const chips = wrapper.findAll("[data-filter-chip]");
    expect(chips.map((chip) => chip.attributes("data-filter-chip"))).toEqual([
      "keyword",
      "status",
      "category",
    ]);
    expect(wrapper.text()).toContain("关键词：原型");
    expect(wrapper.text()).toContain("状态：已发布");
    expect(wrapper.text()).toContain("分类：版本发布");
    expect(wrapper.text()).toContain("清除全部");

    await chips[1].find("button").trigger("click");
    expect(wrapper.emitted("remove")?.[0]).toEqual(["status"]);
    expect(wrapper.emitted("clear")).toBeUndefined();

    await wrapper.find(".post-filter-chips__clear").trigger("click");
    expect(wrapper.emitted("clear")).toHaveLength(1);
  });

  it("detects active filters in the route query", () => {
    expect(hasActivePostFilters({})).toBe(false);
    expect(hasActivePostFilters({ keyword: "" })).toBe(false);
    expect(hasActivePostFilters({ sort: "spec.publishTime,desc" })).toBe(false);
    expect(hasActivePostFilters({ tag: "prototype" })).toBe(true);
  });
});
