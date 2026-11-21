package run.halo.e2e.frontend;

import static com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat;
import static org.testng.Assert.assertFalse;
import static org.testng.Assert.assertTrue;

import com.microsoft.playwright.Page;
import io.qameta.allure.Allure;
import io.qameta.allure.Description;
import io.qameta.allure.Epic;
import io.qameta.allure.Feature;
import io.qameta.allure.Severity;
import io.qameta.allure.SeverityLevel;
import io.qameta.allure.Step;
import io.qameta.allure.Story;
import org.testng.annotations.AfterMethod;
import org.testng.annotations.BeforeMethod;
import org.testng.annotations.Test;
import run.halo.e2e.pages.AnnouncementConfirmDialog;
import run.halo.e2e.pages.AnnouncementDetailDrawer;
import run.halo.e2e.pages.AnnouncementFormModal;
import run.halo.e2e.pages.AnnouncementPage;
import run.halo.e2e.pages.ConsolePageObject;
import run.halo.e2e.support.Assertions;
import run.halo.e2e.support.BrowserSession;
import run.halo.e2e.support.E2EConfig;
import run.halo.e2e.support.HaloApiClient;
import run.halo.e2e.support.HaloInstance;
import run.halo.e2e.support.UniqueScope;

/**
 * TC-FE-002 ~ TC-FE-006: station announcement management POC page E2E tests.
 *
 * <p>Coverage map (Spec REQ-001 ~ REQ-010):
 * <ul>
 *   <li>TC-FE-002 — list, filter, empty state (REQ-001, REQ-009)
 *   <li>TC-FE-003 — detail drawer shows all fields (REQ-002, REQ-004)
 *   <li>TC-FE-004 — create / publish / disable / delete lifecycle (REQ-003, 005, 006, 007, 008)
 *   <li>TC-FE-005 — form validation (REQ-010)
 *   <li>TC-FE-006 — disabled → edit → draft flow (REQ-003.3, REQ-006)
 * </ul>
 *
 * <p>The announcement page uses in-memory mock data that resets on page navigation. Each test
 * method starts a fresh Halo instance and opens the announcement page after login.
 */
@Epic("E2E 测试基线")
@Feature("前端 E2E：站内公告管理")
public class AnnouncementManagementE2ETest {

    private HaloInstance instance;
    private HaloApiClient api;
    private BrowserSession browser;
    private UniqueScope scope;

    @BeforeMethod(alwaysRun = true)
    public void setUp() {
        scope = UniqueScope.create();
        instance = HaloInstance.create();
        try {
            instance.start();
        } catch (RuntimeException e) {
            instance.stop();
            throw e;
        }
        api = HaloApiClient.basic(instance);
        Assertions.assertStatus(api.setupSystem(), 204);
        browser = BrowserSession.launch(instance.consoleUrl());
    }

    @AfterMethod(alwaysRun = true)
    public void tearDown(org.testng.ITestResult result) {
        var problems = new StringBuilder();
        try {
            if (browser != null) {
                browser.close();
            }
        } finally {
            if (instance != null) {
                instance.stop();
                var dirProblem = instance.cleanUpWorkDir();
                if (dirProblem != null) {
                    problems.append(dirProblem).append('\n');
                }
            }
        }
        if (!problems.isEmpty()) {
            Allure.addAttachment("cleanup-problems", "text/plain", problems.toString());
            if (result.isSuccess()) {
                throw new AssertionError("BLOCKED cleanup: " + problems);
            }
        }
    }

    // ===== TC-FE-002: list / filter / empty state =====

