package run.halo.e2e.support;

import com.fasterxml.jackson.databind.JsonNode;
import io.qameta.allure.Step;
import java.util.List;
import java.util.Optional;

/** Assertion helpers that always attach the actual HTTP exchange before failing. */
public final class Assertions {

    /** Asserts the status code and attaches the request/response summary to the current step. */
    @Step("断言 HTTP 状态码为 {expected}：{response.label}")
    public static HaloApiClient.RichResponse assertStatus(
            HaloApiClient.RichResponse response, int expected) {
        attach(response);
        if (response.status() != expected) {
            throw new AssertionError("Step [%s] expected HTTP %d but got %d. Body: %s"
                    .formatted(
                            response.label(),
                            expected,
                            response.status(),
                            HaloApiClient.truncate(E2EConfig.sanitize(response.body()))));
        }
        return response;
    }

    @Step("断言状态码属于 {expected}")
    public static HaloApiClient.RichResponse assertStatusOneOf(
            HaloApiClient.RichResponse response, int... expected) {
        attach(response);
        for (int code : expected) {
            if (response.status() == code) {
                return response;
            }
        }
        throw new AssertionError("Step [%s] expected one of HTTP %s but got %d. Body: %s"
                .formatted(
                        response.label(),
                        java.util.Arrays.toString(expected),
                        response.status(),
                        HaloApiClient.truncate(E2EConfig.sanitize(response.body()))));
    }

    /**
     * Halo answers an unauthenticated request either with 401 (API style) or a 302 redirect to
     * /login; both mean "rejected", and neither may return a user payload.
     */
    @Step("断言请求被拒绝（401 或 302 → /login）：{response.label}")
    public static HaloApiClient.RichResponse assertRejected(HaloApiClient.RichResponse response) {
        attach(response);
        var redirectedToLogin = response.status() == 302
                && response.headers().firstValue("Location").orElse("").contains("/login");
        if (response.status() != 401 && !redirectedToLogin) {
            throw new AssertionError("Step [%s] expected HTTP 401 or 302 -> /login but got %d. Body: %s"
                    .formatted(
                            response.label(),
                            response.status(),
                            HaloApiClient.truncate(E2EConfig.sanitize(response.body()))));
        }
        if (!response.body().isBlank() && response.body().contains("\"user\"")) {
            throw new AssertionError("Rejected request [%s] returned a user payload".formatted(response.label()));
        }
        return response;
    }

    @Step("断言 JSON 字段 {path} 等于期望值")
    public static void assertField(JsonNode json, String path, String expected) {
        var actual = text(json, path);
        if (!expected.equals(actual)) {
            throw new AssertionError("Field [%s] expected [%s] but got [%s]. JSON: %s"
                    .formatted(path, expected, actual, HaloApiClient.truncate(json.toString())));
        }
    }

    @Step("断言 JSON 字段 {path} 非空")
    public static String requireText(JsonNode json, String path) {
        var actual = text(json, path);
        if (actual == null || actual.isBlank()) {
            throw new AssertionError(
                    "Field [%s] is missing or blank. JSON: %s".formatted(path, HaloApiClient.truncate(json.toString())));
        }
        return actual;
    }

    @Step("断言文章 {name} 存在于列表查询结果中")
    public static void assertListContains(JsonNode listResult, String name) {
        var items = listResult.path("items");
        var found = false;
        for (JsonNode item : items) {
            if (name.equals(item.path("metadata").path("name").asText())) {
                found = true;
                break;
            }
        }
        if (!found) {
            throw new AssertionError("Post [%s] not found in list response: %s"
                    .formatted(name, HaloApiClient.truncate(listResult.toString())));
        }
    }

    @Step("断言文章 {name} 不存在于列表查询结果中")
    public static void assertListNotContains(JsonNode listResult, String name) {
        var items = listResult.path("items");
        for (JsonNode item : items) {
            if (name.equals(item.path("metadata").path("name").asText())) {
                throw new AssertionError("Post [%s] is still present in list response: %s"
                        .formatted(name, HaloApiClient.truncate(listResult.toString())));
            }
        }
    }

    /** Published is judged by {@code spec.publish=true} and a non-blank release snapshot. */
    @Step("断言文章已发布")
    public static void assertPublished(JsonNode post) {
        var publish = post.path("spec").path("publish").asBoolean(false);
        var releaseSnapshot = post.path("spec").path("releaseSnapshot").asText("");
        if (!publish || releaseSnapshot.isBlank()) {
            throw new AssertionError("Post is not published (spec.publish=%s, spec.releaseSnapshot=%s): %s"
                    .formatted(publish, releaseSnapshot, HaloApiClient.truncate(post.toString())));
        }
    }

    public static void equalsStatus(HaloApiClient.RichResponse response, int expected, String step) {
        attach(response);
        if (response.status() != expected) {
            throw new AssertionError("Step [%s] expected HTTP %d but got %d. Body: %s"
                    .formatted(step, expected, response.status(), HaloApiClient.truncate(E2EConfig.sanitize(response.body()))));
        }
    }

    public static String text(JsonNode json, String path) {
        var node = Optional.ofNullable(json).map(n -> n.at("/" + path.replace('.', '/'))).orElse(null);
        return node == null || node.isMissingNode() || node.isNull() ? null : node.asText();
    }

    public static List<String> locations(HaloApiClient.RichResponse response) {
        return response.location();
    }

    private static void attach(HaloApiClient.RichResponse response) {
        response.attachment();
    }

    private Assertions() {}
}
