package run.halo.e2e.core;

import io.qameta.allure.Allure;
import io.qameta.allure.model.Status;
import io.qameta.allure.model.StatusDetails;
import org.testng.ITestListener;
import org.testng.ITestResult;
import org.testng.SkipException;

/**
 * Guarantees the shared instance is up before every test. A startup failure is
 * converted to {@link SkipException} so Allure shows SKIPPED with a "[BLOCKED]"
 * message instead of a misleading business FAIL.
 */
public class E2eEnvironmentListener implements ITestListener {

    @Override
    public void onTestStart(ITestResult result) {
        try {
            E2eEnvironment.get();
        } catch (HaloInstance.E2eBlockedException ex) {
            // Environment failure is recorded via E2eEnvironment.get() -> blocked marker.
            Allure.addAttachment("BLOCKED startup log", "text/plain", ex.getMessage());
            throw new SkipException("[BLOCKED] " + ex.getMessage(), ex);
        }
    }

    @Override
    public void onTestFailure(ITestResult result) {
        E2eEnvironment current = E2eEnvironment.peek();
        if (current != null) {
            current.startupLogTail();
        }
    }

    @Override
    public void onTestSkipped(ITestResult result) {
        if (result.getThrowable() instanceof SkipException) {
            Allure.getLifecycle()
                    .updateTestCase(testResult -> testResult
                            .setStatus(Status.SKIPPED)
                            .setStatusDetails(new StatusDetails().setMessage(result.getThrowable().getMessage())));
        }
    }

    @Override
    public void onTestSuccess(ITestResult result) {
        // nothing to do
    }

    @Override
    public void onTestFailedButWithinSuccessPercentage(ITestResult result) {
        // Retried tests still count as executed; nothing to do.
    }
}
