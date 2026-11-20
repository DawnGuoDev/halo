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

    /**
     * Starts an isolated instance; call from {@code @BeforeMethod}. When {@code e2e.base.url} is
     * set, the already deployed instance is used as-is instead (no lifecycle management, no
     * cleanup): reachability is checked, and an already initialized instance must accept the
     * configured {@code e2e.admin.username}/{@code e2e.admin.password}.
     */
    protected final void startInstance() {
        if (!E2EConfig.BASE_URL.isBlank()) {
            api = HaloApiClient.forBaseUrl(E2EConfig.BASE_URL);
            var health = api.health();
            if (health.status() != 200) {
                throw blocked("remote instance " + E2EConfig.BASE_URL + " is not ready: " + health.label()
                        + " -> " + health.status(), null);
            }
            Allure.addAttachment("instance", "text/plain",
                    "baseUrl=" + E2EConfig.BASE_URL + "\nmode=remote (e2e.base.url, not managed by the suite)"
                            + "\nadmin=" + E2EConfig.ADMIN_USERNAME);
            // A remote instance is normally already initialized, so the suite cannot create its
            // account. Fail with an explicit BLOCKED instead of a puzzling assertion later.
            var setup = api.setupSystem();
            if (setup.status() == 302) {
                var me = api.currentUser();
                if (me.status() != 200) {
                    throw blocked("remote instance " + E2EConfig.BASE_URL
                            + " is already initialized and account [" + E2EConfig.ADMIN_USERNAME
                            + "] cannot authenticate (GET current user -> " + me.status()
                            + "). Provide -De2e.admin.username/-De2e.admin.password of an existing"
                            + " admin, or target a fresh instance.", null);
                }
            }
            return;
        }
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
