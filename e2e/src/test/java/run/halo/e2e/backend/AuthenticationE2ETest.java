package run.halo.e2e.backend;

import io.qameta.allure.Description;
import io.qameta.allure.Epic;
import io.qameta.allure.Feature;
import io.qameta.allure.Severity;
import io.qameta.allure.SeverityLevel;
import io.qameta.allure.Story;
import org.testng.Assert;
import org.testng.annotations.AfterMethod;
import org.testng.annotations.BeforeMethod;
import org.testng.annotations.Test;
import run.halo.e2e.support.AbstractE2ETest;
import run.halo.e2e.support.Assertions;
import run.halo.e2e.support.E2EConfig;

/** TC-BE-002: unauthenticated and wrong-password access to protected APIs. */
@Epic("E2E 测试基线")
@Feature("后端 E2E：认证失败路径")
public class AuthenticationE2ETest extends AbstractE2ETest {

    @BeforeMethod(alwaysRun = true)
    public void setUp() {
        startInstance();
    }

    @AfterMethod(alwaysRun = true)
    public void tearDown() {
        stopInstance();
    }

    @Test(description = "TC-BE-002 未认证访问 /apis/** 返回 401；错误密码认证失败")
    @Story("TC-BE-002")
    @Severity(SeverityLevel.CRITICAL)
    @Description("""
            1. 未携带凭据 GET /apis/uc.api.halo.run/v1alpha1/users/- → 401
            2. 携带错误密码 → 401，响应不包含用户资源
            3. 携带初始化账号 → 200，作为对照确认失败原因是密码而非端点不可用
            """)
    public void shouldRejectUnauthenticatedAndWrongPasswordRequests() {
        Assertions.assertStatus(api.setupSystem(), 204);

        Assertions.assertStatus(api.unauthenticatedUser(), 401);
        Assertions.assertStatus(api.wrongPasswordUser(), 401);

        var me = Assertions.assertStatus(api.currentUser(), 200);
        Assert.assertEquals(
                Assertions.requireText(api.parse(me), "metadata.name"),
                E2EConfig.ADMIN_USERNAME,
                "Control check with the correct password must return the administrator");
    }
}
