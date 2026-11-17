package run.halo.e2e.core;

import io.qameta.allure.Allure;
import io.qameta.allure.Attachment;
import io.qameta.allure.Step;
import java.io.IOException;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;

/**
 * Lifecycle of the instance shared by every test of one suite. Holding a single
 * instance keeps the suites serial and avoids port/memory races.
 */
public final class E2eEnvironment {

    private static E2eEnvironment shared;
    private static HaloInstance.E2eBlockedException blocked;
    private static boolean environmentFailed;

    private final HaloInstance instance;
    private final HaloApi api;
    private final URI baseUri;
    private final String workDir;
    private final String logFile;
    private final E2eHttpClient http;

    private E2eEnvironment(HaloInstance instance) {
        this.instance = instance;
        this.baseUri = instance.baseUri();
        this.workDir = String.valueOf(instance.describe().get("workDir"));
        this.logFile = String.valueOf(instance.describe().get("logFile"));
        this.http = new E2eHttpClient(baseUri, E2eConfig.username(), E2eConfig.password());
        this.api = new HaloApi(http, E2eConfig.username(), E2eConfig.password());
    }

    /** Starts the instance once per suite; a startup problem is surfaced as BLOCKED by the listener. */
    public static synchronized E2eEnvironment get() {
        if (blocked != null) {
            throw blocked;
        }
        if (shared == null) {
            try {
                shared = new E2eEnvironment(HaloInstance.start());
            } catch (HaloInstance.E2eBlockedException ex) {
                blocked = ex;
                environmentFailed = true;
                throw ex;
            }
        }
        return shared;
    }

    /** Accessor that never starts an instance (safe for cleanup and reporting). */
    public static synchronized E2eEnvironment peek() {
        return shared;
    }

    /** Records that the environment (not a business assertion) failed, so the work dir is preserved. */
    public static synchronized void markEnvironmentFailed() {
        environmentFailed = true;
    }

    public static synchronized boolean environmentFailed() {
        return environmentFailed;
    }

    public URI baseUri() {
        return baseUri;
    }

    public HaloApi api() {
        return api;
    }

    public E2eHttpClient http() {
        return http;
    }

    @Step("Initialize the temporary Halo instance")
    public void initialize() {
        api.setupIfRequired();
        Allure.getLifecycle()
                .updateTestCase(testResult -> testResult.setDescription("Halo instance: " + baseUri
                        + System.lineSeparator() + "workDir: " + workDir
                        + System.lineSeparator() + "logFile: " + logFile));
    }

    @Attachment(value = "Halo startup log (tail)", type = "text/plain", fileExtension = "log")
    public String startupLogTail() {
        if (instance.logFile() == null) {
            return "<external instance, no local startup log>";
        }
        Path path = instance.logFile();
        try {
            String content = Files.readString(path, StandardCharsets.UTF_8);
            return content.length() > 20000 ? content.substring(content.length() - 20000) : content;
        } catch (IOException ex) {
            return "<cannot read " + path + ": " + ex + ">";
        }
    }

    /** Shuts down the owned instance; the work dir is kept only when something failed. */
    public static synchronized void shutdown() {
        if (shared == null) {
            return;
        }
        boolean keepWorkDir = environmentFailed || "true".equals(System.getProperty("e2e.keep-work-dir"));
        if (keepWorkDir && shared.instance.workDir() != null) {
            Allure.addAttachment("Preserved work dir", "text/plain", shared.instance.workDir().toString());
        }
        shared.instance.stop(!keepWorkDir);
        shared = null;
        blocked = null;
        environmentFailed = false;
    }

    public Map<String, Object> describeInstance() {
        return instance.describe();
    }
}
