import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vite-plus/test";
import { nextTick } from "vue";
import PostListUncategorizedPrototype from "../PostListUncategorizedPrototype.vue";

const SearchInputStub = {
  props: ["modelValue"],
  emits: ["update:modelValue"],
  template: `
    <input
      type="search"
      data-testid="keyword-input"
      :value="modelValue"
      @input="$emit('update:modelValue', $event.target.value)"
    />
  `,
};

const VFilterDropdownStub = {
  props: ["modelValue", "label", "options"],
  emits: ["update:modelValue"],
  template: `
    <select data-testid="status-filter" :value="modelValue" @change="$emit('update:modelValue', $event.target.value)">
      <option value="">全部</option>
      <option value="published">已发布</option>
      <option value="draft">草稿</option>
    </select>
  `,
};

const VSwitchStub = {
  props: ["modelValue"],
  emits: ["update:modelValue", "change"],
  template: `
    <button
      type="button"
      role="switch"
      :aria-checked="String(modelValue)"
      @click="$emit('update:modelValue', !modelValue); $emit('change', !modelValue)"
    />
  `,
};

const VPaginationStub = {
  props: ["page", "size", "total", "totalLabel"],
  emits: ["update:page", "update:size"],
  template: `
    <div>
      <span data-testid="total-label">{{ totalLabel }}</span>
      <button type="button" data-testid="next-page" @click="$emit('update:page', page + 1)">next</button>
    </div>
  `,
};

function mountPrototype() {
  return mount(PostListUncategorizedPrototype, {
    global: {
      components: { SearchInput: SearchInputStub },
      stubs: {
        Button: { template: "<button type='button'><slot /></button>" },
        IconAddCircle: { template: "<span />" },
        IconBookRead: { template: "<span />" },
        Card: {
          template: `
            <section>
              <header><slot name="header" /></header>
              <div><slot /></div>
              <footer><slot name="footer" /></footer>
            </section>
          `,
        },
        Empty: {
          props: ["title", "message"],
          template: `
            <div data-testid="empty">
              <div>{{ title }}</div>
              <div>{{ message }}</div>
              <div><slot name="actions" /></div>
            </div>
          `,
        },
        Entity: {
          props: ["isSelected"],
          template: `
            <article>
              <div><slot name="checkbox" /></div>
              <div><slot name="start" /></div>
              <div><slot name="end" /></div>
            </article>
          `,
        },
        EntityContainer: { template: "<div><slot /></div>" },
        EntityField: {
          props: ["title", "description"],
          template: "<div>{{ title || description }}</div>",
        },
        FilterDropdown: VFilterDropdownStub,
        FilterDropdownGroup: {
          emits: ["clear"],
          template: "<div><slot /></div>",
        },
        PageHeader: {
          props: ["title"],
          template:
            '<header><h1>{{ title }}</h1><slot name="actions" /></header>',
        },
        Pagination: VPaginationStub,
        Space: { template: "<div><slot /></div>" },
        Switch: VSwitchStub,
      },
    },
  });
}

async function setStatus(
  wrapper: ReturnType<typeof mountPrototype>,
  value: string
) {
  await wrapper.get("[data-testid=status-filter]").setValue(value);
  await nextTick();
}

async function setKeyword(
  wrapper: ReturnType<typeof mountPrototype>,
  value: string
) {
  await wrapper.get("[data-testid=keyword-input]").setValue(value);
  await nextTick();
}

async function toggleSwitch(wrapper: ReturnType<typeof mountPrototype>) {
  await wrapper.get("[role=switch]").trigger("click");
  await nextTick();
}

describe("PostListUncategorizedPrototype", () => {
  it("renders all mock posts with the switch off by default", () => {
    const wrapper = mountPrototype();

    expect(wrapper.get("[role=switch]").attributes("aria-checked")).toBe(
      "false"
    );
    expect(wrapper.get("[data-testid=total-label]").text()).toContain(
      "共 8 篇文章"
    );
    expect(wrapper.text()).toContain("Halo 2.28 发布说明");
    expect(wrapper.text()).toContain("内容团队写作规范");
  });

  it("filters uncategorized posts and keeps keyword and status filters", async () => {
    const wrapper = mountPrototype();

    await setKeyword(wrapper, "备份");
    await setStatus(wrapper, "published");
    await toggleSwitch(wrapper);

    expect(wrapper.get("[role=switch]").attributes("aria-checked")).toBe(
      "true"
    );
    expect(wrapper.get("[data-testid=total-label]").text()).toContain(
      "共 1 篇文章"
    );
    expect(wrapper.text()).toContain("站点备份策略整理");
    expect(wrapper.text()).not.toContain("Halo 2.28 发布说明");
    expect(wrapper.get("[data-testid=keyword-input]").element.value).toBe(
      "备份"
    );
    expect(wrapper.get("[data-testid=status-filter]").element.value).toBe(
      "published"
    );
  });

  it("resets the page and clears selections when the switch is toggled", async () => {
    const wrapper = mountPrototype();

    await setStatus(wrapper, "published");
    await wrapper.get("[data-testid=next-page]").trigger("click");
    await nextTick();

    const checkbox = wrapper.get("[data-testid=post-checkbox-post-008]");
    await checkbox.setValue(true);
    await nextTick();

    await toggleSwitch(wrapper);

    expect(wrapper.get("[data-testid=total-label]").text()).toContain(
      "共 2 篇文章"
    );
    expect(
      wrapper.get("[data-testid=post-checkbox-post-008]").element.checked
    ).toBe(false);
  });

  it("shows the empty state and resets all filters", async () => {
    const wrapper = mountPrototype();

    await setKeyword(wrapper, "不存在");
    await setStatus(wrapper, "draft");
    await toggleSwitch(wrapper);

    expect(wrapper.get("[data-testid=empty]").text()).toContain("暂无文章");
    expect(wrapper.text()).toContain("重置筛选");

    const resetButton = wrapper
      .findAll("button")
      .find((button) => button.text() === "重置筛选");
    expect(resetButton).toBeDefined();
    await resetButton!.trigger("click");
    await nextTick();

    expect(wrapper.get("[role=switch]").attributes("aria-checked")).toBe(
      "false"
    );
    expect(wrapper.get("[data-testid=keyword-input]").element.value).toBe("");
    expect(wrapper.get("[data-testid=status-filter]").element.value).toBe("");
    expect(wrapper.get("[data-testid=total-label]").text()).toContain(
      "共 8 篇文章"
    );
  });
});
