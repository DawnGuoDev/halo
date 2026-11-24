import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, h } from "vue";
import { makePopperResizeObserverSandboxSafe } from "../popper-resize-observer";

let restore: (() => void) | undefined;

afterEach(() => {
  restore?.();
  restore = undefined;
});

function createApp() {
  return createApp(defineComponent({ render: () => h("div") }));
}

const resizeError = () =>
  new TypeError("Cannot read properties of null (reading 'defaultView')");

describe("makePopperResizeObserverSandboxSafe", () => {
  it("ignores only the floating-vue resize error and keeps other errors", () => {
    const app = createApp();
    const previous = vi.fn();
    app.config.errorHandler = previous;
    restore = makePopperResizeObserverSandboxSafe(app, { force: true });

    app.config.errorHandler!(resizeError(), null, "render function");
    expect(previous).not.toHaveBeenCalled();

    const other = new Error("boom");
    app.config.errorHandler!(other, null, "render function");
    expect(previous).toHaveBeenCalledWith(other, null, "render function");
  });

  it("prevents the matching global error event but forwards others", () => {
    const app = createApp();
    restore = makePopperResizeObserverSandboxSafe(app, { force: true });

    const matching = new ErrorEvent("error", {
      error: resizeError(),
      cancelable: true,
    });
    window.dispatchEvent(matching);
    expect(matching.defaultPrevented).toBe(true);

    const unrelated = new ErrorEvent("error", {
      error: new Error("boom"),
      cancelable: true,
    });
    window.dispatchEvent(unrelated);
    expect(unrelated.defaultPrevented).toBe(false);
  });

  it("is idempotent and restores the previous handlers", () => {
    const app = createApp();
    const handler = app.config.errorHandler;
    const first = makePopperResizeObserverSandboxSafe(app, { force: true });
    const second = makePopperResizeObserverSandboxSafe(app, { force: true });

    const guarded = app.config.errorHandler;
    second();
    expect(app.config.errorHandler).toBe(guarded);

    first();
    expect(app.config.errorHandler).toBe(handler);
  });

  it("does nothing outside an opaque frame unless forced", () => {
    const app = createApp();
    const handler = app.config.errorHandler;
    const restoreGuard = makePopperResizeObserverSandboxSafe(app);
    expect(app.config.errorHandler).toBe(handler);
    expect(() => restoreGuard()).not.toThrow();
  });
});
