package run.halo.e2e.backend;

import static org.testng.Assert.assertEquals;
import static org.testng.Assert.assertFalse;
import static org.testng.Assert.assertNotNull;
import static org.testng.Assert.assertTrue;

import io.qameta.allure.Epic;
import io.qameta.allure.Feature;
import io.qameta.allure.Severity;
import io.qameta.allure.SeverityLevel;
import io.qameta.allure.Story;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.testng.annotations.AfterClass;
import org.testng.annotations.BeforeClass;
import org.testng.annotations.Listeners;
import org.testng.annotations.Test;
import run.halo.e2e.core.E2eConfig;
import run.halo.e2e.core.E2eEnvironment;
import run.halo.e2e.core.E2eEnvironmentListener;
import run.halo.e2e.core.E2eHttpClient;
import run.halo.e2e.core.HaloApi;
import run.halo.e2e.core.Json;

/**
 * TC-BE-001: system setup -> Basic Auth -> post create/query/update/publish/delete.
 * Runs against a real Halo process started from the current branch (no mocks).
 */
@Epic("Halo E2E baseline")
@Feature("Backend HTTP chain")
@Story("TC-BE-001 setup, authentication and post lifecycle")
@Listeners(E2eEnvironmentListener.class)
public class PostLifecycleE2eTest {

    private E2eEnvironment env;
    private HaloApi api;
    private E2eHttpClient http;
    private String postName;
    private String draftTitle;
    private String slug;

    @BeforeClass(alwaysRun = true)
    public void setUp() {
        env = E2eEnvironment.get();
        api = env.api();
        http = env.http();
        env.initialize();
    }

    @Test(
            priority = 1,
            description = "Initialized administrator can authenticate with Basic Auth")
    @Severity(SeverityLevel.BLOCKER)
    public void shouldAuthenticateInitializedAdministrator() {
        Map<String, Object> user = api.currentUser();
        // /users/- returns the current subject together with its roles in a wrapper.
        assertEquals(Json.string(user, "user.metadata.name"), E2eConfig.username(),
                "current user should be the initialized admin");
        assertTrue(Json.string(user, "roles.0.metadata.name") != null, "current user should carry at least one role");
    }

    @Test(priority = 2, description = "Post is created as draft and can be queried individually and by list")
    @Severity(SeverityLevel.CRITICAL)
    public void shouldCreateAndQueryDraftPost() {
        String token = E2eConfig.scopeToken();
        draftTitle = "E2E draft " + token;
        slug = "e2e-" + token;

        Map<String, Object> created = api.createDraft(slug, draftTitle);
        postName = Json.string(created, "metadata.name");
        assertNotNull(postName, "creation response must include metadata.name");
        assertFalse(postName.isBlank(), "metadata.name must not be blank");
        assertEquals(Json.string(created, "spec.title"), draftTitle, "created title");
        assertEquals(Json.string(created, "spec.slug"), slug, "created slug");
        assertFalse(Boolean.parseBoolean(Json.string(created, "spec.publish")), "new post must be a draft");

        E2eHttpClient.Response single = http.get(HaloApi.POSTS_API + "/" + postName, true);
        assertEquals(single.status(), 200, "GET single post status");
        Map<String, Object> fetched = Json.parseObject(single.body());
        assertEquals(Json.string(fetched, "spec.title"), draftTitle, "single query title");
        assertEquals(Json.string(fetched, "spec.slug"), slug, "single query slug");

        E2eHttpClient.Response list = http.get(
                HaloApi.POSTS_API + "?fieldSelector=metadata.name%3D" + postName + "&page=1&size=1", true);
        assertEquals(list.status(), 200, "GET post list status");
        Map<String, Object> listed = Json.parseObject(list.body());
        assertTrue(((Number) listed.get("total")).longValue() >= 1, "list should contain the created post");
        List<?> items = (List<?>) listed.get("items");
        assertEquals(items.size(), 1, "list size for the unique name filter");
        assertEquals(Json.string(items.get(0), "metadata.name"), postName, "listed post name");
    }

