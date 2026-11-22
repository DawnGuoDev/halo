import type { ListedPost } from "@halo-dev/api-client";
import { utils } from "@halo-dev/ui-shared";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia } from "pinia";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vite-plus/test";
import { createI18n } from "vue-i18n";
import PostListItem from "../PostListItem.vue";

const { writeText, toastSuccess, toastError, isSupported } = vi.hoisted(() => ({
  writeText: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  isSupported: { value: true },
}));

vi.mock("@halo-dev/components", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    Toast: { success: toastSuccess, error: toastError, warning: vi.fn() },
  };
});

vi.mock("@vueuse/core", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    useClipboard: () => ({ copy: writeText, isSupported }),
  };
});

// The real permission helper throws until initialized; grant wildcard.
utils.permission = new (
  utils.permission as unknown as {
    constructor: new (p?: string[]) => typeof utils.permission;
  }
).constructor(["*"]);

function createPost(title: string): ListedPost {
  return {
    categories: [],
    contributors: [],
    owner: { kind: "User", name: "owner", displayName: "Owner" },
    post: {
      apiVersion: "content.halo.run/v1alpha1",
      kind: "Post",
      metadata: { name: "test-post", labels: {} },
      spec: {
        title,
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
    stats: {},
    tags: [],
  } as unknown as ListedPost;
}

const LONG_TITLE =
  "如何在没有设计稿的情况下，从零搭建一套可维护、可扩展并且对新人友好的企业内部内容管理系统：一份覆盖信息架构、组件规范与权限模型的完整实践总结";

async function mountListItem(title: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = mount(PostListItem, {
    props: { post: createPost(title) },
    global: {
      plugins: [
        createPinia(),
        [VueQueryPlugin, { queryClient: client }],
        createI18n({
          legacy: false,
          locale: "zh-CN",
          missingWarn: false,
          fallbackWarn: false,
          messages: {
            "zh-CN": {
              "core.post.operations.copy_title.button": "复制标题",
              "core.post.operations.copy_title.toast_success": "复制成功",
              "core.post.operations.copy_title.toast_failed":
                "复制失败，请重试",
            },
          },
        }),
      ],
      mocks: { $route: {} },
      stubs: {
        RouterLink: { template: "<a><slot /></a>" },
        SubjectQueryCommentListModal: true,
        VDropdown: {
          name: "VDropdown",
          template: "<div><slot /><slot name='popper' /></div>",
        },
        VDropdownItem: { template: "<div><slot /></div>" },
        VDropdownDivider: true,
        VEntity: {
          template:
            "<div><slot name='start' /><slot name='end' /><slot name='dropdownItems' /></div>",
        },
        VEntityField: { template: "<div><slot /></div>" },
        VSpace: { template: "<div><slot /></div>" },
        VStatusDot: true,
        EntityFieldItems: true,
      },
      directives: { tooltip: () => {}, permission: () => {} },
    },
  });
  await flushPromises();
  await flushPromises();
  return wrapper;
}

function dropdownItems(wrapper: Awaited<ReturnType<typeof mountListItem>>) {
  const items = wrapper
    .findComponent({ name: "EntityDropdownItems" })
    .props("dropdownItems") as {
    label?: string;
    action?: () => Promise<void>;
  }[];
  return {
    labels: items.filter((item) => item.label).map((item) => item.label!),
    copy: items.find((item) => item.label === "复制标题"),
  };
}

describe("PostListItem 复制标题", () => {
  beforeEach(() => {
    writeText.mockReset().mockResolvedValue(undefined);
    toastSuccess.mockReset();
    toastError.mockReset();
    isSupported.value = true;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("在更多操作中提供复制标题，且复制完整纯文本标题", async () => {
    const wrapper = await mountListItem(LONG_TITLE);
    const { labels, copy } = dropdownItems(wrapper);

    expect(labels).toContain("复制标题");
    expect(labels.indexOf("复制标题")).toBeGreaterThan(labels.indexOf("编辑"));
    expect(labels.indexOf("复制标题")).toBeGreaterThan(labels.indexOf("设置"));

    await copy!.action!();

    expect(writeText).toHaveBeenCalledWith(LONG_TITLE);
    expect(toastSuccess).toHaveBeenCalledWith("复制成功");
    expect(toastError).not.toHaveBeenCalled();
  });

  it("复制失败时提示重试，且不抛出让列表中断", async () => {
    isSupported.value = false;

    const wrapper = await mountListItem(LONG_TITLE);
    const { copy } = dropdownItems(wrapper);

    await copy!.action!();

    expect(writeText).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledWith("复制失败，请重试");
    expect(toastSuccess).not.toHaveBeenCalled();
    expect(dropdownItems(wrapper).labels).toContain("复制标题");
  });
});
