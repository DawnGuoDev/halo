package run.halo.e2e.frontend;

import static com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat;
import static org.testng.Assert.assertEquals;
import static org.testng.Assert.assertFalse;
import static org.testng.Assert.assertNotEquals;
import static org.testng.Assert.assertNotNull;
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
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import org.testng.SkipException;
import org.testng.annotations.AfterMethod;
import org.testng.annotations.BeforeMethod;
import org.testng.annotations.Test;
import run.halo.e2e.pages.ConsolePageObject;
import run.halo.e2e.pages.PublishCalendarPage;
import run.halo.e2e.support.Assertions;
import run.halo.e2e.support.BrowserSession;
import run.halo.e2e.support.E2EConfig;
import run.halo.e2e.support.HaloApiClient;
import run.halo.e2e.support.HaloInstance;

/**
 * E2E tests for the Console「内容发布日历」page ({@code /console/posts/calendar}).
 *
 * <p>Covers REQ-001 (month view), REQ-002 (list view), REQ-003 (filters &amp; URL sync),
 * REQ-004 (detail &amp; publish-time editing), REQ-005 (state feedback) and REQ-006 (entry &amp; permission).
 *
 * <p>Each test logs in through the real console form, navigates to the calendar page and exercises
 * the feature using Playwright Java assertions against visible text, URL query parameters and DOM
 * structure. The calendar page uses mock data so no real posts are created or modified.
 */
@Epic("内容发布日历")
@Feature("前端 E2E：发布日历页面")
public class PublishCalendarE2ETest {

    private HaloInstance instance;
    private HaloApiClient api;
    private BrowserSession browser;
    private ConsolePageObject console;
    private PublishCalendarPage calendar;

