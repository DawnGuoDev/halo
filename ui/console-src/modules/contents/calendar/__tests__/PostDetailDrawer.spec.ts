import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { h, nextTick, type VNode } from "vue";
import { createI18n } from "vue-i18n";
import PostDetailDrawer from "../PostDetailDrawer.vue";
import type { CalendarPost } from "../types";

const scheduledPost: CalendarPost = {
  name: "post-cdn",
  title: "如何在 Halo 中配置 CDN 与缓存策略",
  publishTime: "2026-12-02T10:00:00.000Z",
  published: false,
};

const source = {
  list: vi.fn(),
  categories: vi.fn(),
  reschedule: vi.fn(),
};

const i18n = createI18n({
  legacy: false,
  locale: "zh-CN",
  missingWarn: false,
  fallbackWarn: false,
  messages: {
    "zh-CN": { core: { content_calendar_actions_save: "保存" } },
  },
});

function mountDrawer(post: CalendarPost = scheduledPost) {
  return mount(PostDetailDrawer, {
    props: { post, source, canManage: true },
    global: {
      plugins: [i18n],
      mocks: {
        $t: (key: string) => key,
      },
      stubs: {
        StatusBadge: true,
        IconClose: true,
        VStatusDot: true,
        Toast: { template: "<div />" },
        VButton: {
          props: ["disabled", "loading"],
          emits: ["click"],
          setup(
            _props: { disabled?: boolean; loading?: boolean },
            {
              slots,
              emit,
            }: {
              slots: { default?: () => VNode[] };
              emit: (e: "click") => void;
            }
          ) {
            return () =>
              h(
                "button",
                {
                  disabled: _props.disabled || _props.loading,
                  onClick: () => emit("click"),
                },
                slots.default?.()
              );
          },
        },
      },
    },
  });
}

function saveButton(wrapper: ReturnType<typeof mountDrawer>) {
  // The stubbed VButton renders slot text asynchronously in some Vue versions,
  // so locate the primary action by its footer position instead of its label.
  const footer = wrapper.find("footer");
  return footer.findAll("button").at(-1)!;
}

async function setTime(
  wrapper: ReturnType<typeof mountDrawer>,
  isoLocal: string
) {
  const input = wrapper.find("#calendar-publish-time");
  await input.setValue(isoLocal);
  await nextTick();
  return input;
}

describe("PostDetailDrawer reschedule validation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-20T10:00:00"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not show an error before the editor touches the time field", () => {
    const wrapper = mountDrawer();
    expect(wrapper.text()).not.toContain("core.content_calendar.errors.");
    expect(saveButton(wrapper).attributes("disabled")).toBeDefined();
  });

  it("blocks saving a time that is not later than now", async () => {
    const wrapper = mountDrawer();
    await setTime(wrapper, "2026-11-20T09:00");
    expect(wrapper.text()).toContain("core.content_calendar.errors.future");
    expect(saveButton(wrapper).attributes("disabled")).toBeDefined();
  });

  it("requires a value before saving", async () => {
    const wrapper = mountDrawer();
    await setTime(wrapper, "");
    expect(wrapper.text()).toContain("core.content_calendar.errors.required");
    expect(saveButton(wrapper).attributes("disabled")).toBeDefined();
  });

  it("allows saving a future time and emits the ISO value", async () => {
    const wrapper = mountDrawer();
    await setTime(wrapper, "2026-12-12T10:00");
    expect(saveButton(wrapper).attributes("disabled")).toBeUndefined();
    await saveButton(wrapper).trigger("click");
    await nextTick();
    expect(source.reschedule).toHaveBeenCalledWith(
      "post-cdn",
      new Date("2026-12-12T10:00").toISOString()
    );
  });

  it("keeps published posts read-only", () => {
    const wrapper = mountDrawer({ ...scheduledPost, published: true });
    expect(wrapper.find("#calendar-publish-time").exists()).toBe(false);
  });
});