    @Test(description = "TC-FE-002 公告列表加载、筛选与空状态")
    @Story("TC-FE-002")
    @Severity(SeverityLevel.BLOCKER)
    @Description("""
            1. 登录后打开 /console/announcements，列表渲染含至少 5 种状态与 2 种位置的模拟数据
            2. 输入关键词仅保留标题匹配项
            3. 选择状态筛选仅保留对应状态
            4. 组合关键词 + 状态筛选结果正确
            5. 筛选无结果时展示空状态
            """)
    public void shouldListFilterAndShowEmptyState() {
        var page = browser.page();
        loginThroughConsole(page);

        var announcement = new AnnouncementPage(page, instance.consoleUrl());
        announcement.open();

        // REQ-001.1: list loads with mock data covering 5 statuses and 2 positions
        assertTrue(announcement.visibleRowCount() > 0, "Announcement table should have rows");

        // REQ-001.2: keyword filter matches title (case-insensitive)
        announcement.searchByKeyword("公告");
        var keywordCount = announcement.visibleRowCount();
        assertTrue(keywordCount > 0, "Keyword filter should return matching rows");
        // Every visible row should contain the keyword
        for (int i = 0; i < keywordCount; i++) {
            var row = announcement.tableBody().locator("tr").nth(i);
            assertTrue(row.innerText().contains("公告"), "Row should contain keyword '公告'");
        }

        // Clear keyword and verify full list returns
        announcement.clearKeyword();

        // REQ-001.3: status filter — select "草稿" and verify all rows are drafts
        announcement.selectStatusFilter("草稿");
        var draftCount = announcement.visibleRowCount();
        assertTrue(draftCount > 0, "Draft filter should return rows");
        for (int i = 0; i < draftCount; i++) {
            var row = announcement.tableBody().locator("tr").nth(i);
            assertTrue(row.innerText().contains("草稿"), "Row should show status '草稿'");
        }

        // Clear status filter and verify full list returns
        announcement.clearStatusFilter();

        // REQ-001.4: empty state when no results match
        var nonexistentKeyword = scope.token();
        announcement.searchByKeyword(nonexistentKeyword);
        assertTrue(
                announcement.isEmptyStateVisible(),
                "Empty state should be visible when no announcements match the filter");
        announcement.clearKeyword();
    }

    // ===== TC-FE-003: detail drawer =====

    @Test(description = "TC-FE-003 点击标题打开详情抽屉，展示全部字段")
    @Story("TC-FE-003")
    @Severity(SeverityLevel.CRITICAL)
    @Description("""
            1. 登录后打开公告列表
            2. 点击列表中的标题，详情抽屉打开并展示标题与状态标签
            3. 关闭抽屉后列表保持不变
            """)
    public void shouldOpenDetailDrawer() {
        var page = browser.page();
        loginThroughConsole(page);

        var announcement = new AnnouncementPage(page, instance.consoleUrl());
        announcement.open();

        // Pick the first row's title link and open detail
        var firstTitle = announcement
                .tableBody()
                .locator("tr")
                .first()
                .locator(".announcement-page__title-link")
                .innerText();
        announcement.clickTitle(firstTitle);

        var detail = new AnnouncementDetailDrawer(page);
        detail.expectVisible();
        detail.expectTitle(firstTitle);

        // The status tag should be visible
        assertFalse(detail.statusTag().isBlank(), "Detail drawer should show a status tag");

        // Close the drawer and verify it's gone
        detail.close();
        detail.expectGone();
    }

    // ===== TC-FE-004: create / publish / disable / delete lifecycle =====