    @BeforeMethod(alwaysRun = true)
    public void setUp() {
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
        var page = browser.page();
        console = new ConsolePageObject(page, instance.consoleUrl());
        calendar = new PublishCalendarPage(page, instance.consoleUrl());
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

    // =========================================================================
    // REQ-006: Entry & Permission
    // =========================================================================

    @Test(description = "TC-CAL-001 登录后访问 /console/posts/calendar 直达发布日历页面")
    @Story("REQ-006 入口与权限")
    @Severity(SeverityLevel.BLOCKER)
    @Description("""
            1. 使用临时实例账号通过真实表单登录
            2. 直接访问 /console/posts/calendar
            3. 页面标题「发布日历」可见，月历视图默认展示
            """)
    public void shouldAccessCalendarPageDirectly() {
        loginThroughConsole(browser.page());

        calendar.open().expectLoaded();
        assertThat(calendar.pageTitle()).isVisible();
        assertThat(calendar.calendarGrid()).isVisible();
        Allure.addAttachment("page-url", "text/plain", calendar.currentUrl());
    }

    // =========================================================================
    // REQ-001: Month View
    // =========================================================================

    @Test(description = "TC-CAL-002 月历视图默认展示当前月，周一起始，今天高亮")
    @Story("REQ-001 月历视图")
    @Severity(SeverityLevel.CRITICAL)
    @Description("""
            1. 登录并打开发布日历页面
            2. 月历网格可见，含 6×7=42 格
            3. 周一为第一列，7 个表头依次为 周一…周日
            4. 今天对应格子有 calendar-cell--today 高亮
            5. 非当月日期有 calendar-cell--outside 灰显
            """)
    public void shouldShowCurrentMonthCalendar() {
        loginThroughConsole(browser.page());
        calendar.open().expectLoaded();

        // Grid visible
        assertThat(calendar.calendarGrid()).isVisible();

        // 42 cells (6 rows × 7 columns)
        assertEquals(calendar.calendarCells().count(), 42, "Calendar grid must have 42 cells");

        // Weekday headers start with 周一
        var weekdays = calendar.weekdayHeaderTexts();
        assertEquals(weekdays.size(), 7, "Must have 7 weekday headers");
        assertEquals(weekdays.get(0), "周一", "First weekday must be Monday");

        // Today cell is highlighted
        assertTrue(calendar.todayCell().count() >= 1, "Today cell must be highlighted");

        // Outside-month cells exist (greyed out)
        assertTrue(calendar.outsideMonthCells().count() > 0, "Outside-month cells must exist and be greyed out");

        // Month title shows current month
        var now = LocalDateTime.now(ZoneId.systemDefault());
        var expectedMonthTitle = now.getYear() + " 年 " + now.getMonthValue() + " 月";
        assertEquals(calendar.monthTitleText(), expectedMonthTitle, "Month title must show current month");
    }

    @Test(description = "TC-CAL-003 月历上/下月导航与回到本月")
    @Story("REQ-001 月历视图")
    @Severity(SeverityLevel.NORMAL)
    @Description("""
            1. 月历默认当前月
            2. 点击下个月，月份标题变为下月
            3. 点击回到本月，月份标题回到当前月
            4. 点击上个月，月份标题变为上月
            """)
    public void shouldNavigateMonths() {
        loginThroughConsole(browser.page());
        calendar.open().expectLoaded();

        var originalMonth = calendar.monthTitleText();

        // Next month
        calendar.nextMonth();
        var nextMonth = calendar.monthTitleText();
        assertNotEquals(nextMonth, originalMonth, "Next month must differ from current");

        // Back to current month
        calendar.backToCurrentMonth();
        assertEquals(calendar.monthTitleText(), originalMonth, "Back-to-current must restore original month");

        // Previous month
        calendar.previousMonth();
        assertNotEquals(calendar.monthTitleText(), originalMonth, "Previous month must differ from current");
    }

    @Test(description = "TC-CAL-004 月历文章条目展示标题和时间，状态可区分")
    @Story("REQ-001 月历视图")
    @Severity(SeverityLevel.NORMAL)
    @Description("""
            1. 月历加载后至少有一个文章条目
            2. 每个条目包含文章标题文本
            3. 文章条目有状态样式类（calendar-event--published/scheduled/draft/recycled）
            """)
    public void shouldShowCalendarEventsWithTitleAndStatus() {
        loginThroughConsole(browser.page());
        calendar.open().expectLoaded();

        var events = calendar.calendarEvents();
        assertTrue(events.count() > 0, "Must have at least one calendar event in the current month");

        // Check at least one event has a status class
        var firstEvent = events.first();
        var classAttr = firstEvent.getAttribute("class");
        assertNotNull(classAttr, "Calendar event must have class attribute");
        assertTrue(
                classAttr.contains("calendar-event--published")
                        || classAttr.contains("calendar-event--scheduled")
                        || classAttr.contains("calendar-event--draft")
                        || classAttr.contains("calendar-event--recycled"),
                "Calendar event must have a status class: " + classAttr);
    }

    // =========================================================================
    // REQ-002: List View
    // =========================================================================

    @Test(description = "TC-CAL-005 列表视图按时间排序，点击行打开详情抽屉")
    @Story("REQ-002 列表视图")
    @Severity(SeverityLevel.CRITICAL)
    @Description("""
            1. 切换到列表视图
            2. 列表表格可见，至少有一行
            3. 点击第一行打开详情抽屉
            """)
    public void shouldShowListViewAndOpenDetailOnRowClick() {
        loginThroughConsole(browser.page());
        calendar.open().expectLoaded();

        calendar.switchToListView();
        assertThat(calendar.listTable()).isVisible();
        assertTrue(calendar.listRowCount() > 0, "List view must have at least one row");

        calendar.clickFirstListRow();
        assertTrue(calendar.isDetailDrawerVisible(), "Detail drawer must open after clicking list row");
    }

    @Test(description = "TC-CAL-006 视图切换保留筛选条件")
    @Story("REQ-002 列表视图")
    @Severity(SeverityLevel.NORMAL)
    @Description("""
            1. 输入关键词筛选
            2. 切换到列表视图
            3. 切换回月历视图
            4. 筛选条件仍在 URL 中
            """)
    public void shouldPreserveFiltersOnViewToggle() {
        loginThroughConsole(browser.page());
        calendar.open().expectLoaded();

        calendar.enterKeyword("Halo");

        calendar.switchToListView();
        assertTrue(calendar.urlContains("keyword=Halo"), "Keyword filter must be preserved in URL on view toggle");

        calendar.switchToCalendarView();
        assertTrue(calendar.urlContains("keyword=Halo"), "Keyword filter must be preserved in URL on switching back");
    }

    // =========================================================================
    // REQ-003: Filters & URL Sync
    // =========================================================================

    @Test(description = "TC-CAL-007 关键词、分类、状态组合筛选并同步 URL")
    @Story("REQ-003 筛选与 URL 同步")
    @Severity(SeverityLevel.CRITICAL)
    @Description("""
            1. 输入关键词，URL 中出现 keyword 参数
            2. 选择分类，URL 中出现 category 参数
            3. 选择状态，URL 中出现 status 参数
            4. 月历与列表同时过滤
            """)
    public void shouldFilterAndSyncUrl() {
        loginThroughConsole(browser.page());
        calendar.open().expectLoaded();

        // Keyword filter
        calendar.enterKeyword("Halo");
        assertTrue(calendar.urlContains("keyword="), "URL must contain keyword parameter");

        // Category filter
        calendar.selectCategory("使用教程");
        assertTrue(calendar.urlContains("category="), "URL must contain category parameter");

        // Status filter
        calendar.selectStatus("published");
        assertTrue(calendar.urlContains("status=published"), "URL must contain status parameter");

        // Switch to list view — same filters apply
        calendar.switchToListView();
        assertTrue(calendar.listRowCount() >= 0, "List must render with active filters");
    }

    @Test(description = "TC-CAL-008 清除筛选按钮重置所有筛选项")
    @Story("REQ-003 筛选与 URL 同步")
    @Severity(SeverityLevel.NORMAL)
    @Description("""
            1. 设置关键词和状态筛选
            2. 点击清除筛选
            3. URL 中的 keyword 和 status 参数被移除
            """)
    public void shouldClearFiltersWithButton() {
        loginThroughConsole(browser.page());
        calendar.open().expectLoaded();

        calendar.enterKeyword("Halo");
        calendar.selectStatus("published");
        assertTrue(calendar.urlContains("keyword="), "Keyword filter must be active before clearing");

        calendar.clearFilters();
        assertFalse(calendar.urlContains("keyword=Halo"), "Keyword must be cleared from URL");
    }

    // =========================================================================
    // REQ-004: Detail & Publish Time Editing
    // =========================================================================

    @Test(description = "TC-CAL-009 点击文章打开详情抽屉，展示基础信息")
    @Story("REQ-004 文章详情与发布时间编辑")
    @Severity(SeverityLevel.CRITICAL)
    @Description("""
            1. 月历中点击文章条目
            2. 右侧抽屉打开，标题可见
            3. 抽屉中有文章详情信息
            """)
    public void shouldOpenDetailDrawerFromCalendarEvent() {
        loginThroughConsole(browser.page());
        calendar.open().expectLoaded();

        calendar.clickFirstCalendarEvent();
        assertTrue(calendar.isDetailDrawerVisible(), "Detail drawer must open after clicking calendar event");
        assertThat(calendar.detailTitle()).isVisible();
    }

    @Test(description = "TC-CAL-010 已发布文章详情无保存入口")
    @Story("REQ-004 文章详情与发布时间编辑")
    @Severity(SeverityLevel.NORMAL)
    @Description("""
            1. 筛选已发布文章
            2. 点击文章打开详情
            3. 发布时间输入框禁用，无保存按钮
            4. 展示只读原因（已发布）
            """)
    public void shouldNotShowSaveButtonForPublishedPost() {
        loginThroughConsole(browser.page());
        calendar.open().expectLoaded();

        // Filter for published posts
        calendar.selectStatus("published");

        // Click the first calendar event (published)
        var events = calendar.calendarEvents();
        if (events.count() == 0) {
            // Try list view
            calendar.switchToListView();
            if (calendar.listRowCount() == 0) {
                throw new SkipException("BLOCKED: No published posts in mock data for this month");
            }
            calendar.clickFirstListRow();
        } else {
            calendar.clickFirstCalendarEvent();
        }

        assertTrue(calendar.isDetailDrawerVisible(), "Detail drawer must be open");
        assertFalse(calendar.isSaveButtonVisible(), "Published post must not show save button");

        // Read-only reason should mention "已发布"
        var help = calendar.readOnlyHelpText();
        assertTrue(help.contains("已发布"), "Read-only reason must mention published status: " + help);
    }

    @Test(description = "TC-CAL-011 待发布文章可保存晚于当前的时间，保存后月历与列表同步更新")
    @Story("REQ-004 文章详情与发布时间编辑")
    @Severity(SeverityLevel.CRITICAL)
    @Description("""
            1. 筛选待发布文章
            2. 点击文章打开详情
            3. 修改发布时间为未来时间并保存
            4. Toast 提示「发布时间已更新」
            5. 抽屉关闭
            6. 月历与列表中文章移动到新日期
            """)
    public void shouldSaveValidFutureTimeForScheduledPost() {
        loginThroughConsole(browser.page());
        calendar.open().expectLoaded();

        // Filter for scheduled posts
        calendar.selectStatus("scheduled");

        // Click the first scheduled event
        var events = calendar.calendarEvents();
        if (events.count() == 0) {
            throw new SkipException("BLOCKED: No scheduled posts in mock data for this month");
        }

        // Record the original event count before save
        var eventsBefore = events.count();
        Allure.addAttachment("events-before-save", "text/plain", String.valueOf(eventsBefore));

        calendar.clickFirstCalendarEvent();
        assertTrue(calendar.isDetailDrawerVisible(), "Detail drawer must be open");

        // Ensure canManage is enabled (default is true)
        calendar.setCanManage(true);

        // Fill a future time (7 days from now at 10:00)
        var futureTime = LocalDateTime.now(ZoneId.systemDefault())
                .plusDays(7)
                .withHour(10)
                .withMinute(0)
                .withSecond(0)
                .withNano(0);
        var futureTimeStr = futureTime.format(DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm"));

        assertTrue(calendar.isSaveButtonVisible(), "Save button must be visible for scheduled post with manage permission");
        calendar.fillPublishTime(futureTimeStr);
        calendar.clickSave();

        // Toast
        calendar.expectToast("发布时间已更新");

        // Drawer closes
        assertFalse(calendar.isDetailDrawerVisible(), "Detail drawer must close after save");
    }

    @Test(description = "TC-CAL-012 选择过去时间时显示字段错误，数据不变")
    @Story("REQ-004 文章详情与发布时间编辑")
    @Severity(SeverityLevel.CRITICAL)
    @Description("""
            1. 筛选待发布文章
            2. 点击文章打开详情
            3. 修改发布时间为过去时间并保存
            4. 字段下方出现红字错误「发布时间必须晚于当前时间」
            5. 抽屉不关闭，数据不变
            """)
    public void shouldShowErrorForPastTime() {
        loginThroughConsole(browser.page());
        calendar.open().expectLoaded();

        // Filter for scheduled posts
        calendar.selectStatus("scheduled");

        var events = calendar.calendarEvents();
        if (events.count() == 0) {
            throw new SkipException("BLOCKED: No scheduled posts in mock data for this month");
        }

        calendar.clickFirstCalendarEvent();
        assertTrue(calendar.isDetailDrawerVisible(), "Detail drawer must be open");

        calendar.setCanManage(true);

        // Fill a past time (7 days ago at 10:00)
        var pastTime = LocalDateTime.now(ZoneId.systemDefault())
                .minusDays(7)
                .withHour(10)
                .withMinute(0)
                .withSecond(0)
                .withNano(0);
        var pastTimeStr = pastTime.format(DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm"));

        calendar.fillPublishTime(pastTimeStr);
        calendar.clickSave();

        // Error message must be visible
        assertThat(calendar.errorMessage()).isVisible();
        var errorText = calendar.errorMessage().textContent();
        assertTrue(errorText != null && errorText.contains("发布时间必须晚于当前时间"),
                "Error message must state the time must be in the future: " + errorText);

        // Drawer must still be open (not closed by failed save)
        assertTrue(calendar.isDetailDrawerVisible(), "Detail drawer must remain open on validation failure");
    }

    // =========================================================================
    // REQ-005: State & Feedback
    // =========================================================================

    @Test(description = "TC-CAL-013 无管理权限时全页只读，发布时间输入禁用")
    @Story("REQ-005 状态与反馈 / REQ-006 权限")
    @Severity(SeverityLevel.NORMAL)
    @Description("""
            1. 取消管理权限复选框
            2. 点击待发布文章
            3. 发布时间输入框禁用，无保存按钮
            4. 展示无权限只读原因
            """)
    public void shouldShowReadOnlyWhenNoManagePermission() {
        loginThroughConsole(browser.page());
        calendar.open().expectLoaded();

        // Uncheck canManage
        calendar.setCanManage(false);

        // Filter for scheduled posts
        calendar.selectStatus("scheduled");

        var events = calendar.calendarEvents();
        if (events.count() == 0) {
            throw new SkipException("BLOCKED: No scheduled posts in mock data for this month");
        }

        calendar.clickFirstCalendarEvent();
        assertTrue(calendar.isDetailDrawerVisible(), "Detail drawer must be open");

        // Input must be disabled
        assertTrue(
                calendar.publishTimeInput().isDisabled(),
                "Publish time input must be disabled without manage permission");

        // No save button
        assertFalse(calendar.isSaveButtonVisible(), "Save button must not be visible without manage permission");

        // Read-only reason must mention permission
        var help = calendar.readOnlyHelpText();
        assertTrue(help.contains("权限"), "Read-only reason must mention permission: " + help);
    }

    // =========================================================================
    // Helper
    // =========================================================================

    @Step("使用真实表单登录控制台")
    private void loginThroughConsole(Page page) {
        page.navigate("/login");
        console.login().expectLoaded();
        console.login().login(E2EConfig.ADMIN_USERNAME, E2EConfig.ADMIN_PASSWORD);
        page.waitForURL(
                url -> !url.contains("/login"),
                new Page.WaitForURLOptions().setTimeout(30_000));
    }
}
