package run.halo.e2e.core;

import io.qameta.allure.Step;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.function.Supplier;

/** Domain helpers for the Halo setup, authentication and post lifecycle APIs. */
public class HaloApi {

    public static final String POSTS_API = "/apis/content.halo.run/v1alpha1/posts";
    public static final String CONSOLE_POSTS_API = "/apis/api.console.halo.run/v1alpha1/posts";
    public static final String CURRENT_USER_API = "/apis/uc.api.halo.run/v1alpha1/users/-";

    private final E2eHttpClient http;
    private final String username;
    private final String password;

    public HaloApi(E2eHttpClient http, String username, String password) {
        this.http = http;
        this.username = username;
        this.password = password;
    }

    public E2eHttpClient http() {
        return http;
    }

    /**
     * Sets up the instance. A 302 to /console means the instance is already initialized,
     * which is a valid state when the suite reuses an existing instance.
     */
    @Step("Ensure Halo instance is initialized")
    public void setupIfRequired() {
        Map<String, Object> request = new LinkedHashMap<>();
        request.put("username", username);
        request.put("password", password);
        request.put("email", E2eConfig.email());
        request.put("siteTitle", E2eConfig.siteTitle());
        request.put("language", "en");
        request.put("externalUrl", "http://localhost:8090");
        // Halo exposes the setup endpoint with an x-www-form-urlencoded body (JSON is metadata only).
        Map<String, String> form = new java.util.LinkedHashMap<>();
        request.forEach((key, value) -> form.put(key, String.valueOf(value)));
        E2eHttpClient.Response response = http.postForm("/system/setup", form);
        if (response.status() == 204) {
            return;
        }
        String location = response.header("Location");
        if (response.status() == 302 && location != null && location.contains("/console")) {
            return;
        }
        if (response.status() == 400 || response.status() == 409) {
            // Already initialized: the setup endpoint rejects a second setup with a conflict.
            E2eHttpClient.Response probe = http.get(CURRENT_USER_API, true);
            if (probe.status() == 200) {
                return;
            }
        }
        throw new AssertionError("POST /system/setup expected 204 (or 302 -> /console when already installed) but got "
                + response.status() + ". Body: " + E2eHttpClient.redact(response.body()));
    }

    @Step("Verify Basic Auth against {CURRENT_USER_API}")
    public Map<String, Object> currentUser() {
        E2eHttpClient.Response response = http.get(CURRENT_USER_API, true);
        if (response.status() != 200) {
            throw new AssertionError("GET " + CURRENT_USER_API + " expected 200 but got " + response.status()
                    + ". Body: " + E2eHttpClient.redact(response.body()));
        }
        return Json.parseObject(response.body());
    }

    @Step("Create draft post {slug}")
    public Map<String, Object> createDraft(String slug, String title) {
        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("name", java.util.UUID.randomUUID().toString());
        metadata.put("annotations", Map.of(
                "content.halo.run/preferred-editor", "default",
                "content.halo.run/keep-raw", "true"));

        Map<String, Object> post = new LinkedHashMap<>();
        post.put("apiVersion", "content.halo.run/v1alpha1");
        post.put("kind", "Post");
        post.put("metadata", metadata);
        post.put("spec", newPostSpec(title, slug));

        // Container-type resource: the generic /posts router expects the Extension itself.
        E2eHttpClient.Response response = http.post(POSTS_API, true, "application/json", Json.write(post));
        if (response.status() != 201) {
            throw new AssertionError("POST " + POSTS_API + " expected 201 but got " + response.status()
                    + ". Body: " + E2eHttpClient.redact(response.body()));
        }
        return Json.parseObject(response.body());
    }

    /** Base Post spec; rich content is attached through the console draft API in the UI flow. */
    public static Map<String, Object> newPostSpec(String title, String slug) {
        Map<String, Object> spec = new LinkedHashMap<>();
        spec.put("title", title);
        spec.put("slug", slug);
        spec.put("template", "");
        spec.put("cover", "");
        spec.put("deleted", false);
        spec.put("publish", false);
        spec.put("pinned", false);
        spec.put("allowComment", true);
        spec.put("visible", "PUBLIC");
        spec.put("priority", 0);
        spec.put("excerpt", Map.of("autoGenerate", true, "raw", ""));
        spec.put("categories", java.util.List.of());
        spec.put("tags", java.util.List.of());
        spec.put("htmlMetas", java.util.List.of());
        return spec;
    }

