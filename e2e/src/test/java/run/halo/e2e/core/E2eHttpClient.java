package run.halo.e2e.core;

import static java.nio.charset.StandardCharsets.UTF_8;

import io.qameta.allure.Attachment;
import io.qameta.allure.Step;
import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * Minimal HTTP client used by backend E2E tests. Every call attaches a redacted
 * request/response summary to the current Allure step to make failures locatable.
 */
public class E2eHttpClient {

    private static final Pattern AUTHORIZATION = Pattern.compile("(?i)(authorization:\\s*)\\S+");
    private static final Pattern PASSWORD_FIELD =
            Pattern.compile("(\"(?:password|plainPassword)\"\\s*:\\s*)\"[^\"]*\"");

    private final URI baseUri;
    private final HttpClient client;
    private final String basicAuthHeader;

    public E2eHttpClient(URI baseUri, String username, String password) {
        this.baseUri = baseUri;
        this.client = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .followRedirects(HttpClient.Redirect.NEVER)
                .build();
        String credentials = Base64.getEncoder().encodeToString((username + ":" + password).getBytes(UTF_8));
        this.basicAuthHeader = "Basic " + credentials;
    }

    /** GET without credentials and JSON accept. */
    public Response get(String path) {
        return get(path, false);
    }

    @Step("GET {path} (authenticated={authenticated})")
    public Response get(String path, boolean authenticated) {
        return send(requestBuilder(path, authenticated).GET(), "application/json");
    }

    @Step("GET {path} (authenticated={authenticated}, accept={accept})")
    public Response get(String path, boolean authenticated, String accept) {
        return send(requestBuilder(path, authenticated).header("Accept", accept).GET(), accept);
    }

    /** Unfollowed variant used to assert redirect semantics (Location header). */
    @Step("GET {path} without following redirects")
    public Response getWithoutFollowingRedirects(String path, boolean authenticated) {
        HttpClient noFollow = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .followRedirects(HttpClient.Redirect.NEVER)
                .build();
        HttpRequest request = requestBuilder(path, authenticated).GET().build();
        try {
            HttpResponse<String> response = noFollow.send(request, HttpResponse.BodyHandlers.ofString(UTF_8));
            Response result = new Response(response.statusCode(), response.headers().map(), response.body(), "");
            attachExchange("GET " + request.uri() + " -> " + result.status()
                    + "\nLocation: " + result.header("Location")
                    + "\n\nResponse body:\n" + truncate(redact(result.body())));
            return result;
        } catch (IOException ex) {
            throw new IllegalStateException("Request failed: GET " + request.uri(), ex);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Request interrupted: GET " + request.uri(), ex);
        }
    }

    @Step("POST {path} (form)")
    public Response postForm(String path, Map<String, String> form) {
        Map<String, String> safe = new LinkedHashMap<>();
        form.forEach((key, value) -> safe.put(key, key.toLowerCase(java.util.Locale.ROOT).contains("password") ? "<redacted>" : value));
        String body = form.entrySet().stream()
                .map(entry -> encode(entry.getKey()) + "=" + encode(entry.getValue()))
                .reduce((left, right) -> left + "&" + right)
                .orElse("");
        return send(
                requestBuilder(path, false)
                        .header("Content-Type", "application/x-www-form-urlencoded")
                        .POST(HttpRequest.BodyPublishers.ofString(body, UTF_8)),
                "application/x-www-form-urlencoded (form=" + safe + ")");
    }

    @Step("POST {path} (authenticated={authenticated}, contentType={contentType})")
    public Response post(String path, boolean authenticated, String contentType, String body) {
        HttpRequest.Builder builder = requestBuilder(path, authenticated);
        if (contentType != null) {
            builder.header("Content-Type", contentType);
        }
        return send(builder.POST(HttpRequest.BodyPublishers.ofString(body == null ? "" : body, UTF_8)), contentType);
    }

    @Step("PUT {path} (authenticated={authenticated}, contentType={contentType})")
    public Response put(String path, boolean authenticated, String contentType, String body) {
        HttpRequest.Builder builder = requestBuilder(path, authenticated);
        if (contentType != null) {
            builder.header("Content-Type", contentType);
        }
        return send(builder.PUT(HttpRequest.BodyPublishers.ofString(body == null ? "" : body, UTF_8)), contentType);
    }

