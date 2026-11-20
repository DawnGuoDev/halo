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

    /** Public theme API for comments (no Basic Auth required for listing). */
    private static final String PUBLIC_COMMENTS = "/apis/api.halo.run/v1alpha1/comments";

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
        return setupSystem(null);
    }

    /** Setup with explicit credentials (used when a password must stay invalid). */
    public RichResponse setupSystem(String passwordOverride) {
        // The setup router only matches application/x-www-form-urlencoded (JSON is the
        // request-body metadata in the OpenAPI document, not the actual route content type).
        var form = java.util.stream.Stream.of(
                        "username=" + encode(E2EConfig.ADMIN_USERNAME),
                        "password=" + encode(passwordOverride == null ? E2EConfig.ADMIN_PASSWORD : passwordOverride),
                        "email=" + encode(E2EConfig.ADMIN_EMAIL),
                        "siteTitle=" + encode(E2EConfig.SITE_TITLE),
                        "language=" + encode(E2EConfig.LANGUAGE),
                        "externalUrl=" + encode(baseUrl))
                .reduce((left, right) -> left + "&" + right)
                .orElse("");
        return send("POST /system/setup", request("/system/setup", false)
                .POST(HttpRequest.BodyPublishers.ofString(form))
                .header("Content-Type", "application/x-www-form-urlencoded")
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
                .POST(HttpRequest.BodyPublishers.ofString(body.toString()))
                .header("Content-Type", "application/json")
                .build());
    }

    /** Lists posts filtered by the unique slug assigned by the frontend suite. */
    /** Console update used by the UI editor: post spec + raw content in one call. */
    public RichResponse updateDraft(String name, JsonNode post, String content) {
        var body = json.createObjectNode();
        body.set("post", post);
        var contentNode = body.putObject("content");
        contentNode.put("raw", content);
        contentNode.put("content", content);
        contentNode.put("rawType", "HTML");
        return send("PUT console draft post " + name, jsonRequest(CONSOLE_POSTS + "/" + name, body)
                .PUT(HttpRequest.BodyPublishers.ofString(body.toString()))
                .header("Content-Type", "application/json")
                .build());
    }

    public RichResponse listPosts() {
        return send("GET post list", jsonRequest(POSTS + "?page=1&size=100").GET().build());
    }

    public RichResponse getPost(String name) {
        return send("GET post " + name, jsonRequest(POSTS + "/" + name).GET().build());
    }

    /** Bounded polling for write calls that may race with reconcilers (e.g. optimistic locks). */
    public RichResponse waitForStatus(
            java.util.function.Supplier<RichResponse> action, int expected, Duration timeout) {
        var deadline = System.nanoTime() + timeout.toNanos();
        RichResponse last = null;
        while (System.nanoTime() < deadline) {
            last = action.get();
            if (last.status() == expected) {
                return last;
            }
            if (last.status() != 409) {
                return last;
            }
            try {
                Thread.sleep(500);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new AssertionError("Interrupted while retrying a conflicting write", e);
            }
        }
        return last;
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
                .PUT(HttpRequest.BodyPublishers.ofString(updated.toString()))
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


    /**
     * Creates a comment on the given subject ref through the public theme API. The comment is
     * authored by the authenticated admin user, so it is auto-approved (visible to anonymous
     * visitors).
     */
    public RichResponse createComment(String raw, String content, String group, String version,
            String kind, String subjectName) {
        var body = json.createObjectNode();
        body.putObject("subjectRef")
                .put("group", group)
                .put("version", version)
                .put("kind", kind)
                .put("name", subjectName);
        body.put("raw", raw);
        body.put("content", content);
        body.put("allowNotification", true);
        body.put("hidden", false);
        return send("POST public comment", jsonRequest(PUBLIC_COMMENTS, body)
                .POST(HttpRequest.BodyPublishers.ofString(body.toString()))
                .header("Content-Type", "application/json")
                .build());
    }

    /**
     * Creates a reply under the given comment through the public theme API. Authored by the admin,
     * so it is auto-approved.
     */
    public RichResponse createReply(String commentName, String raw, String content) {
        var body = json.createObjectNode();
        body.put("raw", raw);
        body.put("content", content);
        body.put("allowNotification", true);
        body.put("hidden", false);
        return send("POST public reply for " + commentName,
                jsonRequest(PUBLIC_COMMENTS + "/" + commentName + "/reply", body)
                        .POST(HttpRequest.BodyPublishers.ofString(body.toString()))
                        .header("Content-Type", "application/json")
                        .build());
    }

    /**
     * Lists comments from the public theme API. The request carries Basic Auth so the admin-created
     * (auto-approved) comments are visible, but the endpoint itself is the public one.
     *
     * @param subjectKind   the GVK kind of the subject (e.g. "Post")
     * @param subjectName   metadata.name of the subject
     * @param group         the GVK group of the subject
     * @param version       the GVK version of the subject
     * @param keyword       optional keyword; pass null or blank to skip
     */
    public RichResponse listPublicComments(String group, String version, String subjectKind,
            String subjectName, String keyword) {
        var query = new StringBuilder(PUBLIC_COMMENTS)
                .append("?kind=").append(encode(subjectKind))
                .append("&name=").append(encode(subjectName))
                .append("&version=").append(encode(version))
                .append("&group=").append(encode(group))
                .append("&page=1&size=100");
        if (keyword != null && !keyword.isBlank()) {
            query.append("&keyword=").append(encode(keyword));
        }
        return send("GET public comments" + (keyword != null && !keyword.isBlank() ? " keyword=" + keyword : ""),
                jsonRequest(query.toString()).GET().build());
    }

    /**
     * Lists replies for a comment from the public theme API.
     *
     * @param commentName metadata.name of the parent comment
     * @param keyword     optional keyword; pass null or blank to skip
     */
    public RichResponse listPublicReplies(String commentName, String keyword) {
        var query = new StringBuilder(PUBLIC_COMMENTS)
                .append("/").append(encode(commentName))
                .append("/reply?page=1&size=100");
        if (keyword != null && !keyword.isBlank()) {
            query.append("&keyword=").append(encode(keyword));
        }
        return send("GET public replies" + (keyword != null && !keyword.isBlank() ? " keyword=" + keyword : ""),
                jsonRequest(query.toString()).GET().build());
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

    private HttpRequest.Builder request(String path, boolean authenticated) {
        var builder = HttpRequest.newBuilder(URI.create(baseUrl + path))
                .timeout(Duration.ofSeconds(60))
                .header("Accept", "application/json");
        if (authenticated) {
            builder.header("Authorization", basicAuth());
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

    private static String encode(String value) {
        return java.net.URLEncoder.encode(value, java.nio.charset.StandardCharsets.UTF_8);
    }
}
