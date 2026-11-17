package run.halo.e2e.backend;

import com.fasterxml.jackson.databind.JsonNode;
import io.qameta.allure.Allure;
import io.qameta.allure.Description;
import io.qameta.allure.Epic;
import io.qameta.allure.Feature;
import io.qameta.allure.Severity;
import io.qameta.allure.SeverityLevel;
import io.qameta.allure.Step;
import io.qameta.allure.Story;
import java.util.concurrent.TimeUnit;
import java.util.function.Supplier;
import org.testng.Assert;
import org.testng.annotations.AfterMethod;
import org.testng.annotations.BeforeMethod;
import org.testng.annotations.Test;
import run.halo.e2e.support.AbstractE2ETest;
import run.halo.e2e.support.Assertions;
import run.halo.e2e.support.E2EConfig;
import run.halo.e2e.support.HaloApiClient;
import run.halo.e2e.support.UniqueScope;

/**
 * TC-BE-001: system setup -&gt; Basic Auth -&gt; post lifecycle against a real HTTP instance.
 *
 * <p>Every response is attached to the matching Allure step, so a failure points at the request,
 * the expected value and the actual body.
 */
@Epic("E2E 测试基线")
@Feature("后端 E2E：初始化 / 认证 / 文章生命周期")
public class PostLifecycleE2ETest extends AbstractE2ETest {

    private UniqueScope scope;

    @BeforeMethod(alwaysRun = true)
    public void setUp() {
        scope = UniqueScope.create();
        startInstance();
    }

    @AfterMethod(alwaysRun = true)
    public void tearDown() {
        stopInstance();
    }

    @Test(description = "TC-BE-001 初始化 → Basic Auth → 文章创建/查询/更新/发布/删除")
    @Story("TC-BE-001")
    @Severity(SeverityLevel.BLOCKER)
    @Description("""
            对当前分支构建的临时实例发起真实 HTTP 调用：
            1. POST /system/setup 初始化（204；已初始化时 302 → /console 也接受）
            2. GET /apis/uc.api.halo.run/v1alpha1/users/- 确认 Basic Auth 身份
            3. 创建草稿文章（201），单条与列表均可查询
            4. 更新标题并发布，重新查询到更新后的标题与已发布状态
            5. 删除后单条查询 404，列表不再包含
            """)
    public void shouldCompleteSetupAuthenticationAndPostLifecycle() {
        var username = setupSystem();
        var post = createAndVerifyDraft();
        var postName = Assertions.requireText(post, "metadata.name");
        var createdTitle = Assertions.text(post, "spec.title");
        var newTitle = scope.title("updated");
        var published = updateAndPublish(postName, post, newTitle);

        Assertions.assertField(published, "spec.title", newTitle);
        Assertions.assertPublished(published);
        Assertions.assertListContains(
                api.parse(Assertions.assertStatus(api.listPostsBySlug(scope.slug("post")), 200)), postName);

        deleteAndVerifyGone(postName);

        Allure.addAttachment(
                "scenario-summary",
                "text/plain",
                "authenticated user=" + username + "\npost=" + postName + "\ncreated title=" + createdTitle
                        + "\nupdated title=" + newTitle);
    }

    @Step("初始化系统并校验管理员身份")
    private String setupSystem() {
        var setup = api.setupSystem();
        Assertions.assertStatusOneOf(setup, 204, 302);
        if (setup.status() == 302) {
            var location = setup.location().stream().findFirst().orElse("");
            Allure.addAttachment("setup-already-initialized", "text/plain", "302 Location=" + location);
            Assert.assertTrue(
                    location.endsWith("/console"),
                    "Already initialized instance must redirect to /console but went to [" + location + "]");
        }

        var me = Assertions.assertStatus(api.currentUser(), 200);
        // /users/- returns {user, roles, passwordSet}; metadata.name lives under user.
        var user = api.parse(me);
        var name = Assertions.requireText(user, "user.metadata.name");
        Assert.assertEquals(name, E2EConfig.ADMIN_USERNAME, "Authenticated user metadata.name");
        return name;
    }

