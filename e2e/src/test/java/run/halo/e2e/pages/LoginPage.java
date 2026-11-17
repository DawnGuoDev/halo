package run.halo.e2e.pages;

import static com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.options.AriaRole;
import io.qameta.allure.Step;

/**
 * Login page ({@code /login}). Selectors follow the form semantics: the username input keeps the
 * server-rendered {@code #username} id, the visible plain-password field is {@code #plainPassword}
 * (the page encrypts it into the hidden {@code #password} field on submit), and the submit button is
 * matched by its visible label.
 */
public final class LoginPage {

    private final Page page;

    public LoginPage(Page page) {
        this.page = page;
    }

    @Step("等待登录页，校验 URL /login 与登录表单可见")
    public LoginPage expectLoaded() {
        page.waitForURL(url -> url.contains("/login"), new Page.WaitForURLOptions().setTimeout(30_000));
        assertThat(page.locator("#username")).isVisible();
        assertThat(passwordInput()).isVisible();
        assertThat(page.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName(java.util.regex.Pattern.compile("^(Sign in|Log in|登录)$"))))
                .isVisible();
        return this;
    }

    @Step("使用临时实例账号登录")
    public void login(String username, String password) {
        page.locator("#username").fill(username);
        passwordInput().fill(password);
        page.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName(java.util.regex.Pattern.compile("^(Sign in|Log in|登录)$")))
                .click();
    }

    public String usernameValue() {
        return page.locator("#username").inputValue();
    }

    /**
     * The login form keeps the plain password in {@code #plainPassword} and submits the encrypted
     * value through the hidden {@code #password} field (see login_local.html / common.html). Fill
     * the visible field so the page's own submit handler performs the encryption.
     */
    private Locator passwordInput() {
        return page.locator("#plainPassword, input[autocomplete=current-password], input[type=password]").first();
    }
}