    @Test(
            priority = 3,
            dependsOnMethods = "shouldCreateAndQueryDraftPost",
            description = "Post can be updated and published; published state is observable")
    @Severity(SeverityLevel.CRITICAL)
    public void shouldUpdateAndPublishPost() {
        String newTitle = "E2E published " + E2eConfig.scopeToken();
        Map<String, Object> current = Json.parseObject(
                http.get(HaloApi.POSTS_API + "/" + postName, true).body());
        current.put("spec", withPublishAndTitle(current.get("spec"), newTitle));

        // Console endpoint: update spec + content, then publish through the console API.
        Map<String, Object> updateRequest = new java.util.LinkedHashMap<>();
        updateRequest.put("post", current);
        updateRequest.put("content", java.util.Map.of(
                "raw", "<p>Updated by TC-BE-001</p>", "content", "<p>Updated by TC-BE-001</p>", "rawType", "HTML"));
        E2eHttpClient.Response update = http.put(
                HaloApi.CONSOLE_POSTS_API + "/" + postName, true, "application/json", Json.write(updateRequest));
        assertEquals(update.status(), 200, "PUT console post status");

        api.publish(postName);
        api.waitUntilPublished(postName, Duration.ofSeconds(60));

        Map<String, Object> published = Json.parseObject(
                http.get(HaloApi.POSTS_API + "/" + postName, true).body());
        assertEquals(Json.string(published, "spec.title"), newTitle, "title after publish");
        assertTrue(Boolean.parseBoolean(Json.string(published, "metadata.labels.content.halo.run/published"))
                        || "PUBLISHED".equals(Json.string(published, "status.phase")),
                "post should be reported as published by label or phase");
    }

    @Test(
            priority = 4,
            dependsOnMethods = "shouldUpdateAndPublishPost",
            description = "Recycled post leaves the active list and is marked as deleted")
    @Severity(SeverityLevel.NORMAL)
    public void shouldRecyclePost() {
        api.recycle(postName);
        String recycledName = postName;
        // The recycle flow marks the post as deleted; the active list must drop it while the
        // recycled resource stays addressable by name (deleted=true).
        String last = api.waitFor("recycled post to leave the active list", Duration.ofSeconds(60), () -> {
            E2eHttpClient.Response single = http.get(HaloApi.POSTS_API + "/" + recycledName, true);
            E2eHttpClient.Response list = http.get(
                    HaloApi.POSTS_API
                            + "?labelSelector=content.halo.run/deleted%3Dfalse&fieldSelector=metadata.name%3D"
                            + recycledName + "&page=1&size=1",
                    true);
            long total = list.status() == 200
                    ? ((Number) Json.parseObject(list.body()).get("total")).longValue()
                    : -1L;
            String deleted = single.status() == 200 ? Json.string(Json.parseObject(single.body()), "spec.deleted") : null;
            return total == 0L && "true".equals(deleted)
                    ? null
                    : "single=" + single.status() + ", deleted=" + deleted + ", activeTotal=" + total;
        });
        if (last != null) {
            throw new AssertionError("Recycled post is still visible in the active list: " + last);
        }
        postName = null;
    }

    @AfterClass(alwaysRun = true)
    public void cleanUp() {
        // Cleanup never throws: a cleanup warning is logged, the test outcome stays the primary evidence.
        if (postName != null) {
            try {
                api.recycle(postName);
            } catch (RuntimeException ex) {
                System.err.println("[E2E][CLEANUP-WARNING] cannot recycle " + postName + ": " + ex);
            }
        }
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> withPublishAndTitle(Object spec, String title) {
        Map<String, Object> value = new java.util.LinkedHashMap<>((Map<String, Object>) spec);
        value.put("title", title);
        value.put("publish", true);
        return value;
    }
}