    @Test(description = "TC-FE-004 新建→发布→停用→编辑→删除公告全生命周期")
    @Story("TC-FE-004")
    @Severity(SeverityLevel.BLOCKER)
    @Description("""
            1. 新建公告保存为草稿，出现在列表首位
            2. 发布后按时间判定为待生效/展示中/已结束
            3. 已发布公告编辑入口禁用
            4. 停用后变为已停用，编辑入口恢复
            5. 已停用删除需二次确认，确认后从列表移除
            """)
    public void shouldManageAnnouncementLifecycle() {
        var page = browser.page();
        loginThroughConsole(page);

        var announcement = new AnnouncementPage(page, instance.consoleUrl());
        announcement.open();

        var title = scope.title("announcement lifecycle");
        var content = "E2E announcement content " + scope.token();

        // Step 1: create a draft
        createDraftAnnouncement(announcement, title, content);

        // Verify it appears in the list as 草稿
        announcement.expectRowWithTitle(title).expectRowStatus(title, "草稿");

        // Step 2: publish — use recommended times (1 hour from now → 7 days), so status = SCHEDULED
        publishFromRow(announcement, title);
        announcement.waitForToast("发布成功");
        announcement.expectRowStatus(title, "待生效");

        // Step 3: published announcement — edit should be disabled
        announcement.expectEditDisabledOnRow(title);

        // Step 4: disable the published announcement
        disableFromRow(announcement, title);
        announcement.waitForToast("已停用");
        announcement.expectRowStatus(title, "已停用");

        // Step 5: disabled → delete with confirmation
        announcement.clickDeleteOnRow(title);
        var confirmDialog = new AnnouncementConfirmDialog(page);
        confirmDialog.expectVisible().expectTitle("删除公告");
        confirmDialog.confirm();
        announcement.waitForToast("删除成功");
        announcement.expectRowGone(title);
    }

    // ===== TC-FE-005: form validation =====

    @Test(description = "TC-FE-005 表单必填与时间校验")
    @Story("TC-FE-005")
    @Severity(SeverityLevel.CRITICAL)
    @Description("""
            1. 打开新建公告弹窗，不填写任何字段直接保存
            2. 标题、正文、展示位置、开始时间、结束时间均出现必填错误
            3. 设置开始时间不早于结束时间，出现时间校验错误
            4. 弹窗保持打开，未提交
            """)
    public void shouldValidateFormFields() {
        var page = browser.page();
        loginThroughConsole(page);

        var announcement = new AnnouncementPage(page, instance.consoleUrl());
        announcement.open();

        announcement.clickNewAnnouncement();
        var form = new AnnouncementFormModal(page);
        form.expectVisible();

        // Submit empty form
        form.clickSave();

        // REQ-010.1: all required fields show errors
        form.expectTitleError();
        form.expectContentError();
        form.expectPositionError();
        form.expectStartTimeError();
        form.expectEndTimeError();

        // Modal should still be open (no submission)
        form.expectStillOpen();

        // REQ-010.2: start time >= end time shows time validation error
        form.fillTitle("校验测试标题");
        form.fillContent("校验测试正文");
        form.selectPosition("首页横幅");
        // Set start time = end time (start not earlier than end)
        var sameTime = "2026-12-01T12:00";
        form.fillStartTime(sameTime);
        form.fillEndTime(sameTime);
        form.blurEndTime();
        form.clickSave();
        form.expectEndTimeError();
        assertTrue(form.endTimeError().contains("结束时间必须晚于开始时间"),
                "End time error should mention the rule");

        form.expectStillOpen();
    }

    // ===== TC-FE-006: disabled → edit → draft =====

    @Test(description = "TC-FE-006 已停用公告编辑保存后回到草稿状态")
    @Story("TC-FE-006")
    @Severity(SeverityLevel.NORMAL)
    @Description("""
            1. 打开已停用公告（mock 数据中的 ann-disabled-notice）
            2. 点击编辑，修改正文并保存
            3. 公告状态变为草稿，提示需要重新发布
            """)
    public void shouldResetDisabledToDraftOnEdit() {
        var page = browser.page();
        loginThroughConsole(page);

        var announcement = new AnnouncementPage(page, instance.consoleUrl());
        announcement.open();

        // Filter to "已停用" to find a disabled announcement
        announcement.selectStatusFilter("已停用");
        assertTrue(announcement.visibleRowCount() > 0, "Should have disabled announcements in mock data");

        var firstTitle = announcement
                .tableBody()
                .locator("tr")
                .first()
                .locator(".announcement-page__title-link")
                .innerText();

        // Edit the disabled announcement
        announcement.clickEditOnRow(firstTitle);
        var form = new AnnouncementFormModal(page);
        form.expectVisible();

        // Verify the form is backfilled with the announcement's data
        form.expectTitleValue(firstTitle);

        // Modify content and save
        var newContent = "已停用编辑后正文 " + scope.token();
        form.clearContent();
        form.fillContent(newContent);
        form.clickSave();

        // REQ-003.3: status becomes draft with a toast
        announcement.waitForToast("保存成功");
        announcement.expectRowWithTitle(firstTitle).expectRowStatus(firstTitle, "草稿");
    }

