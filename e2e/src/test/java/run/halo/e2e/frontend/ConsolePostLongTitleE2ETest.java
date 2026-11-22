package run.halo.e2e.frontend;

import static com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.Request;
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
import java.util.concurrent.CopyOnWriteArrayList;
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
* TC-FE-002: console post list "expand long titles" switch.
*
* <p>The switch is page-memory UI state. Toggling it must not change the list request (search,
* filters, pagination) nor clear selection, and it must keep row operations reachable.
*/
@Epic("E2E 测试基线")
@Feature("前端 E2E：文章列表长标题显示方式")
public class ConsolePostLongTitleE2ETest {

    private static final String LIST_API_PREFIX = "/apis/api.console.halo.run/v1alpha1/posts";

    private HaloInstance instance;
    private HaloApiClient api;
    private BrowserSession browser;
    private UniqueScope scope;
    private final List<String> postNames = new ArrayList<>();

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
            for (var name : postNames) {
                var cleanup = BrowserSession.deleteQuietly(api, name);
                if (cleanup != null) {
                    problems.append(cleanup).append('\n');
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

    @Test(description = "TC-FE-002 文章列表：展开长标题开关 → 三行展示 → 不改查询与勾选 → 收起复原")
    @Story("TC-FE-002")
    @Severity(SeverityLevel.NORMAL)
    @Description("""
            1. 通过 API 创建短标题、长中文标题与中英文混合标题文章
            2. 登录控制台并打开 /console/posts，确认开关默认关闭、标题单行省略
            3. 勾选一篇文章并记录当前列表请求
            4. 开启“展开长标题”：长标题最多三行，行操作仍可见；勾选与列表请求参数保持不变
            5. 再次关闭开关：恢复单行展示，勾选仍保留
            6. 结束通过 API 删除创建的文章
      """)
    public void shouldToggleLongTitleDisplayWithoutChangingListState() {
        var console = new ConsolePageObject(browser.page(), instance.consoleUrl());
        var page = browser.page();
        var shortTitle = scope.title("短标题");
        var longChinese = scope.title("长中文标题：从零搭建数字化工厂的生产计划、车间看板、质量追溯与设备点检持续迭代实践");
        var longMixed =
                scope.title("Long mixed title 中英文混合：Halo console list long title preview with SEO 元信息维护");

        createPost(shortTitle);
        createPost(longChinese);
        createPost(longMixed);
        var listRequests = new CopyOnWriteArrayList<String>();
        page.onRequest(request -> recordListRequest(listRequests, request));

        try {
            loginThroughConsole(page, console);
            console.posts().open();
            console.posts().expectRowWithText(shortTitle);

            var toggle = page.locator("[data-testid=post-long-title-toggle]");
            assertThat(toggle).isVisible();
            Assert.assertEquals(toggle.getAttribute("aria-pressed"), "false", "Switch defaults to off");
            assertThat(titleField(shortTitle, console)).hasAttribute("data-expanded", "false");

            var row = row(shortTitle, console);
            row.locator("input[name=post-checkbox]").check();
            Assert.assertEquals(console.posts().checkedCount(), 1, "Selection starts with one post");
            var requestCountBefore = listRequests.size();

            toggle.click();
            Assert.assertEquals(toggle.getAttribute("aria-pressed"), "true", "Switch turns on");
            assertThat(titleField(longChinese, console)).hasAttribute("data-expanded", "true");
            assertThat(titleField(longMixed, console)).hasAttribute("data-expanded", "true");
            assertThat(titleField(shortTitle, console)).hasAttribute("data-expanded", "true");
            assertRowOperationsVisible(longChinese, console);
            Assert.assertEquals(console.posts().checkedCount(), 1, "Toggle keeps the selection");
            Assert.assertEquals(
                    listRequests.size(),
                    requestCountBefore,
                    "Toggle must not issue a new list request: " + listRequests);

            toggle.click();
            Assert.assertEquals(toggle.getAttribute("aria-pressed"), "false", "Switch turns off");
            assertThat(titleField(longChinese, console)).hasAttribute("data-expanded", "false");
            Assert.assertEquals(console.posts().checkedCount(), 1, "Collapse keeps the selection");
            Assert.assertEquals(
                    listRequests.size(),
                    requestCountBefore,
                    "Collapse must not issue a new list request: " + listRequests);

            Allure.addAttachment("list-requests", "text/plain", String.join("\n", listRequests));
        } catch (RuntimeException | AssertionError e) {
            Allure.addAttachment("failure", "text/plain", E2EConfig.sanitize(e.toString()));
            captureFailureScreenshot();
            throw e;
        }
    }

    @Step("通过 API 创建草稿文章 {title}")
    private void createPost(String title) {
        var slug = scope.token() + "-" + postNames.size();
        var response =
                Assertions.assertStatus(api.createDraft(title, slug, "Long title E2E " + slug), 201);
        postNames.add(java.util.regex.Pattern.compile("\"name\"\\s*:\\s*\"([^\"]+)\"")
                .matcher(response.body())
                .results()
                .findFirst()
                .orElseThrow(
                        () -> new AssertionError("Draft response has no metadata.name: " + response.body()))
                .group(1));
    }

    @Step("使用真实表单登录，并确认会话离开登录页")
    private void loginThroughConsole(Page page, ConsolePageObject console) {
        page.navigate("/login");
        console.login().expectLoaded();
        console.login().login(E2EConfig.ADMIN_USERNAME, E2EConfig.ADMIN_PASSWORD);
        page.waitForURL(
                url -> !url.contains("/login"), new Page.WaitForURLOptions().setTimeout(30_000));
        assertThat(page.locator("#username")).hasCount(0);
    }

    private Locator titleField(String title, ConsolePageObject console) {
        return console.posts().titleField(title);
    }

    private Locator row(String title, ConsolePageObject console) {
        return titleField(title, console).locator("xpath=ancestor::tr[1]");
    }

    private void assertRowOperationsVisible(String title, ConsolePageObject console) {
        assertThat(row(title, console).locator(".entity-dropdown-trigger")).isVisible();
    }

    private void recordListRequest(List<String> listRequests, Request request) {
        if (!"GET".equals(request.method()) || !request.url().contains(LIST_API_PREFIX)) {
            return;
        }
        listRequests.add(request.url());
        Allure.addAttachment("list-request", "text/plain", E2EConfig.sanitize(request.url()));
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
}
