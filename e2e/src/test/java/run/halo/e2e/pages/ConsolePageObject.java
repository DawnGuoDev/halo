package run.halo.e2e.pages;

import com.microsoft.playwright.Page;

/** Aggregates the console page objects used by the frontend E2E suite. */
public final class ConsolePageObject {

    private final LoginPage login;
    private final PostListPage posts;

    public ConsolePageObject(Page page) {
        this.login = new LoginPage(page);
        this.posts = new PostListPage(page);
    }

    public LoginPage login() {
        return login;
    }

    public PostListPage posts() {
        return posts;
    }
}
