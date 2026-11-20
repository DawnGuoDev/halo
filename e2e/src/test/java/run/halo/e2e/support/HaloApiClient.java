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
import java.net.CookieManager;
import java.net.CookiePolicy;
import java.security.KeyFactory;
import java.security.PublicKey;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;
import java.util.List;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import javax.crypto.Cipher;

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

    /** Console system-config endpoint for the comment group (requireReviewForNew etc.). */
    private static final String COMMENT_SETTING =
            "/apis/console.api.halo.run/v1alpha1/systemconfigs/comment";

    private final String baseUrl;
    private final HttpClient http;
    private final HttpClient anonymousHttp;
    private final ObjectMapper json = new ObjectMapper();

    private final String username;
    private final String password;

    public HaloApiClient(String baseUrl, HttpClient http) {
        this(baseUrl, http, E2EConfig.ADMIN_USERNAME, E2EConfig.ADMIN_PASSWORD);
    }

    private HaloApiClient(String baseUrl, HttpClient http, String username, String password) {
        this.baseUrl = baseUrl;
        this.http = http;
        this.anonymousHttp = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
        this.username = username;
        this.password = password;
    }

    /** Basic-auth client using the temporary instance administrator. */
    public static HaloApiClient basic(HaloInstance instance) {
        return new HaloApiClient(instance.baseUrl(), instance.newHttpClient());
    }

    /** Cookie-aware client for an already deployed instance (see {@code e2e.base.url}). */
    public static HaloApiClient forBaseUrl(String baseUrl) {
        var cookieManager = new CookieManager();
        cookieManager.setCookiePolicy(CookiePolicy.ACCEPT_ALL);
        var http = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .cookieHandler(cookieManager)
                .build();
        return new HaloApiClient(baseUrl.replaceAll("/+$", ""), http);
    }

    /**
     * Logs in through the real form-login endpoint and keeps the session cookie in the client's
     * {@link CookieManager}. This is necessary for deployed instances where Basic Auth may be
     * disabled by the reverse proxy.
     */
    public RichResponse login() {
        var loginPage = send("GET /login",
                HttpRequest.newBuilder(URI.create(baseUrl + "/login"))
                        .timeout(Duration.ofSeconds(60))
                        .header("Accept", "text/html")
                        .GET()
                        .build());
        if (loginPage.status() != 200) {
            return loginPage;
        }
        var html = loginPage.body();
        var csrf = extractInputValue(html, "_csrf");
        var publicKey = extractPublicKey(html);
        if (csrf == null || publicKey == null) {
            return loginPage;
        }
        var encryptedPassword = encryptPassword(publicKey, password);
        if (encryptedPassword == null) {
            return loginPage;
        }
        var form = java.util.stream.Stream.of(
                        "_csrf=" + encode(csrf),
                        "username=" + encode(username),
                        "password=" + encode(encryptedPassword),
                        "remember-me=on")
                .reduce((left, right) -> left + "&" + right)
                .orElse("");
        return send("POST /login",
                HttpRequest.newBuilder(URI.create(baseUrl + "/login"))
                        .timeout(Duration.ofSeconds(60))
                        .header("Accept", "text/html")
                        .header("Content-Type", "application/x-www-form-urlencoded")
                        .POST(HttpRequest.BodyPublishers.ofString(form))
                        .build());
    }

    private static String extractInputValue(String html, String name) {
        var pattern = Pattern.compile("<input[^>]*name=\"" + Pattern.quote(name) + "\"[^>]*>");
        var matcher = pattern.matcher(html);
        if (!matcher.find()) {
            return null;
        }
        var valueMatcher = Pattern.compile("value=\"([^\"]*)\"").matcher(matcher.group());
        return valueMatcher.find() ? valueMatcher.group(1) : null;
    }

    private static String extractPublicKey(String html) {
        var pattern = Pattern.compile("const publicKey\s*=\s*\"([^\"]+)\"");
        var matcher = pattern.matcher(html);
        if (!matcher.find()) {
            return null;
        }
        return matcher.group(1).replace("\\/", "/").replace("\\\\", "\\");
    }

    private static String encryptPassword(String publicKeyText, String password) {
        try {
            var publicKeyBytes = Base64.getDecoder().decode(publicKeyText);
            var keySpec = new X509EncodedKeySpec(publicKeyBytes);
            var publicKey = KeyFactory.getInstance("RSA").generatePublic(keySpec);
            var cipher = Cipher.getInstance("RSA/ECB/PKCS1Padding");
            cipher.init(Cipher.ENCRYPT_MODE, publicKey);
            var encrypted = cipher.doFinal(password.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(encrypted);
        } catch (Exception e) {
            return null;
        }
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
        return sendAnonymous("POST /system/setup", request("/system/setup", false)
                .POST(HttpRequest.BodyPublishers.ofString(form))
                .header("Content-Type", "application/x-www-form-urlencoded")
                .build());
    }

    public RichResponse health() {
        return sendAnonymous("GET /actuator/health",
                request("/actuator/health", false).GET().build());
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

    /** Creates a comment as an anonymous visitor (not auto-approved when review is required). */
    public RichResponse createAnonymousComment(String raw, String content, String group, String version,
            String kind, String subjectName) {
        var body = json.createObjectNode();
        body.putObject("subjectRef")
                .put("group", group)
                .put("version", version)
                .put("kind", kind)
                .put("name", subjectName);
        body.put("raw", raw);
        body.put("content", content);
        body.put("allowNotification", false);
        body.put("hidden", false);
        return sendAnonymous("POST anonymous public comment",
                request(PUBLIC_COMMENTS, false)
                        .POST(HttpRequest.BodyPublishers.ofString(body.toString()))
                        .header("Content-Type", "application/json")
                        .build());
    }

    /**
     * Creates a regular (non-admin) user and returns a client authenticating as that user. Replies
     * cannot be anonymous, and a regular user must not get the auto-approval granted to comment
     * managers.
     */
    public HaloApiClient createRegularUserClient(String username, String password, String email) {
        var body = json.createObjectNode();
        body.put("name", username);
        body.put("email", email);
        body.put("displayName", username);
        body.put("password", password);
        var created = send("POST user " + username,
                jsonRequest("/apis/api.console.halo.run/v1alpha1/users", body)
                        .POST(HttpRequest.BodyPublishers.ofString(body.toString()))
                        .header("Content-Type", "application/json")
                        .build());
        if (created.status() != 200 && created.status() != 201) {
            throw new AssertionError("Cannot create regular user: " + created);
        }
        var http = java.net.http.HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
        return new HaloApiClient(baseUrl, http, username, password);
    }

    /**
     * Waits until a newly created comment reflects the expected review behaviour. The system
     * config is applied asynchronously by a reconciler, so the setting is not effective
     * immediately after the update.
     *
     * @param expectApproved expected spec.approved of a comment created right now
     */
    public boolean waitForCommentReviewMode(boolean expectApproved) {
        var deadline = System.nanoTime() + Duration.ofSeconds(60).toNanos();
        while (System.nanoTime() < deadline) {
            var probe = sendAnonymous("POST anonymous comment (review probe)",
                    request(PUBLIC_COMMENTS, false)
                            .POST(HttpRequest.BodyPublishers.ofString("{\"subjectRef\":{\"group\":\"content.halo.run\","
                                    + "\"version\":\"v1alpha1\",\"kind\":\"Post\",\"name\":\"e2e-review-probe\"},"
                                    + "\"raw\":\"probe\",\"content\":\"<p>probe</p>\","
                                    + "\"allowNotification\":false,\"hidden\":false}"))
                            .header("Content-Type", "application/json")
                            .build());
            if (probe.status() == 200) {
                var approved = parse(probe).path("spec").path("approved").asBoolean(!expectApproved);
                if (approved == expectApproved) {
                    return true;
                }
            }
            try {
                Thread.sleep(500);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return false;
            }
        }
        return false;
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
        return listPublicComments(group, version, subjectKind, subjectName, keyword, true);
    }

    /** Lists public comments; {@code authenticated=false} sends an anonymous (visitor) request. */
    public RichResponse listPublicComments(String group, String version, String subjectKind,
            String subjectName, String keyword, boolean authenticated) {
        var query = new StringBuilder(PUBLIC_COMMENTS)
                .append("?kind=").append(encode(subjectKind))
                .append("&name=").append(encode(subjectName))
                .append("&version=").append(encode(version))
                .append("&group=").append(encode(group))
                .append("&page=1&size=100");
        if (keyword != null && !keyword.isBlank()) {
            query.append("&keyword=").append(encode(keyword));
        }
        if (authenticated) {
            return send("GET public comments" + (keyword != null && !keyword.isBlank() ? " keyword=" + keyword : ""),
                    request(query.toString(), true).GET().build());
        }
        return sendAnonymous("GET public comments anonymous" + (keyword != null && !keyword.isBlank() ? " keyword=" + keyword : ""),
                request(query.toString(), false).GET().build());
    }

    /**
     * Lists replies for a comment from the public theme API.
     *
     * @param commentName metadata.name of the parent comment
     * @param keyword     optional keyword; pass null or blank to skip
     */
    public RichResponse listPublicReplies(String commentName, String keyword) {
        return listPublicReplies(commentName, keyword, true);
    }

    /** Lists public replies; {@code authenticated=false} sends an anonymous (visitor) request. */
    public RichResponse listPublicReplies(String commentName, String keyword, boolean authenticated) {
        var query = new StringBuilder(PUBLIC_COMMENTS)
                .append("/").append(encode(commentName))
                .append("/reply?page=1&size=100");
        if (keyword != null && !keyword.isBlank()) {
            query.append("&keyword=").append(encode(keyword));
        }
        if (authenticated) {
            return send("GET public replies" + (keyword != null && !keyword.isBlank() ? " keyword=" + keyword : ""),
                    request(query.toString(), true).GET().build());
        }
        return sendAnonymous("GET public replies anonymous" + (keyword != null && !keyword.isBlank() ? " keyword=" + keyword : ""),
                request(query.toString(), false).GET().build());
    }

    /**
     * Switches the public "require review for new comments" system setting through the console
     * system-config endpoint (the same one the console settings UI uses).
     */
    public RichResponse setCommentRequireReview(boolean required) {
        var body = json.createObjectNode();
        body.put("enable", true);
        body.put("systemUserOnly", false);
        body.put("requireReviewForNew", required);
        return send("PUT comment system config requireReviewForNew=" + required,
                jsonRequest(COMMENT_SETTING, body)
                        .PUT(HttpRequest.BodyPublishers.ofString(body.toString()))
                        .header("Content-Type", "application/json")
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
                        .encodeToString((username + ":" + password).getBytes(StandardCharsets.UTF_8));
    }

    private RichResponse sendAnonymous(String label, HttpRequest request) {
        try {
            var response = anonymousHttp.send(request, HttpResponse.BodyHandlers.ofString());
            return new RichResponse(label, request, response);
        } catch (IOException e) {
            throw new AssertionError(
                    "Request failed at step [" + label + "]: " + E2EConfig.sanitize(e.getMessage()), e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new AssertionError("Interrupted at step [" + label + "]", e);
        }
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
