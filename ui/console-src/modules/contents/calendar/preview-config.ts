/**
 * Preview switch for the content publishing calendar.
 *
 * - Development server / production console: talks to the real Halo console
 *   API (`listPosts` + `updatePost`).
 * - Platform preview (static build served without a Halo backend): the page
 *   falls back to `mock-data.ts` so the calendar is reviewable end to end.
 *
 * The fallback is decided at runtime, not at build time: a static build that
 * is served behind a working Halo instance still uses the real API.
 */
export interface CalendarPreviewConfig {
  /** Force the mock data source, e.g. when rendering inside an iframe. */
  mock?: boolean;
  /** Query parameter that forces `mock=1`, defaults to `calendarMock`. */
  mockQueryKey?: string;
}

const params = new URLSearchParams(window.location.search);
const forcedByQuery = params.get("calendarMock") === "1";

export const calendarPreviewConfig: CalendarPreviewConfig = {
  // The static preview pack sets this flag through its entry HTML.
  mock: forcedByQuery || window.__HALO_CALENDAR_PREVIEW__ === true,
  mockQueryKey: "calendarMock",
};

declare global {
  interface Window {
    /** Set by the standalone preview entry before the console boots. */
    __HALO_CALENDAR_PREVIEW__?: boolean;
    /** Last unhandled error captured by the standalone preview entry. */
    __HALO_PREVIEW_ERROR__?: string;
  }
}
