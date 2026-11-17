package run.halo.e2e.support;

import java.nio.file.Path;
import java.util.regex.Pattern;

/**
 * Static E2E configuration shared by the backend and frontend suites.
 *
 * <p>Every value can be overridden with a JVM system property ({@code -De2e.xxx=...}) or an
 * environment variable derived from it ({@code e2e.xxx} -&gt; {@code E2E_XXX}). Defaults point to a
 * throw-away instance: random port, H2 in-memory database and a temporary work directory under
 * {@code e2e/build/e2e-tmp}.
 */
public final class E2EConfig {

    /** Temporary instance administrator. Not a real credential; never attached to reports. */
    public static final String ADMIN_USERNAME = "e2e-admin";

    public static final String ADMIN_PASSWORD = "e2e-Admin.1234";

    public static final String ADMIN_EMAIL = "e2e-admin@example.test";

    public static final String SITE_TITLE = "Halo E2E Site";

    /** Locale used for console assertions driven by visible text. */
    public static final String LANGUAGE = get("e2e.lang", "zh-CN");

    /** Upper bound for instance readiness. */
    public static final int READY_TIMEOUT_SECONDS = Integer.parseInt(get("e2e.ready.timeout.seconds", "180"));

    /** Upper bound for asynchronous publish convergence. */
    public static final int PUBLISH_TIMEOUT_SECONDS = Integer.parseInt(get("e2e.publish.timeout.seconds", "90"));

    public static final Path TEMP_DIR =
            Path.of(get("e2e.temp.dir", "build/e2e-tmp")).toAbsolutePath();

    public static final Path SCREENSHOT_DIR = Path.of(get("e2e.frontend.screenshot.dir", "build/e2e-screenshots"))
            .toAbsolutePath();

    /** Optional path of an already installed Chromium, used instead of Playwright's own download. */
    public static final String CHROMIUM_EXECUTABLE_PATH = get("e2e.chromium.executable", "");

    public static final boolean HEADED = Boolean.parseBoolean(get("e2e.headed", "false"));

    /** Slow-motion in milliseconds, meant for local headed debugging only. */
    public static final double SLOW_MO = Double.parseDouble(get("e2e.slowmo", "0"));

    private static final Pattern SENSITIVE = Pattern.compile(
            "(?i)(authorization\\s*[:=]\\s*\\S+|password\\s*[\"']?\\s*[:=]\\s*[\"']?[^,\\s\"'}]+)");

    /** Masks secrets before they are written to logs or Allure attachments. */
    public static String sanitize(String text) {
        if (text == null) {
            return "";
        }
        return SENSITIVE.matcher(text).replaceAll("$1<redacted>");
    }

    static String get(String key, String fallback) {
        var fromProperty = System.getProperty(key);
        if (fromProperty != null && !fromProperty.isBlank()) {
            return fromProperty;
        }
        var envKey = key.toUpperCase().replace('.', '_');
        var fromEnv = System.getenv(envKey);
        if (fromEnv != null && !fromEnv.isBlank()) {
            return fromEnv;
        }
        return fallback;
    }

    private E2EConfig() {}
}
