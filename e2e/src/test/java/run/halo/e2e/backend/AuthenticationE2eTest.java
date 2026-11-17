package run.halo.e2e.backend;

import static org.testng.Assert.assertEquals;
import static org.testng.Assert.assertTrue;

import io.qameta.allure.Epic;
import io.qameta.allure.Feature;
import io.qameta.allure.Severity;
import io.qameta.allure.SeverityLevel;
import io.qameta.allure.Story;
import org.testng.annotations.BeforeClass;
import org.testng.annotations.Listeners;
import org.testng.annotations.Test;
import run.halo.e2e.core.E2eConfig;
import run.halo.e2e.core.E2eEnvironment;
import run.halo.e2e.core.E2eEnvironmentListener;
import run.halo.e2e.core.E2eHttpClient;
import run.halo.e2e.core.HaloApi;

/** TC-BE-002: protected APIs reject anonymous requests and the login form rejects wrong passwords. */
@Epic("Halo E2E baseline")
@Feature("Backend HTTP chain")
@Story("TC-BE-002 authentication negative paths")
@Listeners(E2eEnvironmentListener.class)
public class AuthenticationE2eTest {

    private E2eEnvironment env;

    @BeforeClass(alwaysRun = true)
    public void setUp() {
        env = E2eEnvironment.get();
        env.initialize();
    }

    @Test(description = "Unauthenticated access to /apis/** returns 401")
    @Severity(SeverityLevel.BLOCKER)
    public void shouldRejectAnonymousApiAccess() {
        E2eHttpClient.Response response = env.http().getWithoutFollowingRedirects(HaloApi.POSTS_API, false);
        // Halo's DefaultServerAuthenticationEntryPoint redirects to /login and returns 302 for a
        // browser-style request. Treat 401 and that login redirect as the same "rejected" outcome.
        boolean rejected = response.status() == 401
                || (response.status() == 302 && response.header("Location").contains("/login"));
        assertTrue(rejected, "anonymous /apis request must be rejected, got " + response.status()
                + " -> " + response.header("Location"));
    }

    @Test(description = "Wrong password is rejected by the real login endpoint")
    @Severity(SeverityLevel.CRITICAL)
    public void shouldRejectWrongPassword() {
        E2eHttpClient.Response response =
                env.http().formLogin(E2eConfig.username(), "definitely-wrong-password");
        // Wrong credentials must never create an authenticated session.
        assertTrue(response.status() == 302 || response.status() == 403,
                "failed login should be rejected (302 error redirect or 403), got " + response.status());
        String location = response.header("Location");
        assertTrue(!response.setCookies().stream().anyMatch(cookie -> cookie.toUpperCase(java.util.Locale.ROOT).contains("SESSION")),
                "failed login must not set a session cookie");
        assertTrue(location == null || !location.contains("/console"),
                "failed login must not redirect to the console, got " + location);
    }
}
