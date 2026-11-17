package run.halo.e2e.core;

import io.qameta.allure.Allure;
import org.testng.IExecutionListener;
import org.testng.ISuite;
import org.testng.ISuiteListener;

/** Releases the shared Halo instance after all tests of a suite, whichever listener order is used. */
public class SuiteLifecycleListener implements IExecutionListener, ISuiteListener {

    @Override
    public void onExecutionStart() {
        Allure.addAttachment(
                "E2E suite",
                "text/plain",
                "baseUrl=" + (E2eConfig.baseUri() == null ? "<temporary instance>" : E2eConfig.baseUri())
                        + System.lineSeparator()
                        + "stack=TestNG + Playwright Java (Chromium) + Allure"
                        + System.lineSeparator()
                        + "scope=" + E2eConfig.scopeToken());
    }

    @Override
    public void onExecutionFinish() {
        E2eEnvironment.shutdown();
    }

    @Override
    public void onStart(ISuite suite) {
        try {
            E2eEnvironment.get();
        } catch (HaloInstance.E2eBlockedException ex) {
            // Record BLOCKED once for the whole suite; every test will also skip with [BLOCKED].
            Allure.addAttachment("BLOCKED startup log", "text/plain", ex.getMessage());
        }
    }

    @Override
    public void onFinish(ISuite suite) {
        if (suite.getResults().values().stream().anyMatch(result -> result.getTestContext().getFailedTests().size() > 0
                || result.getTestContext().getFailedConfigurations().size() > 0)) {
            E2eEnvironment.markEnvironmentFailed();
        }
        E2eEnvironment.shutdown();
    }
}
