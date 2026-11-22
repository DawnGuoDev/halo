import { flushPromises, mount } from "@vue/test-utils";
import { expect, it, vi } from "vite-plus/test";
import { nextTick } from "vue";
import { createI18n } from "vue-i18n";
import { createMockCommentService } from "../../mock/commentService";
import CommentModerationWorkbench from "../CommentModerationWorkbench.vue";

vi.mock("@halo-dev/ui-shared", () => ({
  utils: {
    permission: { has: () => true },
    date: { format: () => "", timeAgo: () => "" },
  },
}));

async function settle(wrapper: ReturnType<typeof mountWorkbench>) {
  for (let i = 0; i < 60; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 25));
    await flushPromises();
    await nextTick();
    const rows = wrapper.find("[data-testid=comment-row-001]").exists();
    const stat = wrapper.get("[data-testid=stat-pending-value]").text();
    if (rows && stat) {
      return;
    }
  }
}

function mountWorkbench(service = createMockCommentService({ latency: 0 })) {
  const i18n = createI18n({
    legacy: false,
    locale: "zh-CN",
    messages: { "zh-CN": {} },
  });
  return mount(CommentModerationWorkbench, {
    attachTo: document.body,
    props: { service, canManage: true },
    global: { plugins: [i18n] },
  });
}

it("renders global moderation stats independent of list filters", async () => {
  const wrapper = mountWorkbench();
  await settle(wrapper);
  expect(wrapper.get("[data-testid=stat-pending-value]").text()).toBe("6");
  expect(wrapper.get("[data-testid=stat-approved-value]").text()).toBe("3");
  expect(wrapper.get("[data-testid=stat-rejected-value]").text()).toBe("3");
  expect(wrapper.findAll("[data-testid^=comment-row-]").length).toBe(10);
  wrapper.unmount();
});

it("rejects a pending comment only after confirmation", async () => {
  const wrapper = mountWorkbench();
  await settle(wrapper);
  await wrapper
    .get("[data-testid=comment-row-comment-001] [data-testid=open-comment]")
    .trigger("click");
  await wrapper.get("[data-testid=drawer-reject]").trigger("click");
  expect(wrapper.find("[data-testid=reject-dialog]").exists()).toBe(true);
  expect(wrapper.get("[data-testid=stat-rejected-value]").text()).toBe("3");
  await wrapper.get("[data-testid=confirm-dialog-confirm]").trigger("click");
  await settle(wrapper);
  expect(wrapper.get("[data-testid=stat-rejected-value]").text()).toBe("4");
  wrapper.unmount();
});

it("shows partial failure and retries only failed records", async () => {
  const flaky = createMockCommentService({
    latency: 0,
    flakyNames: ["comment-002"],
  });
  const wrapper = mountWorkbench(flaky);
  await settle(wrapper);
  await wrapper.get("[data-testid=select-all]").setValue(true);
  await flushPromises();
  expect(wrapper.get("[data-testid=batch-bar]").text()).toContain(
    "已选择 5 条"
  );
  await wrapper.get("[data-testid=batch-reject]").trigger("click");
  await flushPromises();
  await wrapper.get("[data-testid=confirm-dialog-confirm]").trigger("click");
  await settle(wrapper);
  expect(wrapper.get("[data-testid=batch-result-failed]").text()).toBe("1");
  await wrapper.get("[data-testid=retry-failed]").trigger("click");
  await settle(wrapper);
  expect(wrapper.get("[data-testid=batch-result]").text()).toContain(
    "批量审核完成"
  );
  expect(wrapper.get("[data-testid=batch-result-succeeded]").text()).toBe("1");
  wrapper.unmount();
});