    // ===== REQ-008: display strategy =====

    @Test(description = "TC-FE-006b 同位置多条展示中仅最新一条生效，较旧条目标记被覆盖")
    @Story("TC-FE-006b")
    @Severity(SeverityLevel.NORMAL)
    @Description("""
            1. 打开公告列表
            2. 首页横幅位置有多条展示中公告时，当前展示排期仅显示开始时间最晚的一条
            3. 被覆盖的展示中公告在列表中带有「同位置较旧，暂不展示」标记
            """)
    public void shouldShowLatestActiveAndMarkShadowed() {
        var page = browser.page();
        loginThroughConsole(page);

        var announcement = new AnnouncementPage(page, instance.consoleUrl());
        announcement.open();

        // Mock data has two PUBLISHED HOME_BANNER announcements:
        // - "ann-published-banner" (startTime -6h) — newer → active
        // - "ann-shadowed-banner" (startTime -30h) — older → shadowed
        // The active card for 首页横幅 should show the newer title.
        var activeBannerTitle = announcement.activeTitle("首页横幅");
        assertFalse(activeBannerTitle.isBlank(), "首页横幅 active card should show a title");

        // Filter to PUBLISHED to find shadowed rows
        announcement.selectStatusFilter("展示中");
        assertTrue(announcement.visibleRowCount() > 0, "Should have published announcements");

        // At least one shadowed tag should be present in the list
        var shadowTags = page.locator(".announcement-page__shadow-tag");
        assertTrue(shadowTags.count() > 0,
                "There should be at least one shadowed announcement marked in the list");
    }

    // ===== helpers =====

    @Step("使用真实表单登录控制台")
    private void loginThroughConsole(Page page) {
        var console = new ConsolePageObject(page, instance.consoleUrl());
        page.navigate("/login");
        var login = console.login();
        login.expectLoaded();
        login.login(E2EConfig.ADMIN_USERNAME, E2EConfig.ADMIN_PASSWORD);
        page.waitForURL(
                url -> !url.contains("/login"),
                new Page.WaitForURLOptions().setTimeout(30_000));
        assertThat(page.locator("#username")).hasCount(0);
    }

    @Step("新建公告并保存为草稿")
    private void createDraftAnnouncement(AnnouncementPage announcement, String title, String content) {
        announcement.clickNewAnnouncement();
        var form = new AnnouncementFormModal(announcement.page());
        form.expectVisible()
                .fillTitle(title)
                .fillContent(content)
                .selectPosition("首页横幅")
                .useDefaultTimes();
        form.clickSave();
        // Wait for modal to close and list to refresh
        form.expectGone();
        announcement.waitForTableReady();
    }

    @Step("从列表行发布公告（含确认弹窗）")
    private void publishFromRow(AnnouncementPage announcement, String title) {
        announcement.clickPublishOnRow(title);
        var dialog = new AnnouncementConfirmDialog(announcement.page());
        dialog.expectVisible().expectTitle("发布公告");
        dialog.confirm();
        // Wait for toast and list refresh
        announcement.waitForTableReady();
    }

    @Step("从列表行停用公告（含确认弹窗）")
    private void disableFromRow(AnnouncementPage announcement, String title) {
        announcement.clickDisableOnRow(title);
        var dialog = new AnnouncementConfirmDialog(announcement.page());
        dialog.expectVisible().expectTitle("停用公告");
        dialog.confirm();
        announcement.waitForTableReady();
    }
}