    @Step("Publish post {name}")
    public Map<String, Object> publish(String name) {
        E2eHttpClient.Response response = http.put(CONSOLE_POSTS_API + "/" + name + "/publish", true, null, null);
        if (response.status() < 200 || response.status() >= 300) {
            throw new AssertionError("PUT " + CONSOLE_POSTS_API + "/{name}/publish expected 2xx but got "
                    + response.status() + ". Body: " + E2eHttpClient.redact(response.body()));
        }
        return response.body().isBlank() ? java.util.Map.of() : Json.parseObject(response.body());
    }

    @Step("Wait until post {name} is visible in the published list")
    public void waitUntilPublished(String name, Duration timeout) {
        String lastSeen = waitFor("post " + name + " to become published", timeout, () -> {
            E2eHttpClient.Response response = http.get(
                    POSTS_API + "?labelSelector=content.halo.run/published%3Dtrue&fieldSelector=metadata.name%3D" + name
                            + "&page=1&size=1",
                    true);
            if (response.status() != 200) {
                return "status=" + response.status();
            }
            Map<String, Object> list = Json.parseObject(response.body());
            Object total = list.get("total");
            return total instanceof Number number && number.longValue() > 0 ? null : "total=" + total;
        });
        if (lastSeen != null) {
            throw new AssertionError("Post " + name + " did not become published within " + timeout.toSeconds()
                    + "s (last observation: " + lastSeen + ")");
        }
    }

    /**
     * Bounded polling helper: returns {@code null} once the supplier stops reporting a problem,
     * otherwise the last observed problem after the timeout.
     */
    public String waitFor(String description, Duration timeout, java.util.function.Supplier<String> observation) {
        Instant deadline = Instant.now().plus(timeout);
        String last = "not observed";
        while (Instant.now().isBefore(deadline)) {
            try {
                last = observation.get();
                if (last == null) {
                    return null;
                }
            } catch (RuntimeException ex) {
                last = ex.getClass().getSimpleName() + ": " + ex.getMessage();
            }
            sleep(Duration.ofSeconds(1));
        }
        return last;
    }

    @Step("Recycle post {name}")
    public void recycle(String name) {
        E2eHttpClient.Response response = http.put(CONSOLE_POSTS_API + "/" + name + "/recycle", true, null, null);
        if (response.status() < 200 || response.status() >= 300) {
            throw new AssertionError("PUT " + CONSOLE_POSTS_API + "/{name}/recycle expected 2xx but got "
                    + response.status() + ". Body: " + E2eHttpClient.redact(response.body()));
        }
    }

    /** Finds a post created through the UI by its unique title. */
    @Step("Find post by title {title}")
    public Map<String, Object> findByTitle(String title) {
        E2eHttpClient.Response response = http.get(
                POSTS_API + "?fieldSelector=spec.title%3D" + java.net.URLEncoder.encode(title, java.nio.charset.StandardCharsets.UTF_8)
                        + "&page=1&size=1",
                true);
        if (response.status() != 200) {
            throw new AssertionError("List posts expected 200 but got " + response.status());
        }
        Map<String, Object> list = Json.parseObject(response.body());
        Object items = list.get("items");
        if (!(items instanceof java.util.List<?> listItems) || listItems.isEmpty()) {
            return null;
        }
        @SuppressWarnings("unchecked")
        Map<String, Object> post = (Map<String, Object>) listItems.get(0);
        return post;
    }

    /** Retries a cleanup action with a bounded wait, so transient reconciler locks do not hide leftovers. */
    public void retry(String action, int attempts, Supplier<Boolean> check) {
        RuntimeException last = null;
        for (int i = 0; i < attempts; i++) {
            try {
                if (Boolean.TRUE.equals(check.get())) {
                    return;
                }
            } catch (RuntimeException ex) {
                last = ex;
            }
            sleep(Duration.ofMillis(500));
        }
        throw new IllegalStateException("Cleanup failed: " + action + (last == null ? "" : (": " + last.getMessage())), last);
    }

    private static void sleep(Duration duration) {
        try {
            Thread.sleep(duration.toMillis());
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Interrupted", ex);
        }
    }
}
