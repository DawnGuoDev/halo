package run.halo.e2e.pages;

import static com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.options.AriaRole;
import io.qameta.allure.Step;
import java.util.List;
import java.util.regex.Pattern;

/**
 * Console publish calendar page ({@code /console/posts/calendar}).
 *
 * <p>Encapsulates all interactions and assertions for the content publish calendar feature:
 * month/list views, filtering, URL sync, detail drawer, publish-time editing and state feedback.
 * Selectors are derived from the Vue component templates in
 * {@code ui/console-src/modules/contents/posts/calendar/}.
 */
public final class PublishCalendarPage {

    private final Page page;
    private final String baseUrl;

    public PublishCalendarPage(Page page, String baseUrl) {
        this.page = page;
        this.baseUrl = baseUrl;
    }

    // ------------------------------------------------------------------ navigation

    @Step("打开发布日历页面 /console/posts/calendar")
    public PublishCalendarPage open() {
        page.navigate(baseUrl + "/console/posts/calendar");
        page.waitForURL(
                url -> url.contains("/console/posts/calendar"),
                new Page.WaitForURLOptions().setTimeout(30_000));
        return this;
    }

    @Step("等待发布日历页面加载完成")
    public PublishCalendarPage expectLoaded() {
        assertThat(pageTitle()).isVisible();
        // The calendar grid or list table or empty state must be present after load.
        page.waitForCondition(
                () -> calendarGrid().count() > 0
                        || listTable().count() > 0
                        || page.locator(".has-space-m").count() > 0
                        || emptyState().count() > 0,
                new Page.WaitForConditionOptions().setTimeout(15_000));
        return this;
    }

    // ------------------------------------------------------------------ page header

    public Locator pageTitle() {
        return page.getByText("发布日历").first();
    }

    // ------------------------------------------------------------------ view toggle

    @Step("切换到月历视图")
    public PublishCalendarPage switchToCalendarView() {
        calendarViewButton().click();
        assertThat(calendarGrid()).isVisible();
        return this;
    }

    @Step("切换到列表视图")
    public PublishCalendarPage switchToListView() {
        listViewButton().click();
        assertThat(listTable()).isVisible();
        return this;
    }

