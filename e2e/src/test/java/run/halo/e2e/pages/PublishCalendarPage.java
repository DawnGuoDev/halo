package run.halo.e2e.pages;

import static com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.options.AriaRole;
import io.qameta.allure.Step;
import java.util.regex.Pattern;

/**
 * Publish Calendar page ({@code /console/posts/calendar}).
 *
 * <p>Selectors follow Halo component patterns (VPageHeader, VTabbar, VCard, VModal, VEmpty, VLoading)
 * and the visible text defined in the PRD. The page is reached via direct URL navigation; sidebar
 * menu visibility is validated separately.
 */
public final class PublishCalendarPage {

    private final Page page;
    private final String baseUrl;

    public PublishCalendarPage(Page page, String baseUrl) {
        this.page = page;
        this.baseUrl = baseUrl;
    }

    // ------------------------------------------------------------------
    // Navigation
    // ------------------------------------------------------------------

    @Step("打开发布日历页 /console/posts/calendar")
    public PublishCalendarPage open() {
        page.navigate(baseUrl + "/console/posts/calendar");
        page.waitForURL(
                url -> url.contains("/console/posts/calendar"),
                new Page.WaitForURLOptions().setTimeout(30_000));
        return this;
    }

    /** Waits for the page to settle: page header or calendar grid becomes visible. */
    @Step("等待发布日历页加载完成")
    public PublishCalendarPage expectLoaded() {
        // The page header title "内容发布日历" should appear once the page is rendered.
        page.waitForCondition(
                () -> page.getByText(Pattern.compile("内容发布日历")).count() > 0,
                new Page.WaitForConditionOptions().setTimeout(30_000));
        return this;
    }

    // ------------------------------------------------------------------
    // View switching (REQ-001 / REQ-002 / REQ-003)
    // ------------------------------------------------------------------

    /** Clicks the "月历" tab. */
    @Step("切换到月历视图")
    public PublishCalendarPage switchToCalendarView() {
        page.getByRole(AriaRole.TAB, new Page.GetByRoleOptions().setName(Pattern.compile("月历")))
                .first()
                .click();
        return this;
    }

    /** Clicks the "列表" tab. */
    @Step("切换到列表视图")
    public PublishCalendarPage switchToListView() {
        page.getByRole(AriaRole.TAB, new Page.GetByRoleOptions().setName(Pattern.compile("列表")))
                .first()
                .click();
        return this;
    }

    /** Returns true if the calendar grid is currently visible. */
    public boolean isCalendarViewActive() {
        return page.locator("[role=grid]").count() > 0
                && page.locator("[role=grid]").isVisible();
    }

    /** Returns true if the list table is currently visible. */
    public boolean isListViewActive() {
        return page.locator("table").count() > 0
                && page.locator("table").isVisible();
    }

    // ------------------------------------------------------------------
    // Month navigation (REQ-002)
    // ------------------------------------------------------------------

