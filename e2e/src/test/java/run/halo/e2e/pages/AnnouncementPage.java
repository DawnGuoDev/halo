package run.halo.e2e.pages;

import static com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.options.AriaRole;
import io.qameta.allure.Step;
import java.util.regex.Pattern;

/**
 * Console announcement management page ({@code /console/announcements}).
 *
 * <p>Selectors follow the Vue templates in {@code ui/console-src/announcement/}. The page uses
 * in-memory mock data that resets on navigation; each {@link #open()} call reloads the initial
 * dataset.
 */
public final class AnnouncementPage {

    private final Page page;
    private final String baseUrl;

    public AnnouncementPage(Page page, String baseUrl) {
        this.page = page;
        this.baseUrl = baseUrl;
    }

    @Step("打开控制台公告管理页 /console/announcements")
    public AnnouncementPage open() {
        page.navigate(baseUrl + "/console/announcements");
        page.waitForURL(
                url -> url.contains("/console/announcements"),
                new Page.WaitForURLOptions().setTimeout(30_000));
        waitForTableReady();
        return this;
    }

    @Step("等待公告表格加载完成")
    public AnnouncementPage waitForTableReady() {
        // The table renders after the mock store load (260ms delay). Wait for either the table
        // body or the empty state to be visible.
        page.waitForCondition(
                () -> tableBody().count() > 0 || emptyState().count() > 0,
                new Page.WaitForConditionOptions().setTimeout(15_000));
        return this;
    }

    @Step("点击新建公告")
    public void clickNewAnnouncement() {
        page.getByRole(
                        AriaRole.BUTTON,
                        new Page.GetByRoleOptions()
                                .setName(Pattern.compile("^(新建公告)$")))
                .first()
                .click();
    }

    @Step("点击刷新按钮")
    public void clickRefresh() {
        page.getByRole(
                        AriaRole.BUTTON,
                        new Page.GetByRoleOptions().setName(Pattern.compile("^(刷新)$")))
                .first()
                .click();
    }

    // ---------- filters ----------

    @Step("输入搜索关键词：{keyword}")
    public AnnouncementPage searchByKeyword(String keyword) {
        searchInput().fill(keyword);
        // Wait for the filtered list to settle (watch triggers fetchList).
        page.waitForCondition(
                () -> !isLoading(),
                new Page.WaitForConditionOptions().setTimeout(10_000));
        return this;
    }

    @Step("清空搜索关键词")
    public AnnouncementPage clearKeyword() {
        searchInput().fill("");
        page.waitForCondition(
                () -> !isLoading(),
                new Page.WaitForConditionOptions().setTimeout(10_000));
        return this;
    }

    @Step("选择展示位置筛选：{positionLabel}")
    public AnnouncementPage selectPositionFilter(String positionLabel) {
        positionSelect().selectOption(positionLabel);
        page.waitForCondition(
                () -> !isLoading(),
                new Page.WaitForConditionOptions().setTimeout(10_000));
        return this;
    }

    @Step("选择状态筛选：{statusLabel}")
    public AnnouncementPage selectStatusFilter(String statusLabel) {
        statusSelect().selectOption(statusLabel);
        page.waitForCondition(
                () -> !isLoading(),
                new Page.WaitForConditionOptions().setTimeout(10_000));
        return this;
    }

    @Step("重置筛选条件")
    public AnnouncementPage resetFilters() {
        var reset = page.locator(".announcement-page__reset");
        if (reset.count() > 0) {
            reset.click();
            page.waitForCondition(
                    () -> !isLoading(),
                    new Page.WaitForConditionOptions().setTimeout(10_000));
        }
        return this;
    }

    @Step("将位置筛选设为全部位置")
    public AnnouncementPage clearPositionFilter() {
        positionSelect().selectOption("全部位置");
        page.waitForCondition(
                () -> !isLoading(),
                new Page.WaitForConditionOptions().setTimeout(10_000));
        return this;
    }

    @Step("将状态筛选设为全部状态")
    public AnnouncementPage clearStatusFilter() {
        statusSelect().selectOption("全部状态");
        page.waitForCondition(
                () -> !isLoading(),
                new Page.WaitForConditionOptions().setTimeout(10_000));
        return this;
    }

    // ---------- row queries ----------

    @Step("查找标题包含「{text}」的行")
    public Locator rowWithTitle(String text) {
        return tableBody()
                .locator("tr")
                .filter(new Locator.FilterOptions().setHasText(text))
                .first();
    }

