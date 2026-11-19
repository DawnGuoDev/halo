package run.halo.e2e.pages;

import com.microsoft.playwright.Page;

/** Aggregates the console page objects used by the frontend E2E suite. */
public final class ConsolePageObject {

    private final LoginPage login;
    private final PostListPage posts;
    private final PublishCalendarPage calendar;

    /**
     * @param baseUrl the temporary Halo origin (console proxy) for absolute navigation; relative
     *     navigation does not rely on the browser-context baseURL.
     */
    public ConsolePageObject(Page page, String baseUrl) {
        this.login = new LoginPage(page);
        this.posts = new PostListPage(page, baseUrl);
        this.calendar = new PublishCalendarPage(page, baseUrl);
    }

    public LoginPage login() {
        return login;
    }

    public PostListPage posts() {
        return posts;
    }

    public PublishCalendarPage calendar() {
        return calendar;
    }
}