    /** Clicks the "上月" (previous month) button. */
    @Step("点击上月按钮")
    public PublishCalendarPage clickPrevMonth() {
        page.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName(Pattern.compile("上月")))
                .first()
                .click();
        return this;
    }

    /** Clicks the "下月" (next month) button. */
    @Step("点击下月按钮")
    public PublishCalendarPage clickNextMonth() {
        page.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName(Pattern.compile("下月")))
                .first()
                .click();
        return this;
    }

    /** Clicks the "回到本月" (back to current month) button. */
    @Step("点击回到本月按钮")
    public PublishCalendarPage clickBackToCurrentMonth() {
        page.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName(Pattern.compile("回到本月")))
                .first()
                .click();
        return this;
    }

    /** Returns the current month header text (e.g. "2026 年 11 月"). */
    public String monthHeaderText() {
        // The month header shows "X 年 Y 月" and a count of scheduled posts.
        var header = page.locator(".cal-month, .calendar-month, [data-testid='month-header']")
                .first();
        if (header.count() > 0) {
            return header.innerText();
        }
        // Fallback: find any visible text matching the pattern
        var match = page.getByText(Pattern.compile("\\d{4}\\s*年\\s*\\d{1,2}\\s*月")).first();
        return match.count() > 0 ? match.innerText() : "";
    }

    // ------------------------------------------------------------------
    // Calendar grid (REQ-002)
    // ------------------------------------------------------------------

    /** Returns all grid cells (expected: 42 = 6 weeks × 7 days). */
    public Locator gridCells() {
        return page.locator("[role=gridcell]");
    }

    /** Returns the count of grid cells. */
    public int gridCellCount() {
        return gridCells().count();
    }

    /** Returns the table header cells (expected: 7, Monday to Sunday). */
    public Locator dayHeaders() {
        return page.locator(".cal-dow > div, [role=columnheader]");
    }

    /** Finds a post card by its title within the calendar grid. */
    public Locator postCardByTitle(String title) {
        return page.locator("[role=gridcell]")
                .locator("button, a, [role=button]")
                .filter(new Locator.FilterOptions().setHasText(title))
                .first();
    }

    /** Clicks a post card by title in the calendar grid. */
    @Step("在月历中点击文章卡片：{title}")
    public PublishCalendarPage clickPostCard(String title) {
        var card = postCardByTitle(title);
        assertThat(card).isVisible();
        card.click();
        return this;
    }

    /** Returns the "还有 N 篇，查看列表" link if present. */
    public Locator moreLink() {
        return page.getByText(Pattern.compile("还有\\s*\\d+\\s*篇.*查看列表"));
    }

    /** Clicks the "还有 N 篇" link to switch to list view. */
    @Step("点击「还有 N 篇，查看列表」")
    public PublishCalendarPage clickMoreLink() {
        moreLink().first().click();
        return this;
    }

    /** Returns true if the "还有 N 篇" link is visible. */
    public boolean hasMoreLink() {
        return moreLink().count() > 0 && moreLink().first().isVisible();
    }

    // ------------------------------------------------------------------
    // List view (REQ-003)
    // ------------------------------------------------------------------

    /** Returns all rows in the list table. */
    public Locator listRows() {
        return page.locator("table tbody tr").filter(
                new Locator.FilterOptions().setHasNot(page.locator(".group-row")));
    }

    /** Returns a row by post title in the list view. */
    public Locator rowByTitle(String title) {
        return page.locator("table tbody tr")
                .filter(new Locator.FilterOptions().setHasText(title))
                .first();
    }

    /** Returns the group header row for "已排期". */
    public Locator scheduledGroupHeader() {
        return page.locator("table tbody tr").filter(
                new Locator.FilterOptions().setHasText(Pattern.compile("已排期")));
    }

    /** Returns the group header row for "未排期草稿". */
    public Locator unscheduledGroupHeader() {
        return page.locator("table tbody tr").filter(
                new Locator.FilterOptions().setHasText(Pattern.compile("未排期草稿")));
    }

    /** Clicks the action button ("调整时间" or "查看") in a row by post title. */
    @Step("在列表中点击文章行操作按钮：{title}")
    public PublishCalendarPage clickRowAction(String title) {
        var row = rowByTitle(title);
        assertThat(row).isVisible();
        row.locator("button, a").first().click();
        return this;
    }

    /** Returns the action button text for a row. */
    public String rowActionText(String title) {
        var row = rowByTitle(title);
        return row.locator("button, a").first().innerText();
    }

    // ------------------------------------------------------------------
    // Filters (REQ-004)
    // ------------------------------------------------------------------

    /** Types a keyword into the search input. */
    @Step("输入关键词筛选：{keyword}")
    public PublishCalendarPage enterKeyword(String keyword) {
        var search = page.getByPlaceholder(Pattern.compile(".*(搜索|请输入关键词|Search).*"))
                .first();
        if (search.count() == 0) {
            // Fallback: first visible text input in the filter area
            search = page.locator("input[type=text]").first();
        }
        search.fill(keyword);
        // Small delay for debounced search to trigger
        page.waitForTimeout(300);
        return this;
    }

    /** Clears the keyword search input. */
    @Step("清除关键词筛选")
    public PublishCalendarPage clearKeyword() {
        var search = page.getByPlaceholder(Pattern.compile(".*(搜索|请输入关键词|Search).*"))
                .first();
        if (search.count() == 0) {
            search = page.locator("input[type=text]").first();
        }
        search.clear();
        page.waitForTimeout(300);
        return this;
    }

    /** Clicks the refresh button. */
    @Step("点击刷新按钮")
    public PublishCalendarPage clickRefresh() {
        // The refresh button contains a refresh icon; match by tooltip or aria-label
        page.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName(Pattern.compile(".*(刷新|刷新).*")))
                .first()
                .click();
        return this;
    }

    /** Clicks the "清除全部筛选" button in empty filter state. */
    @Step("点击清除全部筛选")
    public PublishCalendarPage clickClearAllFilters() {
        page.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName(Pattern.compile("清除全部筛选")))
                .first()
                .click();
        return this;
    }

    // ------------------------------------------------------------------
    // Empty / Error states (REQ-006)
    // ------------------------------------------------------------------

    /** Returns true if the "本月暂无排期" empty state is visible. */
    public boolean isNoScheduleEmptyStateVisible() {
        return page.getByText(Pattern.compile("本月暂无排期")).count() > 0;
    }

    /** Returns true if the "没有符合条件的文章" filter empty state is visible. */
    public boolean isFilterEmptyStateVisible() {
        return page.getByText(Pattern.compile("没有符合条件的文章")).count() > 0;
    }

    /** Returns true if the "加载排期失败" error state is visible. */
    public boolean isErrorStateVisible() {
        return page.getByText(Pattern.compile("加载排期失败")).count() > 0;
    }

    /** Clicks the "重试" button in error state. */
    @Step("点击重试按钮")
    public PublishCalendarPage clickRetry() {
        page.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName(Pattern.compile(".*(重试|重试).*")))
                .first()
                .click();
        return this;
    }

    /** Returns true if a loading skeleton is visible. */
    public boolean isLoadingSkeletonVisible() {
        return page.locator(".skeleton, [class*='skeleton'], [class*='sk-']").count() > 0;
    }

    // ------------------------------------------------------------------
    // Detail modal (REQ-005)
    // ------------------------------------------------------------------

    /** Returns the detail modal locator. */
    public Locator detailModal() {
        return page.locator("[role=dialog]");
    }

    /** Returns true if the detail modal is visible. */
    public boolean isDetailModalVisible() {
        return detailModal().count() > 0 && detailModal().isVisible();
    }

    /** Waits for the detail modal to appear. */
    @Step("等待详情弹窗出现")
    public PublishCalendarPage expectDetailModal() {
        page.waitForCondition(
                this::isDetailModalVisible,
                new Page.WaitForConditionOptions().setTimeout(10_000));
        return this;
    }

    /** Returns the title text in the detail modal. */
    public String modalTitle() {
        return detailModal().locator("h2, h3, [class*='title']").first().innerText();
    }

    /** Returns the datetime-local input in the detail modal. */
    public Locator modalDatetimeInput() {
        return detailModal().locator("input[type=datetime-local]").first();
    }

    /** Returns true if the datetime input is readonly. */
    public boolean isModalDatetimeReadonly() {
        var input = modalDatetimeInput();
        return input.count() > 0 && input.getAttribute("readonly") != null;
    }

    /** Fills the datetime-local input with a new value. */
    @Step("在详情弹窗中填写新的发布时间")
    public PublishCalendarPage fillModalDatetime(String value) {
        var input = modalDatetimeInput();
        assertThat(input).isVisible();
        input.fill(value);
        return this;
    }

    /** Clicks the "保存发布时间" button in the detail modal. */
    @Step("点击保存发布时间按钮")
    public PublishCalendarPage clickSavePublishTime() {
        detailModal()
                .getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions()
                        .setName(Pattern.compile(".*(保存发布时间|保存发布时间).*")))
                .first()
                .click();
        return this;
    }

    /** Returns true if the save button is disabled (saving in progress). */
    public boolean isSaveButtonDisabled() {
        var btn = detailModal()
                .getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions()
                        .setName(Pattern.compile(".*(保存中|保存发布时间).*")))
                .first();
        if (btn.count() == 0) {
            return true;
        }
        return btn.isDisabled();
    }

    /** Returns true if a field-level validation error is visible. */
    public boolean hasModalValidationError() {
        return detailModal().getByText(Pattern.compile(".*(晚于当前时间|必须晚于).*")).count() > 0;
    }

    /** Returns true if the save button is absent (read-only / no permission). */
    public boolean hasNoSaveButton() {
        return detailModal()
                .getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions()
                        .setName(Pattern.compile(".*(保存发布时间|保存发布时间).*")))
                .count()
                == 0;
    }

    /** Closes the modal by pressing Escape. */
    @Step("按 Esc 关闭详情弹窗")
    public PublishCalendarPage closeModalWithEscape() {
        page.keyboard().press("Escape");
        return this;
    }

    /** Closes the modal by clicking the close (X) button. */
    @Step("点击关闭按钮关闭详情弹窗")
    public PublishCalendarPage closeModalWithButton() {
        detailModal()
                .getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName(Pattern.compile(".*(关闭|取消).*")))
                .first()
                .click();
        return this;
    }

    /** Waits for the detail modal to disappear. */
    public PublishCalendarPage expectModalClosed() {
        page.waitForCondition(
                () -> !isDetailModalVisible(),
                new Page.WaitForConditionOptions().setTimeout(10_000));
        return this;
    }

    // ------------------------------------------------------------------
    // Toast
    // ------------------------------------------------------------------

    /** Returns true if a success toast is visible containing the given text. */
    public boolean hasToastContaining(String text) {
        return page.getByText(Pattern.compile(".*" + Pattern.quote(text) + ".*")).count() > 0;
    }

    /** Waits for a toast containing the given text to appear. */
    public PublishCalendarPage expectToastContaining(String text) {
        page.waitForCondition(
                () -> hasToastContaining(text),
                new Page.WaitForConditionOptions().setTimeout(10_000));
        return this;
    }

    // ------------------------------------------------------------------
    // Sidebar menu (REQ-001)
    // ------------------------------------------------------------------

    /** Returns the sidebar menu item for "发布日历". */
    public Locator sidebarMenuItem() {
        return page.getByRole(AriaRole.LINK, new Page.GetByRoleOptions().setName(Pattern.compile("发布日历")))
                .first();
    }

    /** Returns true if the sidebar "发布日历" menu item is visible. */
    public boolean isSidebarMenuItemVisible() {
        return sidebarMenuItem().count() > 0 && sidebarMenuItem().isVisible();
    }

    /** Clicks the sidebar "发布日历" menu item. */
    @Step("点击侧边栏「发布日历」菜单项")
    public PublishCalendarPage clickSidebarMenuItem() {
        sidebarMenuItem().click();
        return this;
    }

    // ------------------------------------------------------------------
    // Page URL
    // ------------------------------------------------------------------

    /** Returns the current page URL. */
    public String currentUrl() {
        return page.url();
    }

    /** Returns the Playwright page for advanced operations. */
    public Page page() {
        return page;
    }
}
