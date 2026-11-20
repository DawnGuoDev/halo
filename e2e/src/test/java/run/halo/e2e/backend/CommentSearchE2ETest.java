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
import org.testng.Assert;
import org.testng.annotations.AfterMethod;
import org.testng.annotations.BeforeMethod;
import org.testng.annotations.Test;
import run.halo.e2e.support.AbstractE2ETest;
import run.halo.e2e.support.Assertions;
import run.halo.e2e.support.HaloApiClient;
import run.halo.e2e.support.UniqueScope;

/**
 * TC-BE-003 / TC-BE-004: keyword search on the public comment and reply list APIs.
 *
 * <p>These tests verify that the front-of-site {@code GET /apis/api.halo.run/v1alpha1/comments}
 * and {@code GET /apis/api.halo.run/v1alpha1/comments/{name}/reply} endpoints honour the optional
 * {@code keyword} query parameter:
 * <ul>
 *   <li>Non-blank keyword narrows results to those whose {@code spec.raw} contains the keyword.</li>
 *   <li>Blank or absent keyword returns the same result set as before (backward compatible).</li>
 *   <li>No-match returns an empty list with {@code total=0}.</li>
 *   <li>The reply search only returns replies belonging to the specified comment.</li>
 * </ul>
 *
 * <p>Comments and replies are created through the same public API (as the authenticated admin) so
 * they are auto-approved and visible to the Basic-Auth caller.
 */
@Epic("E2E 测试基线")
@Feature("后端 E2E：前台评论 / 回复关键词搜索")
public class CommentSearchE2ETest extends AbstractE2ETest {

    /** Post GVK constants — the comment subject ref used by the test post. */
    private static final String POST_GROUP = "content.halo.run";
    private static final String POST_VERSION = "v1alpha1";
    private static final String POST_KIND = "Post";

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

    @Test(description = "TC-BE-003 前台评论列表 keyword 搜索：命中、空白兼容、无匹配空列表")
    @Story("TC-BE-003")
    @Severity(SeverityLevel.CRITICAL)
    @Description("""
            对当前分支构建的临时实例发起真实 HTTP 调用：
            1. 初始化系统并发布一篇文章
            2. 通过公开 API 创建两条已审核评论（raw 分别含/不含目标关键词）
            3. 在“新评论需审核”生效时由匿名访客创建一条含关键词的待审核评论
            4. 匿名访客传入 keyword 时仅返回 raw 命中的已审核评论，待审核评论不可见
            5. 空白 keyword 等价于未传，返回全部可见评论
            6. 无匹配 keyword 返回空列表 total=0
            """)
    public void shouldSearchPublicCommentsByKeyword() {
        setupSystem();
        var post = createAndPublishPost();
        var postName = Assertions.requireText(post, "metadata.name");

        var keyword = scope.token() + "-kw";

        // With review required, comments posted now stay unapproved (invisible to visitors)
        Assert.assertTrue(api.waitForCommentReviewMode(false),
                "comment review mode must take effect before the unapproved scenario");
        var commentA = createComment(postName, "分享好用的" + keyword + "工具", "<p>分享</p>");
        var commentB = createComment(postName, "随便聊聊", "<p>闲聊</p>");
        var pendingName = Assertions.requireText(api.parse(
                api.createAnonymousComment("待审核也提到" + keyword, "<p>待审核</p>",
                        POST_GROUP, POST_VERSION, POST_KIND, postName)), "metadata.name");
        Assertions.assertStatusOneOf(api.setCommentRequireReview(false), 200, 204);
        var commentAName = Assertions.requireText(api.parse(commentA), "metadata.name");
        var commentBName = Assertions.requireText(api.parse(commentB), "metadata.name");

        // 1. keyword narrows to matching comment only
        // Visitor view: anonymous request must never expose the unapproved comment
        var matched = api.parse(Assertions.assertStatus(
                api.listPublicComments(POST_GROUP, POST_VERSION, POST_KIND, postName, keyword, false), 200));
        var matchedNames = extractNames(matched);
        Allure.addAttachment("anonymous-comment-search", "text/plain",
                "keyword=" + keyword + "\nhits=" + matchedNames + "\ncommentA=" + commentAName
                        + "\ncommentB=" + commentBName + "\nunapproved=" + pendingName);
        Assert.assertTrue(matchedNames.contains(commentAName),
                "keyword match must contain comment A [" + commentAName + "], got: " + matchedNames);
        Assert.assertFalse(matchedNames.contains(commentBName),
                "keyword match must not contain comment B [" + commentBName + "], got: " + matchedNames);
        Assert.assertFalse(matchedNames.contains(pendingName),
                "keyword match must not expose unapproved comment [" + pendingName + "], got: " + matchedNames);
        Assert.assertTrue(allRawContain(matched, keyword),
                "all returned comments must contain the keyword in spec.raw");
        Assert.assertEquals(matchedNames.size(), 1,
                "keyword search for a unique token must return exactly one comment, got: " + matchedNames);

        // 2. blank keyword behaves like no keyword — both comments visible
        var blank = api.parse(Assertions.assertStatus(
                api.listPublicComments(POST_GROUP, POST_VERSION, POST_KIND, postName, "  "), 200));
        var blankNames = extractNames(blank);
        Allure.addAttachment("blank-keyword-comments", "text/plain", "hits=" + blankNames);
        Assert.assertTrue(blankNames.contains(commentAName),
                "blank keyword should return comment A, got: " + blankNames);
        Assert.assertTrue(blankNames.contains(commentBName),
                "blank keyword should return comment B, got: " + blankNames);

        // 3. no-match keyword returns empty list
        var none = api.parse(Assertions.assertStatus(
                api.listPublicComments(POST_GROUP, POST_VERSION, POST_KIND, postName,
                        keyword + "-no-such-thing"), 200));
        Allure.addAttachment("unmatched-keyword-comments", "text/plain", "response=" + none.toString());
        Assert.assertEquals(none.path("total").asLong(-1), 0L, "unmatched keyword must return total=0");
        Assert.assertFalse(none.path("items").isArray() && none.path("items").size() > 0,
                "unmatched keyword must return empty items");

        Allure.addAttachment("scenario-summary", "text/plain",
                "post=" + postName + "\nkeyword=" + keyword + "\ncommentA=" + commentAName
                        + "\ncommentB=" + commentBName);
    }

