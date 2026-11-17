package run.halo.e2e.frontend;

import static com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import io.qameta.allure.Allure;
import io.qameta.allure.Description;
import io.qameta.allure.Epic;
import io.qameta.allure.Feature;
import io.qameta.allure.Severity;
import io.qameta.allure.SeverityLevel;
import io.qameta.allure.Step;
import io.qameta.allure.Story;
import org.testng.Assert;
import org.testng.annotations.AfterMethod;
import org.testng.annotations.BeforeMethod;
import org.testng.annotations.Test;
import run.halo.e2e.pages.ConsolePageObject;
import run.halo.e2e.pages.PublishDialog;
import run.halo.e2e.support.Assertions;
import run.halo.e2e.support.BrowserSession;
import run.halo.e2e.support.E2EConfig;
import run.halo.e2e.support.HaloApiClient;
import run.halo.e2e.support.HaloInstance;
import run.halo.e2e.support.UniqueScope;

/**
 * TC-FE-001: real form login against an uninitialized session -&gt; new post -&gt; publish -&gt; list.
 *
 * <p>Assertions only use URL, role, visible text and the post list API for the published state.
 * Post data is created with a unique scope token and removed through the API at the end.
 */
@Epic("E2E 测试基线")
@Feature("前端 E2E：控制台登录 / 建文 / 发布")
public class ConsolePostE2ETest {

    private HaloInstance instance;
    private HaloApiClient api;
    private BrowserSession browser;
    private UniqueScope scope;
    private String postName;

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
            var cleanup = cleanupPost();
            if (cleanup != null) {
                problems.append(cleanup).append('\n');
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

    @Test(description = "TC-FE-001 未登录会话 → 真实表单登录 → 新建文章 → 发布 → 列表校验")
    @Story("TC-FE-001")
    @Severity(SeverityLevel.BLOCKER)
    @Description("""
            1. 未登录会话打开 /login，登录表单可见且账号输入为空
            2. 使用临时实例账号在真实表单中登录并进入控制台
            3. 打开 /console/posts，新建文章并填写唯一标题与正文
            4. 点击发布并在设置弹窗确认，列表出现该文章且 API 显示已发布
            5. 结束通过 API 删除创建的文章
            """)
    public void shouldLoginCreateAndPublishPost() {
        var console = new ConsolePageObject(browser.page(), instance.consoleUrl());
        var page = browser.page();
        var title = scope.title("console post");
        var body = "E2E console content " + scope.token();

        try {
            loginThroughConsole(page, console);

            openPostsAndStartNewPost(console);
            fillAndPublish(console, title, body);
            verifyPublished(console, title);
        } catch (RuntimeException | AssertionError e) {
            Allure.addAttachment("failure", "text/plain", E2EConfig.sanitize(e.toString()));
            captureFailureScreenshot();
            throw e;
        }
    }

    @Step("使用真实表单登录，并确认会话离开登录页")
    private void loginThroughConsole(Page page, ConsolePageObject console) {
        // An unauthenticated session resolves to the server-rendered login form. Loading /login
        // directly is the stable entry after setup; on success Halo redirects to the user center,
        // while the article list is opened explicitly in the next step.
        page.navigate("/login");
        console.login().expectLoaded();
        Assert.assertTrue(console.login().usernameValue().isEmpty(), "Login form must start empty");
        console.login().login(E2EConfig.ADMIN_USERNAME, E2EConfig.ADMIN_PASSWORD);
        page.waitForURL(
                url -> !url.contains("/login"), new Page.WaitForURLOptions().setTimeout(30_000));
        assertThat(page.locator("#username")).hasCount(0);
    }

    @Step("进入文章列表并打开新建文章编辑器")
    private void openPostsAndStartNewPost(ConsolePageObject console) {
        console.posts().open();
        console.posts().clickNewPost();
        console.posts().expectEditorLoaded();
    }

    @Step("填写标题与正文并在设置弹窗中确认发布")
    private void fillAndPublish(ConsolePageObject console, String title, String body) {
        console.posts().fillEditor(title, body);
        console.posts().clickPublish();
        var dialog = new PublishDialog(console.posts().titleInput().page());
        if (dialog.isVisible()) {
            dialog.confirmPublish();
        }
    }

    @Step("校验文章出现在列表且状态为已发布")
    private void verifyPublished(ConsolePageObject console, String title) {
        var page = console.posts().titleInput().page();
        page.waitForURL(url -> url.contains("/console/posts"), new Page.WaitForURLOptions().setTimeout(30_000));
        console.posts().expectRowWithText(title);
        var listItem = console.posts().rowWithText(title);
        Assert.assertNotNull(listItem, "Post row for [" + title + "]");

        // The UI generates the slug from the title, so look the created post up by title through the
        // same list endpoint the console uses.
        var posts = api.parse(Assertions.assertStatus(api.listPosts(), 200));
        JsonNode created = null;
        for (JsonNode item : posts.path("items")) {
            // The console list returns ListedPost objects: some endpoints wrap them in "post",
            // others return the Post fields directly.
            JsonNode candidate = item.has("post") ? item.path("post") : item;
            if (title.equals(candidate.path("spec").path("title").asText())) {
                created = candidate;
                break;
            }
        }
        Assert.assertNotNull(created, "Created post must be queryable by its unique title: " + posts);
        postName = Assertions.requireText(created, "metadata.name");
        Assertions.assertPublished(created);
        Allure.addAttachment("published-post", "text/plain", "name=" + postName + "\ntitle=" + title);
    }

    @Step("失败时保存截图与页面状态")
    private void captureFailureScreenshot() {
        try {
            if (browser != null) {
                browser.captureScreenshot("TC-FE-001-" + scope.token() + "-failure");
                browser.attachPageState();
            }
        } catch (RuntimeException e) {
            Allure.addAttachment("screenshot-error", "text/plain", E2EConfig.sanitize(e.toString()));
        }
    }

    private String cleanupPost() {
        if (postName == null || api == null) {
            return null;
        }
        return BrowserSession.deleteQuietly(api, postName);
    }
}