    @Step("DELETE {path} (authenticated={authenticated})")
    public Response delete(String path, boolean authenticated) {
        return send(requestBuilder(path, authenticated).DELETE(), "application/json");
    }

    /** Form login used to obtain a cookie outside the browser (cleanup helper). */
    @Step("POST /login (form, save session cookie)")
    public Response formLogin(String username, String password) {
        String form = "username=" + encode(username) + "&plainPassword=" + encode(password);
        Response response = send(
                requestBuilder("/login", false)
                    .header("Content-Type", "application/x-www-form-urlencoded")
                        .POST(HttpRequest.BodyPublishers.ofString(form, UTF_8)),
                "application/x-www-form-urlencoded");
        String session = response.setCookies().stream()
                .map(item -> item.split(";", 2)[0])
                .reduce((left, right) -> left + "; " + right)
                .orElse("");
        return new Response(response.status(), response.headers(), response.body(), session);
    }

    private HttpRequest.Builder requestBuilder(String path, boolean authenticated) {
        String url = path.startsWith("http") ? path : baseUri.toString() + (path.startsWith("/") ? path : "/" + path);
        HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create(url))
                .timeout(Duration.ofSeconds(60))
                .header("Accept", "application/json");
        if (authenticated) {
            builder.header("Authorization", basicAuthHeader);
        }
        return builder;
    }

    private Response send(HttpRequest.Builder builder, String contentType) {
        HttpRequest request = builder.build();
        boolean authenticated = request.headers().firstValue("Authorization").isPresent();
        HttpResponse<String> response;
        try {
            response = client.send(request, HttpResponse.BodyHandlers.ofString(UTF_8));
        } catch (IOException ex) {
            throw new IllegalStateException("Request failed: " + request.method() + " " + request.uri(), ex);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Request interrupted: " + request.method() + " " + request.uri(), ex);
        }
        Response result = new Response(response.statusCode(), response.headers().map(), response.body(), "");
        attachExchange(request.method() + " " + request.uri()
                + " -> " + result.status()
                + "\nRequest-Content-Type: " + (contentType == null ? "-" : contentType)
                + "\nAuthenticated: " + authenticated
                + "\n\nResponse headers: " + result.headerSummary()
                + "\n\nResponse body:\n" + truncate(redact(result.body())));
        return result;
    }

    @Attachment(value = "HTTP exchange summary", type = "text/plain", fileExtension = "txt")
    private String attachExchange(String summary) {
        return summary;
    }

    /** Removes credentials and password-like fields from any text before it reaches logs or reports. */
    public static String redact(String text) {
        if (text == null) {
            return "";
        }
        String redacted = AUTHORIZATION.matcher(text).replaceAll("$1<redacted>");
        return PASSWORD_FIELD.matcher(redacted).replaceAll("$1\"<redacted>\"");
    }

    private static String truncate(String value) {
        return value.length() <= 4000 ? value : value.substring(0, 4000) + "\n...<truncated>";
    }

    private static String encode(String value) {
        return URLEncoder.encode(value, UTF_8);
    }

    /** Immutable response snapshot. */
    public record Response(int status, Map<String, List<String>> headers, String body, String cookie) {

        public String header(String name) {
            return headers.entrySet().stream()
                    .filter(entry -> entry.getKey().equalsIgnoreCase(name))
                    .flatMap(entry -> entry.getValue().stream())
                    .findFirst()
                    .orElse("");
        }

        public String headerSummary() {
            Map<String, String> safe = new LinkedHashMap<>();
            headers.forEach((key, values) -> safe.put(key, key.equalsIgnoreCase("set-cookie")
                    ? "<redacted>"
                    : String.join(", ", values)));
            return safe.toString();
        }

        public List<String> setCookies() {
            return headers.entrySet().stream()
                    .filter(entry -> entry.getKey().equalsIgnoreCase("set-cookie"))
                    .flatMap(entry -> entry.getValue().stream())
                    .toList();
        }

        /** Credential-free summary for assertions and reports. */
        public String safeBody() {
            return redact(body);
        }
    }
}