    public Locator calendarViewButton() {
        return page.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName(Pattern.compile("^月历$")));
    }

    public Locator listViewButton() {
        return page.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName(Pattern.compile("^列表$")));
    }

    // ------------------------------------------------------------------ filters

    @Step("输入关键词筛选：{keyword}")
    public PublishCalendarPage enterKeyword(String keyword) {
        keywordInput().fill(keyword);
        return this;
    }

    @Step("选择分类筛选：{category}")
    public PublishCalendarPage selectCategory(String category) {
        categorySelect().selectOption(category);
        return this;
    }

    @Step("选择状态筛选：{status}")
    public PublishCalendarPage selectStatus(String status) {
        statusSelect().selectOption(status);
        return this;
    }

    @Step("清除所有筛选")
    public PublishCalendarPage clearFilters() {
        clearFiltersButton().click();
        return this;
    }

    public Locator keywordInput() {
        return page.locator("input[type='search']").first();
    }

    public Locator categorySelect() {
        return page.locator("select[aria-label='分类']");
    }

    public Locator statusSelect() {
        return page.locator("select[aria-label='发布状态']");
    }

    public Locator clearFiltersButton() {
        return page.getByRole(
                AriaRole.BUTTON,
                new Page.GetByRoleOptions().setName(Pattern.compile("^清除筛选$")));
    }

    // ------------------------------------------------------------------ refresh

    @Step("点击刷新按钮")
    public PublishCalendarPage refresh() {
        page.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName(Pattern.compile("^刷新$")))
                .click();
        return this;
    }

    // ------------------------------------------------------------------ canManage toggle

    @Step("切换管理权限复选框为 {enabled}")
    public PublishCalendarPage setCanManage(boolean enabled) {
        var checkbox = canManageCheckbox();
        if (checkbox.isChecked() != enabled) {
            checkbox.click();
        }
        return this;
    }

    public Locator canManageCheckbox() {
        return page.locator("input[type='checkbox'].form-checkbox").first();
    }

    // ------------------------------------------------------------------ month navigation

    @Step("点击上个月")
    public PublishCalendarPage previousMonth() {
        page.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName(Pattern.compile("上个月")))
                .click();
        return this;
    }

    @Step("点击下个月")
    public PublishCalendarPage nextMonth() {
        page.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName(Pattern.compile("下个月")))
                .click();
        return this;
    }

    @Step("点击回到本月")
    public PublishCalendarPage backToCurrentMonth() {
        page.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName(Pattern.compile("^回到本月$")))
                .click();
        return this;
    }

    /** Returns the visible month title text, e.g. "2026 年 11 月". */
    public String monthTitleText() {
        return page.locator(".calendar-toolbar h3").textContent();
    }

    // ------------------------------------------------------------------ calendar grid

    public Locator calendarGrid() {
        return page.locator("[role='grid']");
    }

    public Locator weekdayHeaders() {
        return page.locator(".calendar-weekday");
    }

    public List<String> weekdayHeaderTexts() {
        return weekdayHeaders().allTextContents();
    }

    public Locator calendarCells() {
        return page.locator("[role='gridcell']");
    }

    public Locator todayCell() {
        return page.locator(".calendar-cell--today");
    }

    public Locator outsideMonthCells() {
        return page.locator(".calendar-cell--outside");
    }

    public Locator calendarEvents() {
        return page.locator(".calendar-event");
    }

    public Locator moreButton() {
        return page.locator(".calendar-event + button, .text-primary").filter(
                new Locator.FilterOptions().setHasText(Pattern.compile("还有.*篇")));
    }

    // ------------------------------------------------------------------ list view

    public Locator listTable() {
        return page.locator("table");
    }

    public Locator listRows() {
        return page.locator("table tbody tr");
    }

    public int listRowCount() {
        return listRows().count();
    }

    // ------------------------------------------------------------------ detail drawer

    public Locator detailDrawer() {
        return page.locator("[role='dialog']");
    }

    public boolean isDetailDrawerVisible() {
        return detailDrawer().count() > 0 && detailDrawer().isVisible();
    }

    @Step("点击日历中的文章条目：{title}")
    public PublishCalendarPage clickCalendarEvent(String title) {
        page.locator(".calendar-event")
                .filter(new Locator.FilterOptions().setHasText(title))
                .first()
                .click();
        return this;
    }

    @Step("点击第一个日历文章条目")
    public PublishCalendarPage clickFirstCalendarEvent() {
        calendarEvents().first().click();
        return this;
    }

    @Step("点击列表行：{title}")
    public PublishCalendarPage clickListRow(String title) {
        listRows()
                .filter(new Locator.FilterOptions().setHasText(title))
                .first()
                .click();
        return this;
    }

    @Step("点击第一个列表行")
    public PublishCalendarPage clickFirstListRow() {
        listRows().first().click();
        return this;
    }

    @Step("关闭详情抽屉")
    public PublishCalendarPage closeDetailDrawer() {
        page.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName(Pattern.compile("^关闭$")))
                .click();
        return this;
    }

    public Locator detailTitle() {
        return detailDrawer().locator("h3");
    }

    public Locator publishTimeInput() {
        return page.locator("#calendar-publish-time");
    }

    public Locator saveButton() {
        return detailDrawer().getByRole(
                AriaRole.BUTTON, new Page.GetByRoleOptions().setName(Pattern.compile("^保存$")));
    }

    public boolean isSaveButtonVisible() {
        return saveButton().count() > 0;
    }

    public Locator errorMessage() {
        return page.locator("#calendar-publish-time-error");
    }

    public Locator helpText() {
        return page.locator("#calendar-publish-time-help");
    }

    public String readOnlyHelpText() {
        return helpText().textContent();
    }

    @Step("在详情抽屉中填写发布时间：{value}")
    public PublishCalendarPage fillPublishTime(String value) {
        publishTimeInput().fill(value);
        return this;
    }

    @Step("点击保存按钮")
    public PublishCalendarPage clickSave() {
        saveButton().click();
        return this;
    }

    // ------------------------------------------------------------------ toast

    /** Waits for a Toast success message containing the given text. */
    public void expectToast(String text) {
        var toast = page.locator(".halo-toast, [class*='toast']")
                .filter(new Locator.FilterOptions().setHasText(text));
        page.waitForCondition(
                () -> toast.count() > 0,
                new Page.WaitForConditionOptions().setTimeout(10_000));
    }

    // ------------------------------------------------------------------ empty state

    public Locator emptyState() {
        return page.locator(".has-space-m, [class*='empty']").filter(
                new Locator.FilterOptions().setHasText(
                        Pattern.compile("没有符合条件的文章|没有排期|排期加载失败")));
    }

    public boolean isEmptyStateVisible() {
        return emptyState().count() > 0;
    }

    // ------------------------------------------------------------------ URL query

    public String currentUrl() {
        return page.url();
    }

    public boolean urlContains(String fragment) {
        return page.url().contains(fragment);
    }
}
