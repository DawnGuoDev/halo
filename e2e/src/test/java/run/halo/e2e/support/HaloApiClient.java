package run.halo.e2e.support;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.qameta.allure.Attachment;
import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpHeaders;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import java.util.List;
import java.util.Optional;

/**
 * Thin HTTP client for the real endpoints consumed by the E2E suites. Failures are reported with
 * request and response summaries so an Allure report can locate the exact step.
 */
public final class HaloApiClient {

    private static final String POSTS = "/apis/content.halo.run/v1alpha1/posts";
    private static final String CONSOLE_POSTS = "/apis/api.console.halo.run/v1alpha1/posts";
    private static final String CURRENT_USER = "/apis/uc.api.halo.run/v1alpha1/users/-";

    private final String baseUrl;
    private final HttpClient http;
    private final ObjectMapper json = new ObjectMapper();

    public HaloApiClient(String baseUrl, HttpClient http) {
        this.baseUrl = baseUrl;
        this.http = http;
    }

    /** Basic-auth client using the temporary instance administrator. */
    public static HaloApiClient basic(HaloInstance instance) {
        return new HaloApiClient(instance.baseUrl(), instance.newHttpClient());
    }

    public RichResponse setupSystem() {
        var body = json.createObjectNode();
        body.put("username", E2EConfig.ADMIN_USERNAME);
        body.put("password", E2EConfig.ADMIN_PASSWORD);
        body.put("email", E2EConfig.ADMIN_EMAIL);
        body.put("siteTitle", E2EConfig.SITE_TITLE);
        body.put("language", E2EConfig.LANGUAGE);
        body.put("externalUrl", baseUrl);
        return send("POST /system/setup", request("/system/setup")
                .POST(HttpRequest.BodyPublishers.ofString(json.toString()))
                .header("Content-Type", "application/json")
                .build());
    }

    public RichResponse currentUser() {
        return send("GET current user", jsonRequest(CURRENT_USER).GET().build());
    }

    /** Creates a draft post through the console endpoint used by the UI editor. */
    public RichResponse createDraft(String title, String slug, String content) {
        var body = json.createObjectNode();
        var post = body.putObject("post");
        post.put("apiVersion", "content.halo.run/v1alpha1");
        post.put("kind", "Post");
        var metadata = post.putObject("metadata");
        metadata.put("name", java.util.UUID.randomUUID().toString());
        metadata.set("annotations", json.createObjectNode());
        var spec = post.putObject("spec");
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
        spec.putObject("excerpt").put("autoGenerate", true).put("raw", "");
        spec.putArray("categories");
        spec.putArray("tags");
        spec.putArray("htmlMetas");
        var contentNode = body.putObject("content");
        contentNode.put("raw", content);
        contentNode.put("content", content);
        contentNode.put("rawType", "HTML");
        return send("POST console draft post", jsonRequest(CONSOLE_POSTS, body)
                .POST(HttpRequest.BodyPublishers.ofString(json.toString()))
                .header("Content-Type", "application/json")
                .build());
    }

    /** Lists posts filtered by the unique slug assigned by the frontend suite. */
    public RichResponse listPosts() {
        return send("GET post list", jsonRequest(POSTS + "?page=1&size=100").GET().build());
    }

    public RichResponse getPost(String name) {
        return send("GET post " + name, jsonRequest(POSTS + "/" + name).GET().build());
    }

    public RichResponse listPostsBySlug(String slug) {
        var encoded = URLEncoder.encode("spec.slug=" + slug, StandardCharsets.UTF_8);
        return send("GET post list by slug " + slug, jsonRequest(POSTS + "?page=1&size=10&fieldSelector=" + encoded)
                .GET()
                .build());
    }

    /** Updates title and publishes the post, waiting for the released snapshot on the server side. */
    public RichResponse updateAndPublish(String name, JsonNode post, String newTitle) {
        var update = updateTitle(name, post, newTitle);
        if (update.status() / 100 != 2) {
            return update;
        }
        var publish = publishPost(name);
        if (publish.status() / 100 != 2) {
            return publish;
        }
        return getPost(name);
    }

    /** Updates only {@code spec.title} of an existing post. */
    public RichResponse updateTitle(String name, JsonNode post, String newTitle) {
        var updated = post.deepCopy();
        ((ObjectNode) updated.path("spec")).put("title", newTitle);
        return send("PUT update post " + name, jsonRequest(POSTS + "/" + name, updated)
                .PUT(HttpRequest.BodyPublishers.ofString(json.toString()))
                .header("Content-Type", "application/json")
                .build());
    }