    @Test(description = "TC-BE-004 前台回复列表 keyword 搜索：命中、不跨评论、空白兼容、无匹配空列表")
    @Story("TC-BE-004")
    @Severity(SeverityLevel.CRITICAL)
    @Description("""
            对当前分支构建的临时实例发起真实 HTTP 调用：
            1. 初始化系统并发布一篇文章
            2. 创建一条已审核评论，再在其下创建两条已审核回复（raw 分别含/不含目标关键词）
            3. 在“新评论需审核”生效时由普通登录用户创建一条含关键词的待审核回复
            4. 匿名访客传入 keyword 时仅返回 raw 命中的已审核回复，待审核回复不可见
            5. 空白 keyword 等价于未传，返回全部可见回复
            6. 无匹配 keyword 返回空列表 total=0
            7. 回复搜索只返回指定评论下的回复
            """)
    public void shouldSearchPublicRepliesByKeyword() {
        setupSystem();
        var post = createAndPublishPost();
        var postName = Assertions.requireText(post, "metadata.name");

        var keyword = scope.token() + "-reply-kw";

        var comment = createComment(postName, "评论正文", "<p>评论</p>");
        var commentName = Assertions.requireText(api.parse(comment), "metadata.name");

        Assertions.assertStatusOneOf(api.setCommentRequireReview(true), 200, 204);
        Assert.assertTrue(api.waitForCommentReviewMode(false),
                "comment review mode must take effect before the unapproved scenario");
        var replyA = createReply(commentName, "关于" + keyword + "的一句话", "<p>回复A</p>");
        var replyB = createReply(commentName, "其他内容", "<p>回复B</p>");
        var visitor = api.createRegularUserClient("e2e-visitor-" + scope.token(), "E2eVisitor.1234",
                "visitor@example.com");
        var pendingReply = visitor.createReply(commentName, "待审核回复也提到" + keyword, "<p>待审核</p>");
        Assert.assertFalse(visitor.parse(pendingReply).path("spec").path("approved").asBoolean(true),
                "regular user reply must stay unapproved while review is required");
        var pendingReplyName = Assertions.requireText(visitor.parse(pendingReply), "metadata.name");
        Assertions.assertStatusOneOf(api.setCommentRequireReview(false), 200, 204);
        var replyAName = Assertions.requireText(api.parse(replyA), "metadata.name");
        var replyBName = Assertions.requireText(api.parse(replyB), "metadata.name");

        // 1. keyword narrows to matching reply only
        // Visitor view: anonymous request must never expose the unapproved reply
        var matched = api.parse(Assertions.assertStatus(
                api.listPublicReplies(commentName, keyword, false), 200));
        var matchedNames = extractNames(matched);
        Allure.addAttachment("anonymous-reply-search", "text/plain",
                "comment=" + commentName + "\nkeyword=" + keyword + "\nhits=" + matchedNames
                        + "\nreplyA=" + replyAName + "\nreplyB=" + replyBName
                        + "\nunapproved=" + pendingReplyName);
        Assert.assertTrue(matchedNames.contains(replyAName),
                "keyword match must contain reply A [" + replyAName + "], got: " + matchedNames);
        Assert.assertFalse(matchedNames.contains(replyBName),
                "keyword match must not contain reply B [" + replyBName + "], got: " + matchedNames);
        Assert.assertFalse(matchedNames.contains(pendingReplyName),
                "keyword match must not expose unapproved reply [" + pendingReplyName + "], got: " + matchedNames);
        Assert.assertTrue(allRawContain(matched, keyword),
                "all returned replies must contain the keyword in spec.raw");
        Assert.assertEquals(matchedNames.size(), 1,
                "keyword search for a unique token must return exactly one reply, got: " + matchedNames);

        // 2. blank keyword behaves like no keyword
        var blank = api.parse(Assertions.assertStatus(
                api.listPublicReplies(commentName, "  "), 200));
        var blankNames = extractNames(blank);
        Assert.assertTrue(blankNames.contains(replyAName),
                "blank keyword should return reply A, got: " + blankNames);
        Assert.assertTrue(blankNames.contains(replyBName),
                "blank keyword should return reply B, got: " + blankNames);

        // 3. no-match keyword returns empty list
        var none = api.parse(Assertions.assertStatus(
                api.listPublicReplies(commentName, keyword + "-no-such-thing"), 200));
        Allure.addAttachment("unmatched-keyword-replies", "text/plain", "response=" + none.toString());
        Assert.assertEquals(none.path("total").asLong(-1), 0L, "unmatched keyword must return total=0");
        Assert.assertFalse(none.path("items").isArray() && none.path("items").size() > 0,
                "unmatched keyword must return empty items");

        Allure.addAttachment("scenario-summary", "text/plain",
                "comment=" + commentName + "\nkeyword=" + keyword + "\nreplyA=" + replyAName
                        + "\nreplyB=" + replyBName);
    }

