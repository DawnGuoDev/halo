<script lang="ts">
import {
  Transition,
  computed,
  defineComponent,
  h,
  nextTick,
  onBeforeUnmount,
  ref,
  vShow,
  watch,
  withDirectives,
} from "vue";
import { IconClose } from "@halo-dev/components";

// 原型适配（回填时可移除；原型差异记录见 integration-guide.md「弹层适配」）：npm 发布的 @halo-dev/components 2.27.0 的 Modal 依赖
// <Transition> 的 @before-enter 设置外层 rootVisible；在本独立工程（vue 3.5.46 / vue-router 5.1.0）
// 中该钩子未触发，弹层外壳保持 display:none（基线文章列表的设置弹层同样复现）。
// 业务 2.28 源码结构相同，但在真实控制台中的表现未实测。
// 这里保留业务 Modal 的 props/事件/插槽、结构与视觉（外层 .modal-wrapper 的 fixed 定位与遮罩），
// 仅把显隐改为显式 v-show，使预览可见；不使用 Teleport（本工程中内置 Teleport 渲染未生效）。
// 回填业务控制台时直接使用包内 / 业务源码 VModal，不迁入本文件。
const transitionClasses = {
  enterActiveClass: "ease-out duration-200",
  enterFromClass: "opacity-0",
  enterToClass: "opacity-100",
  leaveActiveClass: "ease-in duration-100",
  leaveFromClass: "opacity-100",
  leaveToClass: "opacity-0",
};

export default defineComponent({
  name: "PrototypeVModal",
  props: {
    visible: { type: Boolean, default: true },
    title: { type: String, default: undefined },
    width: { type: Number, default: 500 },
    height: { type: String, default: undefined },
    fullscreen: { type: Boolean, default: false },
    bodyClass: { type: Array, default: undefined },
    mountToBody: { type: Boolean, default: false },
    centered: { type: Boolean, default: true },
    layerClosable: { type: Boolean, default: false },
  },
  emits: ["update:visible", "close"],
  setup(props, { emit, slots }) {
    const focusedLayer = ref(false);
    const modalRoot = ref<HTMLElement | null>(null);
    const isOpen = computed(() => props.visible);

    function handleClose() {
      emit("update:visible", false);
      emit("close");
    }

    function handleClickLayer() {
      if (props.layerClosable) {
        handleClose();
        return;
      }
      focusedLayer.value = true;
      setTimeout(() => {
        focusedLayer.value = false;
      }, 300);
    }

    // 与业务 Modal 一致的焦点管理：打开时记录触发元素并聚焦弹层，关闭/卸载时恢复焦点
    let previouslyFocusedElement: HTMLElement | null = null;
    watch(
      () => props.visible,
      (value) => {
        if (value) {
          if (
            !previouslyFocusedElement &&
            document.activeElement instanceof HTMLElement &&
            document.activeElement !== document.body
          ) {
            previouslyFocusedElement = document.activeElement;
          }
          nextTick(() => modalRoot.value?.focus());
        } else if (previouslyFocusedElement?.isConnected) {
          previouslyFocusedElement.focus({ preventScroll: true });
          previouslyFocusedElement = null;
        }
      },
      { immediate: true }
    );
    onBeforeUnmount(() => {
      if (previouslyFocusedElement?.isConnected) {
        previouslyFocusedElement.focus({ preventScroll: true });
      }
    });

    // 与业务 Modal 一致的 Tab 焦点陷阱
    function handleTabKey(event: KeyboardEvent) {
      const container = modalRoot.value;
      if (!container) return;
      const focusable = Array.from(
        container.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => el.getClientRects().length > 0);
      if (!focusable.length) {
        event.preventDefault();
        container.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey) {
        if (active === first || active === container || !container.contains(active)) {
          event.preventDefault();
          last.focus();
        }
        return;
      }
      if (active === last || active === container) {
        event.preventDefault();
        first.focus();
      }
    }

    function renderHeader() {
      if (slots.header) {
        return slots.header();
      }
      return [
        h(
          "div",
          {
            id: "prototype-modal-title",
            class: "modal-header-title",
            style: "min-width: 0; max-width: 70%;",
          },
          props.title
        ),
        slots.center
          ? h("div", { class: "modal-header-center" }, slots.center())
          : null,
        h("div", { class: "modal-header-actions" }, [
          slots.actions ? slots.actions() : null,
          h(
            "span",
            {
              "aria-label": "Close",
              class: "bg-gray-50",
              role: "button",
              tabindex: "0",
              onClick: () => handleClose(),
              onKeydown: (event: KeyboardEvent) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  handleClose();
                }
              },
            },
            [h(IconClose, { "aria-hidden": "true" })]
          ),
        ]),
      ];
    }

    return () => {
      const header =
        slots.header || props.title
          ? h("div", { class: "modal-header group" }, renderHeader())
          : null;

      const content = h(
        "div",
        {
          class: [
            "modal-content transition-all duration-300",
            { "modal-focus": focusedLayer.value },
          ],
          style: { maxWidth: `${props.width}px`, height: props.height },
        },
        [header]
          .concat(h("div", { class: [props.bodyClass, "modal-body"] }, slots.default ? slots.default() : []))
          .concat(slots.footer ? h("div", { class: "modal-footer" }, slots.footer()) : [])
      );

      const layer = h("div", { class: "modal-layer", onClick: () => handleClickLayer() });

      const wrapper = h(
        "div",
        {
          class: [
            "modal-wrapper",
            {
              "modal-wrapper-fullscreen": props.fullscreen,
              "modal-wrapper-centered": props.centered,
            },
          ],
          ref: modalRoot,
          "aria-modal": "true",
          "aria-labelledby": props.title ? "prototype-modal-title" : undefined,
          role: "dialog",
          tabindex: "0",
          onKeydown: (event: KeyboardEvent) => {
            if (event.key === "Tab") {
              handleTabKey(event);
            }
          },
          onKeyup: (event: KeyboardEvent) => {
            if (event.key === "Escape") {
              event.stopPropagation();
              handleClose();
            }
          },
        },
        [
          h(Transition, transitionClasses, {
            default: () => withDirectives(layer, [[vShow, isOpen.value]]),
          }),
          h(Transition, transitionClasses, {
            default: () => withDirectives(content, [[vShow, isOpen.value]]),
          }),
        ]
      );

      return withDirectives(wrapper, [[vShow, isOpen.value]]);
    };
  },
});
</script>
