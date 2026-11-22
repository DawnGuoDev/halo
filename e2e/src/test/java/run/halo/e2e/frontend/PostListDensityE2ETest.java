package run.halo.e2e.frontend;

import static com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat;

import com.microsoft.playwright.Page;
import io.qameta.allure.Allure;
import io.qameta.allure.Description;
import io.qameta.allure.Epic;
import io.qameta.allure.Feature;
import io.qameta.allure.Severity;
import io.qameta.allure.SeverityLevel;
import io.qameta.allure.Step;
import io.qameta.allure.Story;
import java.util.ArrayList;
import java.util.List;
import org.testng.Assert;
import org.testng.annotations.AfterMethod;
import org.testng.annotations.BeforeMethod;
import org.testng.annotations.Test;
import run.halo.e2e.pages.ConsolePageObject;
import run.halo.e2e.support.Assertions;
import run.halo.e2e.support.BrowserSession;
import run.halo.e2e.support.E2EConfig;
import run.halo.e2e.support.HaloApiClient;
import run.halo.e2e.support.HaloInstance;
import run.halo.e2e.support.UniqueScope;

/**
 * TC-FE-002: post list reading density switch (comfortable / compact).
 *
 * <p>Verifies that the density toggle:
 * <ol>
 *   <li>is visible with "comfortable" selected by default;
 *   <li>switches to compact mode (modifier class) without refetching data;
 *   <li>preserves search keyword, checkbox selection and row count across a density switch;
 *   <li>renders the empty-state correctly in both densities.
 * </ol>
 *
 * <p>Posts are created through the real console API, and cleaned up through the API at the end.
 */
@Epic("E2E 测试基线")
@Feature("前端 E2E：文章列表阅读密度切换")
public class PostListDensityE2ETest {

    private HaloInstance instance;
    private HaloApiClient api;
    private BrowserSession browser;
    private UniqueScope scope;
    private final List<String> createdPostNames = new ArrayList<>();

    @BeforeMethod(alwaysRun = true)
    public void setUp() {
        scope = UniqueScope.create();
        instance = HaloInstance.create();
        try {
            instance.start();
        } catch (RuntimeException e) {
            instance.stop();
            throw e;
        }
        api = HaloApiClient.basic(instance);
        Assertions.assertStatus(api.setupSystem(), 204);
        browser = BrowserSession.launch(instance.consoleUrl());
    }

    @AfterMethod(alwaysRun = true)
    public void tearDown(org.testng.ITestResult result) {
        var problems = new StringBuilder();
        try {
            if (browser != null) {
                browser.close();
            }
        } finally {
            for (var name : createdPostNames) {
                var problem = BrowserSession.deleteQuietly(api, name);
                if (problem != null) {
                    problems.append(problem).append('\n');
                }
            }
            if (instance != null) {
                instance.stop();
                var dirProblem = instance.cleanUpWorkDir();
                if (dirProblem != null) {
                    problems.append(dirProblem).append('\n');
                }
            }
        }
        if (!problems.isEmpty()) {
            Allure.addAttachment("cleanup-problems", "text/plain", problems.toString());
            if (result.isSuccess()) {
                throw new AssertionError("BLOCKED cleanup: " + problems);
            }
        }
    }

    @Test(description = "TC-FE-002 文章列表密度切换：默认舒适 → 紧凑切换 → 状态保留 → 空状态")
    @Story("TC-FE-002")
    @Severity(SeverityLevel.CRITICAL)
    @Description("""
            1. 登录控制台，通过 API 创建多篇草稿文章
            2. 打开文章列表，校验密度控件可见且默认选中"舒适"
            3. 切换到"紧凑"，校验 post-list--compact 修饰类生效，行数不变
            4. 切换回"舒适"，校验修饰类移除
            5. 在搜索 + 勾选状态下切换密度，校验搜索关键词与勾选状态保留
            6. 搜索无匹配关键词，校验空状态在两种密度下正常展示
            """)
    public void shouldSwitchDensityAndPreserveState() {
        var console = new ConsolePageObject(browser.page(), instance.consoleUrl());
        var page = browser.page();

        try {
            loginThroughConsole(page, console);

            // Create two posts via the console API so the list is non-empty.
            var title1 = scope.title("density post A");
            var title2 = scope.title("density post B");
            createDraftPost(title1);
            createDraftPost(title2);

            console.posts().open();
            console.posts().expectDensitySwitchVisible();

            verifyDefaultComfortable(console);

            verifySwitchToCompact(console);

            verifySwitchBackToComfortable(console);

            verifyStatePreservedAfterSwitch(console, title1, title2);

            verifyEmptyStateInBothDensities(console);
        } catch (RuntimeException | AssertionError e) {
            Allure.addAttachment("failure", "text/plain", E2EConfig.sanitize(e.toString()));
            captureFailureScreenshot();
            throw e;
        }
    }

    @Step("使用真实表单登录，并确认会话离开登录页")
    private void loginThroughConsole(Page page, ConsolePageObject console) {
        page.navigate("/login");
        console.login().expectLoaded();
        Assert.assertTrue(console.login().usernameValue().isEmpty(), "Login form must start empty");
        console.login().login(E2EConfig.ADMIN_USERNAME, E2EConfig.ADMIN_PASSWORD);
        page.waitForURL(
                url -> !url.contains("/login"), new Page.WaitForURLOptions().setTimeout(30_000));
        assertThat(page.locator("#username")).hasCount(0);
    }

    @Step("通过 API 创建草稿文章：{title}")
    private void createDraftPost(String title) {
        var response = api.createDraft(title, scope.slug("post-" + createdPostNames.size()),
                "<p>Density E2E</p>");
        Assertions.assertStatus(response, 200);
        var post = api.parse(response);
        var name = Assertions.requireText(post, "metadata.name");
        createdPostNames.add(name);
        Allure.addAttachment("created-post", "text/plain", "name=" + name + "\ntitle=" + title);
    }

