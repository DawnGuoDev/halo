import type { App } from "vue";

const FLOATING_VUE_RESIZE_FAILURE =
  /Cannot read propert(?:y|ies) of null \(reading 'defaultView'\)/;

export const POINTER_POPPER_RESIZE_GUARD = Symbol.for(
  "halo.prototype.popper-resize-guard"
);

export interface PopperResizeGuardOptions {
  /**
   * Apply the guard even when the page is not running inside an opaque frame.
   * Production pages keep the default (off) so the original floating-vue
   * behavior is preserved.
   */
  force?: boolean;
}

function isOpaqueFrame(): boolean {
  try {
    return window.self !== window.top && window.origin === "null";
  } catch {
    return true;
  }
}

/**
 * floating-vue measures popper content through a hidden `<iframe>`. In an
 * opaque context (e.g. a self-contained preview rendered with
 * `sandbox="allow-scripts"`, `origin=null`) both `contentDocument` and its
 * `defaultView` are unavailable, so the library throws
 * `TypeError: Cannot read properties of null (reading 'defaultView')`
 * while opening a dropdown. The popper itself (and the page) still work, but
 * the error aborts the surrounding Vue job and is reported as a runtime error.
 *
 * This guard ignores only that specific error when the page runs in an opaque
 * frame. Every other error is forwarded to the previous handler / rethrown.
 */
export function makePopperResizeObserverSandboxSafe(
  app: Pick<App, "config">,
  options: PopperResizeGuardOptions = {}
): () => void {
  if (!options.force && !isOpaqueFrame()) {
    return () => {};
  }

  const config = app.config as App["config"] & {
    [POINTER_POPPER_RESIZE_GUARD]?: true;
    errorHandler?: (error: unknown, instance: unknown, info: string) => void;
  };

  if (config[POINTER_POPPER_RESIZE_GUARD]) {
    return () => {};
  }

  const previousVueHandler = config.errorHandler;
  config.errorHandler = (error, instance, info) => {
    if (
      error instanceof TypeError &&
      FLOATING_VUE_RESIZE_FAILURE.test(error.message)
    ) {
      return;
    }
    if (previousVueHandler) {
      previousVueHandler(error, instance, info);
      return;
    }
    throw error;
  };

  const onGlobalError = (event: ErrorEvent) => {
    const error: unknown = event.error;
    if (
      error instanceof TypeError &&
      FLOATING_VUE_RESIZE_FAILURE.test(error.message)
    ) {
      event.preventDefault();
    }
  };
  window.addEventListener("error", onGlobalError);

  Object.assign(config, { [POINTER_POPPER_RESIZE_GUARD]: true });

  return () => {
    window.removeEventListener("error", onGlobalError);
    config.errorHandler = previousVueHandler;
    delete config[POINTER_POPPER_RESIZE_GUARD];
  };
}