    public boolean hasRowWithTitle(String text) {
        return tableBody()
                        .locator("tr")
                        .filter(new Locator.FilterOptions().setHasText(text))
                        .count()
                > 0;
    }

    @Step("等待标题包含「{text}」的行出现")
    public AnnouncementPage expectRowWithTitle(String text) {
        page.waitForCondition(
                () -> hasRowWithTitle(text),
                new Page.WaitForConditionOptions().setTimeout(15_000));
        return this;
    }

    @Step("等待标题包含「{text}」的行消失")
    public AnnouncementPage expectRowGone(String text) {
        page.waitForCondition(
                () -> !hasRowWithTitle(text),
                new Page.WaitForConditionOptions().setTimeout(15_000));
        return this;
    }

    public int visibleRowCount() {
        return tableBody().locator("tr").count();
    }

    // ---------- row actions ----------

    @Step("点击行内标题「{text}」打开详情")
    public void clickTitle(String text) {
        var row = rowWithTitle(text);
        assertThat(row).isAttached();
        row.locator(".announcement-page__title-link").click();
    }

    @Step("在行「{text}」上点击发布")
    public void clickPublishOnRow(String text) {
        actionButtonInRow(text, "发布").click();
    }

    @Step("在行「{text}」上点击停用")
    public void clickDisableOnRow(String text) {
        actionButtonInRow(text, "停用").click();
    }

    @Step("在行「{text}」上点击编辑")
    public void clickEditOnRow(String text) {
        actionButtonInRow(text, "编辑").click();
    }

    @Step("在行「{text}」上点击删除")
    public void clickDeleteOnRow(String text) {
        actionButtonInRow(text, "删除").click();
    }

    @Step("断言行「{text}」的编辑按钮已禁用")
    public AnnouncementPage expectEditDisabledOnRow(String text) {
        var btn = actionButtonInRow(text, "编辑");
        assertThat(btn).isDisabled();
        return this;
    }

    @Step("断言行「{text}」的状态标签为「{statusLabel}」")
    public AnnouncementPage expectRowStatus(String text, String statusLabel) {
        var row = rowWithTitle(text);
        assertThat(row.locator(".announcement-page__status")).hasText(statusLabel);
        return this;
    }

    @Step("断言行「{text}」有被覆盖标记")
    public AnnouncementPage expectRowShadowed(String text) {
        var row = rowWithTitle(text);
        assertThat(row.locator(".announcement-page__shadow-tag")).isVisible();
        return this;
    }

    // ---------- active schedule section ----------

    public Locator activeCard(String positionLabel) {
        return page.locator(".announcement-page__active-card")
                .filter(new Locator.FilterOptions().setHasText(positionLabel));
    }

    public String activeTitle(String positionLabel) {
        var card = activeCard(positionLabel);
        if (card.locator(".announcement-page__active-title").count() > 0) {
            return card.locator(".announcement-page__active-title").innerText();
        }
        return "";
    }

    // ---------- toast ----------

    @Step("等待 Toast 出现并包含「{expectedText}」")
    public String waitForToast(String expectedText) {
        page.waitForCondition(
                () -> {
                    var toast = page.locator(".announcement-toast");
                    if (toast.count() == 0) return false;
                    return toast.innerText().contains(expectedText);
                },
                new Page.WaitForConditionOptions().setTimeout(15_000));
        return page.locator(".announcement-toast").innerText();
    }

    @Step("等待 Toast 消失")
    public AnnouncementPage waitForToastGone() {
        page.waitForCondition(
                () -> page.locator(".announcement-toast").count() == 0,
                new Page.WaitForConditionOptions().setTimeout(15_000));
        return this;
    }

    // ---------- state checks ----------

    public boolean isLoading() {
        return page.locator(".announcement-page__table-wrap .v-loading").count() > 0;
    }

    public boolean isEmptyStateVisible() {
        return page.locator(".announcement-page__empty").count() > 0;
    }

    public Locator emptyState() {
        return page.locator(".announcement-page__empty");
    }

    public Locator tableBody() {
        return page.locator(".announcement-page__table tbody");
    }

    public Locator searchInput() {
        return page.locator(".announcement-page__search input[type=\"search\"]");
    }

    public Locator positionSelect() {
        return page.locator(".announcement-page__select select").first();
    }

    public Locator statusSelect() {
        return page.locator(".announcement-page__select select").nth(1);
    }

    public Page page() {
        return page;
    }

    private Locator actionButtonInRow(String rowText, String buttonText) {
        var row = rowWithTitle(rowText);
        return row.locator(".announcement-page__action").filter(
                new Locator.FilterOptions().setHasText(buttonText));
    }
}