    /** Publishes an existing post; the console endpoint waits for the released snapshot. */
    public RichResponse publishPost(String name) {
        return send("PUT publish post " + name, jsonRequest(CONSOLE_POSTS + "/" + name + "/publish")
                .PUT(HttpRequest.BodyPublishers.noBody())
                .build());
    }

    public RichResponse deletePost(String name) {
        return send("DELETE post " + name, jsonRequest(POSTS + "/" + name)
                .DELETE()
                .build());
    }

    public RichResponse consoleRedirect() {
        return send("GET /console without session", jsonRequest("/console").GET().build());
    }

    public RichResponse unauthenticatedUser() {
        return send("GET current user without credentials", noBodyRequest(CURRENT_USER)
                .GET()
                .build());
    }

    /** Wrong-password authentication probe; expects 401 and never sends a real credential. */
    public RichResponse wrongPasswordUser() {
        var token = Base64.getEncoder()
                .encodeToString((E2EConfig.ADMIN_USERNAME + ":wrong-password").getBytes(StandardCharsets.UTF_8));
        return send("GET current user with wrong password", jsonRequest(CURRENT_USER)
                .header("Authorization", "Basic " + token)
                .GET()
                .build());
    }

    public JsonNode parse(RichResponse response) {
        try {
            return json.readTree(response.body());
        } catch (IOException e) {
            throw new AssertionError(
                    "Response body is not JSON (" + response.label() + "): " + truncate(response.body()), e);
        }
    }

    public ObjectMapper mapper() {
        return json;
    }

    private HttpRequest.Builder request(String path) {
        return request(path, true);
    }

    private HttpRequest.Builder jsonRequest(String path) {
        return request(path, true);
    }

    private HttpRequest.Builder jsonRequest(String path, JsonNode body) {
        return request(path, true);
    }

    private HttpRequest.Builder noBodyRequest(String path) {
        return request(path, false);
    }

    private HttpRequest.Builder request(String path, boolean withBody) {
        var builder = HttpRequest.newBuilder(URI.create(baseUrl + path))
                .timeout(Duration.ofSeconds(60))
                .header("Accept", "application/json")
                .header("Authorization", basicAuth());
        if (!withBody) {
            builder.setHeader("X-E2E-No-Body", "true");
        }
        return builder;
    }

    private String basicAuth() {
        return "Basic "
                + Base64.getEncoder()
                        .encodeToString((E2EConfig.ADMIN_USERNAME + ":" + E2EConfig.ADMIN_PASSWORD)
                                .getBytes(StandardCharsets.UTF_8));
    }

    private RichResponse send(String label, HttpRequest request) {
        try {
            var response = http.send(request, HttpResponse.BodyHandlers.ofString());
            return new RichResponse(label, request, response);
        } catch (IOException e) {
            throw new AssertionError(
                    "Request failed at step [" + label + "]: " + E2EConfig.sanitize(e.getMessage()), e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new AssertionError("Interrupted at step [" + label + "]", e);
        }
    }

    /** Response wrapper with Allure-friendly diagnostics. */
    public static final class RichResponse {

        private final String label;
        private final HttpRequest request;
        private final HttpResponse<String> response;

        RichResponse(String label, HttpRequest request, HttpResponse<String> response) {
            this.label = label;
            this.request = request;
            this.response = response;
        }

        public int status() {
            return response.statusCode();
        }

        public String body() {
            return Optional.ofNullable(response.body()).orElse("");
        }

        public String label() {
            return label;
        }

        public HttpHeaders headers() {
            return response.headers();
        }

        public Optional<String> header(String name) {
            return response.headers().firstValue(name);
        }

        public List<String> location() {
            return response.headers().allValues("location");
        }

        /** Attaches a sanitized request/response summary to the current Allure step. */
        @Attachment(value = "HTTP {label}", type = "text/plain")
        public String attachment() {
            return E2EConfig.sanitize("""
                    %s %s
                    request-headers: %s
                    response-status: %d
                    response-headers: %s
                    response-body: %s
                    """.formatted(
                            request.method(),
                            request.uri(),
                            scrub(request.headers()),
                            status(),
                            scrub(response.headers()),
                            truncate(body())));
        }

        @Override
        public String toString() {
            return label + " -> " + status() + " " + truncate(body());
        }

        private static String scrub(HttpHeaders headers) {
            return E2EConfig.sanitize(headers.map().toString());
        }
    }

    static String truncate(String body) {
        if (body == null) {
            return "";
        }
        return body.length() <= 2000 ? body : body.substring(0, 2000) + "...<truncated>";
    }
}
