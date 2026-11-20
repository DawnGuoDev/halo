/**
 * Preview-only shims for the standalone `content-calendar.html` entry.
 *
 * The preview runs without a Halo backend, so it must not redirect to
 * `/login` or call `/uc` endpoints. These shims are imported exclusively by
 * `preview/content-calendar.ts`; the production console entry never loads
 * them and therefore keeps its real authentication and permission guards.
 *
 * Remove this file together with `ui/preview/` when the preview entry is no
 * longer needed; the calendar page itself does not depend on it.
 */
import { axiosInstance } from "@halo-dev/api-client";

/** Matches session / permission requests used during console boot. */
const PREVIEW_SAFE_ENDPOINTS = [
  "uc.api.security.halo.run/v1alpha1/users/-",
  "/permissions",
];

export function createMVP() {
  window.__HALO_CALENDAR_PREVIEW__ = true;
  stubPreviewSession();

  // The console auth guard redirects hard to `/login` when it sees an
  // anonymous session. The preview creates the session before the guards run,
  // so no redirect is expected; log one if it ever happens.
  window.addEventListener("beforeunload", () => {
    if (window.location.pathname.startsWith("/login")) {
      console.warn("Content calendar preview should not navigate to /login");
    }
  });
}

/**
 * Axios is used by the API client, so intercepting at the adapter level keeps
 * the preview isolated to the mock console session. All other requests fall
 * through untouched.
 */
function stubPreviewSession() {
  const originalRequest = axiosInstance.request.bind(axiosInstance);
  const requestWithPreview = async (config: {
    url?: string;
  }): Promise<unknown> => {
    const url = String(config?.url || "");
    if (PREVIEW_SAFE_ENDPOINTS.some((endpoint) => url.includes(endpoint))) {
      return {
        data: url.includes("permissions")
          ? {
              uiPermissions: ["*", "system:posts:view", "system:posts:manage"],
              roles: ["super-role"],
            }
          : {
              user: {
                metadata: { name: "preview-admin" },
                spec: { displayName: "预览管理员" },
              },
              roles: ["super-role"],
            },
        status: 200,
        statusText: "OK",
        headers: {},
        config,
      };
    }
    return originalRequest(config as never);
  };
  // The generic overload of axios `request` is preserved at call sites.
  axiosInstance.request = requestWithPreview as typeof axiosInstance.request;
}
