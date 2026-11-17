package run.halo.e2e.frontend.pages;

import static com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.options.WaitUntilState;
import io.qameta.allure.Step;
import java.util.regex.Pattern;

/** Login gateway: the server-rendered form exposes stable ids and one submit button. */
public class LoginPage {

    private static final Pattern LOGIN_URL = Pattern.compile(".*/login.*");

    private final Page page;

    public LoginPage(Page page) {
        this.page = page;
    }

    public LoginPage open() {
        page.navigate(origin() + "/login", new Page.NavigateOptions().setWaitUntil(WaitUntilState.DOMCONTENTLOADED));
        return assertShown();
    }

    @Step("Assert the anonymous visitor is redirected to /login")
    public LoginPage assertShown() {
        assertThat(page).hasURL(LOGIN_URL);
        assertThat(page.locator("#username")).isVisible();
        assertThat(page.locator("#plainPassword")).isVisible();
        return this;
    }

    @Step("Log in as {username} through the real login form")
    public void login(String username, String password, String expectedPathPrefix) {
        assertShown();
        page.locator("#username").fill(username);
        page.locator("#plainPassword").fill(password);
        page.locator("#login-form button[type=submit]").click();
        page.waitForURL(
                Pattern.compile(".*" + Pattern.quote(expectedPathPrefix) + ".*"),
                new Page.WaitForURLOptions().setTimeout(30_000));
    }

    public static String originOf(Page page) {
        String url = page.url();
        java.net.URI uri = java.net.URI.create(url);
        return uri.getScheme() + "://" + uri.getAuthority();
    }

    private String origin() {
        return originOf(page);
    }
}