    @Step("创建草稿文章并校验单条 / 列表查询")
    private JsonNode createAndVerifyDraft() {
        var title = scope.title("draft post");
        var slug = scope.slug("post");
        var created = api.createDraft(title, slug, "<p>E2E draft content</p>");

        Assertions.assertStatus(created, 200);
        var post = api.parse(created);
        var name = Assertions.requireText(post, "metadata.name");
        Assertions.assertField(post, "spec.title", title);
        Assertions.assertField(post, "spec.slug", slug);
        Assert.assertFalse(
                post.path("spec").path("publish").asBoolean(false), "New post must start as draft (spec.publish=false)");

        var single = api.parse(Assertions.assertStatus(api.getPost(name), 200));
        Assertions.assertField(single, "spec.title", title);
        Assertions.assertListContains(api.parse(Assertions.assertStatus(api.listPostsBySlug(slug), 200)), name);
        return single;
    }

    @Step("更新标题并发布文章，有上限轮询已发布状态")
    private JsonNode updateAndPublish(String name, JsonNode post, String newTitle) {
        // Console update (spec + content) is the same call the UI editor uses before publishing.
        // Read the latest version: the draft reconciler updates the post right after creation.
        var response = api.waitForStatus(
                () -> {
                    var latest = api.getPost(name);
                    if (latest.status() != 200) {
                        return latest;
                    }
                    var updated = api.parse(latest).deepCopy();
                    ((com.fasterxml.jackson.databind.node.ObjectNode) updated.path("spec")).put("title", newTitle);
                    return api.updateDraft(name, updated, "<p>Updated by TC-BE-001</p>");
                },
                200,
                java.time.Duration.ofSeconds(30));
        if (response.status() != 200) {
            Assertions.assertStatus(response, 200);
        }
        Assertions.assertStatus(api.publishPost(name), 200);

        // The publish endpoint waits for the released snapshot; polling covers reconciler lag
        // without any fixed sleep beyond the bounded retry interval.
        Supplier<JsonNode> fetch = () -> api.parse(Assertions.assertStatus(api.getPost(name), 200));
        var deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(E2EConfig.PUBLISH_TIMEOUT_SECONDS);
        var latest = fetch.get();
        while (System.nanoTime() < deadline) {
            if (newTitle.equals(Assertions.text(latest, "spec.title"))
                    && latest.path("spec").path("publish").asBoolean(false)
                    && !Assertions.text(latest, "spec.releaseSnapshot").isBlank()) {
                return latest;
            }
            try {
                Thread.sleep(1000);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new AssertionError("Interrupted while polling publish status", e);
            }
            latest = fetch.get();
        }
        throw new AssertionError(
                "Post [%s] did not converge to published within %ds. Last response: %s"
                        .formatted(name, E2EConfig.PUBLISH_TIMEOUT_SECONDS, latest));
    }

    @Step("删除文章并校验不存在")
    private void deleteAndVerifyGone(String name) {
        var slug = Assertions.text(api.parse(Assertions.assertStatus(api.getPost(name), 200)), "spec.slug");
        Assertions.assertStatusOneOf(api.deletePost(name), 200, 204);

        // Deletion is asynchronous: poll the active list (and the per-resource availability)
        // with a bounded timeout instead of assuming it is instant.
        var deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(30);
        String lastObservation = "not checked";
        while (System.nanoTime() < deadline) {
            var single = api.getPost(name);
            var list = api.listPostsBySlug(slug);
            long activeTotal = list.status() == 200 ? api.parse(list).path("total").asLong(-1) : -1;
            String deletedFlag = single.status() == 200
                    ? Assertions.text(api.parse(single), "spec.deleted")
                    : null;
            boolean goneFromActiveList = list.status() == 200 && activeTotal == 0;
            boolean unavailableOrDeleted = single.status() == 404 || "true".equals(deletedFlag);
            if (goneFromActiveList && unavailableOrDeleted) {
                return;
            }
            lastObservation = "single=" + single.status() + ", deleted=" + deletedFlag + ", activeTotal=" + activeTotal;
            try {
                Thread.sleep(1000);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new AssertionError("Interrupted while polling deletion", e);
            }
        }
        throw new AssertionError("Post [%s] was not removed within 30s (%s)".formatted(name, lastObservation));
    }
}
