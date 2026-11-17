package run.halo.e2e.support;

import io.qameta.allure.Allure;
import org.testng.SkipException;

/**
 * Base class handling the temporary instance lifecycle for a single test method.
 *
 * <ul>
 *   <li>Readiness failure is reported through {@link SkipException}, so the run is BLOCKED rather
 *       than a business FAIL. Startup logs are attached for diagnosis.
 *   <li>Cleanup failures (data or work dir) are surfaced as a failure: they are never ignored
 *       silently.
 * </ul>
 */
public abstract class AbstractE2ETest {

    protected HaloInstance instance;

    protected HaloApiClient api;

    /** Starts an isolated instance; call from {@code @BeforeMethod}. */
    protected final void startInstance() {
        instance = HaloInstance.create();
        try {
            instance.start();
        } catch (BackendReadinessException e) {
            Allure.addAttachment("instance-startup-log", "text/plain", instance.lastLogLines(200));
            instance.stop();
            throw new SkipException("BLOCKED: temporary Halo instance is not ready. " + e.getMessage(), e);
        }
        api = HaloApiClient.basic(instance);
        Allure.addAttachment(
                "instance", "text/plain", "baseUrl=" + instance.baseUrl() + "\nworkDir=" + instance.workDir());
    }

    /** Stops the instance and removes its work dir; call from {@code @AfterMethod(alwaysRun = true)}. */
    protected final void stopInstance() {
        if (instance == null) {
            return;
        }
        instance.stop();
        var problem = instance.cleanUpWorkDir();
        if (problem != null) {
            throw new AssertionError("BLOCKED cleanup: " + problem);
        }
    }

    /** Skips with an explicit BLOCKED reason instead of producing a confusing business failure. */
    protected static SkipException blocked(String reason, Throwable cause) {
        return new SkipException("BLOCKED: " + reason, cause);
    }
}