    @Step("校验默认密度为舒适")
    private void verifyDefaultComfortable(ConsolePageObject console) {
        Assert.assertTrue(
                console.posts().isDensityChecked("comfortable"),
                "Density must default to 'comfortable'");
        Assert.assertFalse(
                console.posts().isDensityChecked("compact"),
                "Density must not start as 'compact'");
        Assert.assertTrue(
                console.posts().isComfortableMode(),
                "Post list container must NOT have post-list--compact class in comfortable mode");
    }

    @Step("切换到紧凑并校验修饰类与行数不变")
    private void verifySwitchToCompact(ConsolePageObject console) {
        var rowsBefore = console.posts().visibleRowCount();
        Assert.assertTrue(rowsBefore > 0, "Post list must have visible rows before switching");

        console.posts().switchDensity("compact");

        Assert.assertTrue(
                console.posts().isDensityChecked("compact"),
                "Compact radio must be checked after switching");
        Assert.assertTrue(
                console.posts().isCompactMode(),
                "Post list container must have post-list--compact class");
        var rowsAfter = console.posts().visibleRowCount();
        Assert.assertEquals(
                rowsAfter, rowsBefore, "Row count must not change when switching density");
    }

    @Step("切换回舒适并校验修饰类移除")
    private void verifySwitchBackToComfortable(ConsolePageObject console) {
        console.posts().switchDensity("comfortable");

        Assert.assertTrue(
                console.posts().isDensityChecked("comfortable"),
                "Comfortable radio must be checked after switching back");
        Assert.assertFalse(
                console.posts().isCompactMode(),
                "Post list container must NOT have post-list--compact after switching back");
        Assert.assertTrue(
                console.posts().isComfortableMode(),
                "Post list container must exist in comfortable mode");
    }

    @Step("在搜索 + 勾选状态下切换密度，校验状态保留")
    private void verifyStatePreservedAfterSwitch(
            ConsolePageObject console, String title1, String title2) {
        // Enter a search keyword that matches both created posts (they share the scope prefix).
        var keyword = scope.token();
        console.posts().search(keyword);

        // Wait for the rows to appear after the search refetch.
        console.posts().expectRowWithText(title1);
        Assert.assertTrue(
                console.posts().hasRowWithText(title2), "Second post must be visible after search");

        // Check the first post row.
        console.posts().checkPost(title1);

        // Switch to compact.
        console.posts().switchDensity("compact");
        Assert.assertTrue(console.posts().isCompactMode(), "Should be in compact mode");

        // Verify search keyword is still present.
        var searchValue = console.posts().searchInput().inputValue();
        Assert.assertEquals(
                searchValue, keyword, "Search keyword must be preserved after density switch");

        // Verify both rows still visible (search preserved).
        Assert.assertTrue(
                console.posts().hasRowWithText(title1),
                "Post 1 must still be visible after density switch");
        Assert.assertTrue(
                console.posts().hasRowWithText(title2),
                "Post 2 must still be visible after density switch");

        // Verify checkbox is still checked.
        Assert.assertTrue(
                console.posts().rowCheckbox(title1).isChecked(),
                "Checkbox must remain checked after density switch");

        // Switch back to comfortable and verify state still preserved.
        console.posts().switchDensity("comfortable");
        Assert.assertFalse(console.posts().isCompactMode(), "Should be back in comfortable mode");
        Assert.assertEquals(
                console.posts().searchInput().inputValue(),
                keyword,
                "Search keyword must be preserved after switching back");
        Assert.assertTrue(
                console.posts().rowCheckbox(title1).isChecked(),
                "Checkbox must remain checked after switching back to comfortable");
    }

    @Step("搜索无匹配关键词，校验空状态在两种密度下正常")
    private void verifyEmptyStateInBothDensities(ConsolePageObject console) {
        var noMatch = scope.token() + "-no-such-post-zzz";
        console.posts().search(noMatch);

        // Wait for empty state to appear (the list refetches and returns no items).
        page().waitForCondition(
                () -> console.posts().isEmptyStateVisible(),
                new Page.WaitForConditionOptions().setTimeout(15_000));
        Assert.assertTrue(
                console.posts().isEmptyStateVisible(),
                "Empty state must be visible for non-matching search");

        // When the list is empty, the .post-list container is not rendered (VEmpty replaces it).
        // The density radio is in the toolbar header, so it remains functional. Verify the radio
        // switches and the empty state stays visible in both modes.
        console.posts().switchDensity("compact");
        Assert.assertTrue(
                console.posts().isDensityChecked("compact"),
                "Compact radio must be checked even in empty state");
        Assert.assertTrue(
                console.posts().isEmptyStateVisible(),
                "Empty state must still be visible in compact mode");

        console.posts().switchDensity("comfortable");
        Assert.assertTrue(
                console.posts().isDensityChecked("comfortable"),
                "Comfortable radio must be checked even in empty state");
        Assert.assertTrue(
                console.posts().isEmptyStateVisible(),
                "Empty state must still be visible in comfortable mode");
    }

    @Step("失败时保存截图与页面状态")
    private void captureFailureScreenshot() {
        try {
            if (browser != null) {
                browser.captureScreenshot("TC-FE-002-" + scope.token() + "-failure");
                browser.attachPageState();
            }
        } catch (RuntimeException e) {
            Allure.addAttachment("screenshot-error", "text/plain", E2EConfig.sanitize(e.toString()));
        }
    }

    private Page page() {
        return browser.page();
    }
}
