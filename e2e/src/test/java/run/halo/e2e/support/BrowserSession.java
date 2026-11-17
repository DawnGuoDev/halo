package run.halo.e2e.support;

import com.microsoft.playwright.Browser;
import com.microsoft.playwright.BrowserType;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.Playwright;
import com.microsoft.playwright.PlaywrightException;
import io.qameta.allure.Allure;
import io.qameta.allure.Attachment;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Locale;
import org.testng.SkipException;

/**
 * Owns Playwright, Chromium and the browser context for one test.
 *
 * <p>Browser installation problems are BLOCKED (environment not ready); a missing browser is never
 * reported as a business failure. Failure screenshots are persisted under
 * {@code e2e/build/e2e-screenshots} and attached to the Allure report.
 */
public final class BrowserSession implements AutoCloseable {

    private final Playwright playwright;
    private final Browser browser;
    private final Page page;

    private BrowserSession(Playwright playwright, Browser browser, Page page) {
        this.playwright = playwright;
        this.browser = browser;
        this.page = page;
    }

    /** Creates a Chromium (optionally headed) session with a fixed desktop viewport. */
    public static BrowserSession launch(String baseUrl) {
        Playwright playwright = null;
        Browser browser = null;
        try {
            playwright = Playwright.create();
            var options = new BrowserType.LaunchOptions()
                    .setHeadless(!E2EConfig.HEADED)
                    .setSlowMo(E2EConfig.SLOW_MO);
            if (!E2EConfig.CHROMIUM_EXECUTABLE_PATH.isBlank()) {
                options.setExecutablePath(Path.of(E2EConfig.CHROMIUM_EXECUTABLE_PATH));
            }
            browser = playwright.chromium().launch(options);
            var context = browser.newContext(new Browser.NewContextOptions()
                    .setBaseURL(baseUrl)
                    .setLocale(E2EConfig.LANGUAGE)
                    .setJavaScriptEnabled(true)
                    .setViewportSize(1440, 900)
                    .setAcceptDownloads(true));
            context.setDefaultTimeout(30_000);
            context.setDefaultNavigationTimeout(60_000);
            var page = context.newPage();
            return new BrowserSession(playwright, browser, page);
        } catch (PlaywrightException e) {
            closeQuietly(browser, playwright);
            if (isMissingBrowser(e)) {
                throw new SkipException(
                        "BLOCKED: Chromium for Playwright is not installed. Run `./gradlew :e2e:playwrightInstall` "
                                + "or set -De2e.chromium.executable=<path>. Cause: "
                                + E2EConfig.sanitize(String.valueOf(e.getMessage())),
                        e);
            }
            throw new SkipException(
                    "BLOCKED: cannot start Chromium. Cause: " + E2EConfig.sanitize(String.valueOf(e.getMessage())), e);
        }
    }

    public Page page() {
        return page;
    }

    /** Screenshot attached to the current test; also kept on disk for diagnosis. */
    @Attachment(value = "失败截图", type = "image/png")
    public byte[] captureScreenshot(String name) {
        try {
            if (page.isClosed()) {
                return new byte[0];
            }
            var bytes = page.screenshot(new Page.ScreenshotOptions().setFullPage(true));
            var file = E2EConfig.SCREENSHOT_DIR.resolve(name + ".png");
            Files.createDirectories(file.getParent());
            Files.write(file, bytes);
            Allure.addAttachment("screenshot-path", "text/plain", file.toString());
            return bytes;
        } catch (PlaywrightException | IOException e) {
            Allure.addAttachment("screenshot-failure", "text/plain", E2EConfig.sanitize(String.valueOf(e)));
            return new byte[0];
        }
    }

    /** Attaches the current page URL and document title for failure triage. */
    public void attachPageState() {
        try {
            Allure.addAttachment("page-state", "text/plain", "url=" + page.url() + "\ntitle=" + page.title());
        } catch (PlaywrightException ignored) {
            // The browser might already be closed; the primary failure is more useful.
        }
    }

    @Override
    public void close() {
        closeQuietly(browser, playwright);
    }

    /** Removes a post through the API; returns {@code null} on success, else the problem. */
    public static String deleteQuietly(HaloApiClient api, String postName) {
        var name = postName;
        if (name == null || name.isBlank()) {
            return "No post name available for API cleanup";
        }
        try {
            var response = api.deletePost(name);
            if (response.status() / 100 != 2 && response.status() != 404) {
                return "API cleanup returned HTTP " + response.status() + " for post " + name;
            }
            return null;
        } catch (RuntimeException e) {
            return "API cleanup failed for post " + name + ": " + E2EConfig.sanitize(e.getMessage());
        }
    }

    private static boolean isMissingBrowser(PlaywrightException e) {
        var message = String.valueOf(e.getMessage()).toLowerCase(Locale.ROOT);
        return message.contains("executable doesn't exist")
                || message.contains("browser executable")
                || message.contains("install");
    }

    private static void closeQuietly(Browser browser, Playwright playwright) {
        try {
            if (browser != null) {
                browser.close();
            }
        } catch (RuntimeException ignored) {
            // Best effort.
        }
        try {
            if (playwright != null) {
                playwright.close();
            }
        } catch (RuntimeException ignored) {
            // Best effort.
        }
    }
}
