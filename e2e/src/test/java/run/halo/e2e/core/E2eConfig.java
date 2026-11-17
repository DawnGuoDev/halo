package run.halo.e2e.core;

import java.net.URI;
import java.util.concurrent.ThreadLocalRandom;

/** Environment configuration shared by backend and frontend E2E suites. */
public final class E2eConfig {

    private static final String E2E_USERNAME = "e2e-admin";
    private static final String E2E_PASSWORD = "E2ePassw0rd!";

    private E2eConfig() {}

    /** Reuse an already running instance when {@code -De2e.base-url} is set. */
    public static URI baseUri() {
        String value = System.getProperty("e2e.base-url", "").trim();
        if (value.isEmpty()) {
            return null;
        }
        return URI.create(value.endsWith("/") ? value.substring(0, value.length() - 1) : value);
    }

    public static String username() {
        return E2E_USERNAME;
    }

    public static String password() {
        return E2E_PASSWORD;
    }

    public static String email() {
        return "e2e@example.test";
    }

    public static String siteTitle() {
        return "Halo E2E";
    }

    public static boolean headed() {
        return Boolean.parseBoolean(System.getProperty("e2e.headed", "false"));
    }

    public static String workDir() {
        return System.getProperty("e2e.work-dir", "build/e2e-work");
    }

    /** Unique prefix per test run so titles/slugs never collide across repeated runs. */
    public static String scopeToken() {
        return "e2e-" + System.currentTimeMillis() + "-"
                + Long.toString(ThreadLocalRandom.current().nextLong(36L * 36L * 36L * 36L), 36);
    }
}
