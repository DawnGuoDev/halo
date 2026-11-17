package run.halo.e2e.frontend;

import static org.testng.Assert.assertNotNull;
import static org.testng.Assert.assertTrue;

import com.microsoft.playwright.Browser;
import com.microsoft.playwright.BrowserContext;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.Playwright;
import com.microsoft.playwright.PlaywrightException;
import io.qameta.allure.Allure;
import io.qameta.allure.Epic;
import io.qameta.allure.Feature;
import io.qameta.allure.Severity;
import io.qameta.allure.SeverityLevel;
import io.qameta.allure.Story;
import java.io.ByteArrayInputStream;
import java.util.Map;
import org.testng.ITestResult;
import org.testng.annotations.AfterClass;
import org.testng.annotations.AfterMethod;
import org.testng.annotations.BeforeClass;
import org.testng.annotations.BeforeMethod;
import org.testng.annotations.Listeners;
import org.testng.annotations.Test;
import run.halo.e2e.core.E2eConfig;
import run.halo.e2e.core.E2eEnvironment;
import run.halo.e2e.core.E2eEnvironmentListener;
import run.halo.e2e.core.Json;
import run.halo.e2e.frontend.pages.LoginPage;
import run.halo.e2e.frontend.pages.PostEditorPage;
import run.halo.e2e.frontend.pages.PostListPage;

/**
 * TC-FE-001: anonymous /console redirect -> real form login -> new post -> publish
 * -> published row on the console list. Chromium only; headed via -Pe2eHeaded.
 */
@Epic("Halo E2E baseline")
@Feature("Frontend console")
@Story("TC-FE-001 login and publish a post")
@Listeners(E2eEnvironmentListener.class)
public class ConsolePostPublishE2eTest {

    private E2eEnvironment env;
    private Playwright playwright;
    private Browser browser;
    private BrowserContext context;
    private Page page;
    private String title;
    private String postName;
    private boolean testFailed;

    @BeforeClass(alwaysRun = true)
    public void setUpSuite() {
        env = E2eEnvironment.get();
        env.initialize();
        playwright = Playwright.create();
        browser = playwright.chromium()
                .launch(new com.microsoft.playwright.BrowserType.LaunchOptions()
                        .setHeadless(!E2eConfig.headed()));
    }

    @BeforeMethod(alwaysRun = true)
    public void newSession() {
        context = browser.newContext(new Browser.NewContextOptions().setBaseURL(env.baseUri().toString()));
        page = context.newPage();
        title = "E2E console " + E2eConfig.scopeToken();
        postName = null;
        testFailed = false;
    }

    @Test(priority = 1, description = "Anonymous /console redirects to the login page")
    @Severity(SeverityLevel.BLOCKER)
    public void shouldRedirectAnonymousConsoleToLogin() {
        page.navigate(env.baseUri() + "/console");
        new LoginPage(page).assertShown();
    }

    @Test(
            priority = 2,
            description = "Login, create and publish a post, then verify it in the console list")
    @Severity(SeverityLevel.CRITICAL)
    public void shouldLoginAndPublishPost() {
        page.navigate(env.baseUri() + "/console");
        new LoginPage(page).login(E2eConfig.username(), E2eConfig.password(), "/console");

        PostListPage listPage = new PostListPage(page).open();
        listPage.clickNewPost();
        new PostEditorPage(page).fill(title, "Published by TC-FE-001 " + E2eConfig.scopeToken());
        new PostEditorPage(page).publish();
        listPage.open().assertPublished(title);

        Map<String, Object> post = env.api().findByTitle(title);
        assertNotNull(post, "published post should be readable through the backend API");
        postName = Json.string(post, "metadata.name");
        assertTrue(
                Boolean.parseBoolean(Json.string(post, "metadata.labels.content.halo.run/published"))
                        || "PUBLISHED".equals(Json.string(post, "status.phase")),
                "backend should confirm the post is published");
    }

    @AfterMethod(alwaysRun = true)
    public void tearDownSession(ITestResult result) {
        testFailed = result != null && !result.isSuccess();
        if (testFailed && page != null) {
            attachScreenshot();
        }
        if (context != null) {
            context.close();
        }
        cleanupCreatedPost();
    }

    @AfterClass(alwaysRun = true)
    public void tearDownSuite() {
        if (browser != null) {
            browser.close();
        }
        if (playwright != null) {
            playwright.close();
        }
    }

    /** API cleanup first (Basic Auth), then a title lookup to catch partially published posts. */
    private void cleanupCreatedPost() {
        if (postName != null) {
            try {
                env.api().recycle(postName);
                postName = null;
            } catch (RuntimeException ex) {
                Allure.addAttachment("Cleanup warning (recycle by name)", "text/plain", String.valueOf(ex));
            }
        }
        try {
            Map<String, Object> leftover = env.api().findByTitle(title);
            if (leftover != null) {
                env.api().recycle(Json.string(leftover, "metadata.name"));
                postName = null;
            }
        } catch (RuntimeException ex) {
            Allure.addAttachment("Cleanup warning (recycle by title)", "text/plain", String.valueOf(ex));
        }
    }

    private void attachScreenshot() {
        try {
            byte[] screenshot = page.screenshot(new Page.ScreenshotOptions().setFullPage(true));
            Allure.addAttachment("Failure screenshot", "image/png", new ByteArrayInputStream(screenshot), "png");
            Allure.addAttachment("URL at failure", "text/plain", String.valueOf(page.url()));
        } catch (PlaywrightException ex) {
            Allure.addAttachment("Screenshot unavailable", "text/plain", String.valueOf(ex));
        }
    }
}