    // ------------------------------------------------------------------
    // Step helpers
    // ------------------------------------------------------------------

    @Step("初始化系统并校验管理员身份")
    private void setupSystem() {
        var setup = api.setupSystem();
        Assertions.assertStatusOneOf(setup, 204, 302);
        Assertions.assertStatus(api.currentUser(), 200);
    }

    @Step("创建并发布文章")
    private JsonNode createAndPublishPost() {
        var title = scope.title("comment search post");
        var slug = scope.slug("post");
        var created = api.createDraft(title, slug, "<p>E2E comment search content</p>");
        Assertions.assertStatus(created, 200);
        var post = api.parse(created);
        var name = Assertions.requireText(post, "metadata.name");

        // Publish and wait for convergence
        var response = api.waitForStatus(
                () -> {
                    var latest = api.getPost(name);
                    if (latest.status() != 200) {
                        return latest;
                    }
                    var updated = api.parse(latest).deepCopy();
                    return api.updateDraft(name, updated, "<p>E2E comment search</p>");
                },
                200,
                java.time.Duration.ofSeconds(30));
        Assertions.assertStatus(response, 200);
        Assertions.assertStatus(api.publishPost(name), 200);

        var deadline = System.nanoTime()
                + java.util.concurrent.TimeUnit.SECONDS.toNanos(run.halo.e2e.support.E2EConfig.PUBLISH_TIMEOUT_SECONDS);
        var latest = api.parse(Assertions.assertStatus(api.getPost(name), 200));
        while (System.nanoTime() < deadline) {
            if (latest.path("spec").path("publish").asBoolean(false)
                    && !Assertions.text(latest, "spec.releaseSnapshot").isBlank()) {
                return latest;
            }
            try {
                Thread.sleep(1000);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new AssertionError("Interrupted while polling publish status", e);
            }
            latest = api.parse(Assertions.assertStatus(api.getPost(name), 200));
        }
        throw new AssertionError("Post [" + name + "] did not converge to published in time. Last: " + latest);
    }

    @Step("在文章 {postName} 下创建评论 raw={raw}")
    private HaloApiClient.RichResponse createComment(String postName, String raw, String content) {
        return api.createComment(raw, content, POST_GROUP, POST_VERSION, POST_KIND, postName);
    }

    @Step("在评论 {commentName} 下创建回复 raw={raw}")
    private HaloApiClient.RichResponse createReply(String commentName, String raw, String content) {
        return api.createReply(commentName, raw, content);
    }

    // ------------------------------------------------------------------
    // Assertion utilities
    // ------------------------------------------------------------------

    /** Extracts metadata.name from each item in a ListResult. */
    private static java.util.List<String> extractNames(JsonNode listResult) {
        var items = listResult.path("items");
        var names = new java.util.ArrayList<String>();
        if (items.isArray()) {
            for (JsonNode item : items) {
                names.add(item.path("metadata").path("name").asText());
            }
        }
        return names;
    }

    /** Checks that every item's spec.raw contains the given keyword (case-insensitive). */
    private static boolean allRawContain(JsonNode listResult, String keyword) {
        var items = listResult.path("items");
        if (!items.isArray() || items.isEmpty()) {
            return false;
        }
        var lowerKeyword = keyword.toLowerCase(java.util.Locale.ROOT);
        for (JsonNode item : items) {
            var raw = item.path("spec").path("raw").asText("");
            if (!raw.toLowerCase(java.util.Locale.ROOT).contains(lowerKeyword)) {
                return false;
            }
        }
        return true;
    }
}
