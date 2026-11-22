import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vite-plus/test";
import { VEntityField } from "..";

describe("EntityField", () => {
  it("should render", () => {
    expect(mount(VEntityField)).toBeDefined();
  });

  it("keeps the single-line title by default", () => {
    const wrapper = mount(VEntityField, {
      props: { title: "A long post title" },
    });

    expect(wrapper.classes()).not.toContain("entity-field-expandable");
    expect(wrapper.get(".entity-field-title").text()).toBe("A long post title");
  });

  it("opt-in expandable mode clamps to three lines", () => {
    const wrapper = mount(VEntityField, {
      props: { title: "A long post title", expandable: true },
    });

    expect(wrapper.classes()).toContain("entity-field-expandable");
    expect(wrapper.get(".entity-field-title").text()).toBe("A long post title");
  });
});
