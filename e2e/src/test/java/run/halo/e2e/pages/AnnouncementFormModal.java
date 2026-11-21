package run.halo.e2e.pages;

import static com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat;

import com.microsoft.playwright.Page;
import io.qameta.allure.Step;

/**
 * New/edit announcement modal ({@code AnnouncementFormModal.vue}).
 *
 * <p>The modal is mounted via {@code v-if}; once visible, the form fields use stable ids and class
 * hooks. Real-time preview and validation error elements are addressed via the enclosing field
 * container with Playwright's {@code :has()} pseudo-class.
 */
public final class AnnouncementFormModal {

    private final Page page;

    public AnnouncementFormModal(Page page) {
        this.page = page;
    }

    public com.microsoft.playwright.Locator modal() {
        return page.locator(".announcement-form-modal");
    }

    @Step("等待新建/编辑公告弹窗可见")
    public AnnouncementFormModal expectVisible() {
        page.waitForCondition(
                () -> modal().count() > 0,
                new Page.WaitForConditionOptions().setTimeout(10_000));
        assertThat(modal()).isVisible();
        return this;
    }

    @Step("等待弹窗消失")
    public AnnouncementFormModal expectGone() {
        page.waitForCondition(
                () -> modal().count() == 0,
                new Page.WaitForConditionOptions().setTimeout(10_000));
        return this;
    }

    @Step("填写标题：{title}")
    public AnnouncementFormModal fillTitle(String title) {
        page.locator("#announcement-title").fill(title);
        return this;
    }

    @Step("填写正文：{content}")
    public AnnouncementFormModal fillContent(String content) {
        page.locator("#announcement-content").fill(content);
        return this;
    }

    @Step("选择展示位置：{positionLabel}")
    public AnnouncementFormModal selectPosition(String positionLabel) {
        page.locator(".announcement-form__position")
                .filter(new com.microsoft.playwright.Locator.FilterOptions()
                        .setHasText(positionLabel))
                .click();
        return this;
    }

    @Step("点击「使用推荐时间」链接")
    public AnnouncementFormModal useDefaultTimes() {
        page.locator(".announcement-form__link").click();
        return this;
    }

    @Step("填写开始时间：{startTime}")
    public AnnouncementFormModal fillStartTime(String startTime) {
        page.locator("#announcement-start").fill(startTime);
        return this;
    }

    @Step("填写结束时间：{endTime}")
    public AnnouncementFormModal fillEndTime(String endTime) {
        page.locator("#announcement-end").fill(endTime);
        return this;
    }

    @Step("清空标题字段")
    public AnnouncementFormModal clearTitle() {
        page.locator("#announcement-title").fill("");
        return this;
    }

    @Step("清空正文字段")
    public AnnouncementFormModal clearContent() {
        page.locator("#announcement-content").fill("");
        return this;
    }

    @Step("清空开始时间字段")
    public AnnouncementFormModal clearStartTime() {
        page.locator("#announcement-start").fill("");
        return this;
    }

    @Step("清空结束时间字段")
    public AnnouncementFormModal clearEndTime() {
        page.locator("#announcement-end").fill("");
        return this;
    }

    @Step("触发标题字段失焦校验")
    public AnnouncementFormModal blurTitle() {
        page.locator("#announcement-title").blur();
        return this;
    }

    @Step("触发正文字段失焦校验")
    public AnnouncementFormModal blurContent() {
        page.locator("#announcement-content").blur();
        return this;
    }

    @Step("触发开始时间字段失焦校验")
    public AnnouncementFormModal blurStartTime() {
        page.locator("#announcement-start").blur();
        return this;
    }

    @Step("触发结束时间字段失焦校验")
    public AnnouncementFormModal blurEndTime() {
        page.locator("#announcement-end").blur();
        return this;
    }

    @Step("点击保存按钮")
    public void clickSave() {
        page.locator(".announcement-form-modal__button--primary").click();
    }

    @Step("点击取消按钮")
    public void clickCancel() {
        page.locator(".announcement-form-modal__button").first().click();
    }

    // ---------- validation ----------

    /**
     * Error elements live inside the same {@code .announcement-form__field} container as the
     * input. Playwright's {@code :has()} pseudo-class scopes the search to the right field.
     */
    private com.microsoft.playwright.Locator titleErrorLocator() {
        return page.locator(".announcement-form__field:has(#announcement-title) .announcement-form__error");
    }

    private com.microsoft.playwright.Locator contentErrorLocator() {
        return page.locator(".announcement-form__field:has(#announcement-content) .announcement-form__error");
    }

    private com.microsoft.playwright.Locator positionErrorLocator() {
        return page.locator(".announcement-form__field:has(.announcement-form__positions) .announcement-form__error");
    }

    private com.microsoft.playwright.Locator startTimeErrorLocator() {
        return page.locator(".announcement-form__field:has(#announcement-start) .announcement-form__error");
    }

    private com.microsoft.playwright.Locator endTimeErrorLocator() {
        return page.locator(".announcement-form__field:has(#announcement-end) .announcement-form__error");
    }

    public boolean hasTitleError() {
        return titleErrorLocator().count() > 0;
    }

    public String titleError() {
        return titleErrorLocator().innerText();
    }

    public boolean hasContentError() {
        return contentErrorLocator().count() > 0;
    }

    public boolean hasPositionError() {
        return positionErrorLocator().count() > 0;
    }

    public boolean hasStartTimeError() {
        return startTimeErrorLocator().count() > 0;
    }

    public boolean hasEndTimeError() {
        return endTimeErrorLocator().count() > 0;
    }

    public String endTimeError() {
        return endTimeErrorLocator().innerText();
    }

    @Step("断言标题必填错误可见")
    public AnnouncementFormModal expectTitleError() {
        page.waitForCondition(
                this::hasTitleError, new Page.WaitForConditionOptions().setTimeout(5_000));
        return this;
    }

    @Step("断言正文必填错误可见")
    public AnnouncementFormModal expectContentError() {
        page.waitForCondition(
                this::hasContentError, new Page.WaitForConditionOptions().setTimeout(5_000));
        return this;
    }

    @Step("断言展示位置必填错误可见")
    public AnnouncementFormModal expectPositionError() {
        page.waitForCondition(
                this::hasPositionError, new Page.WaitForConditionOptions().setTimeout(5_000));
        return this;
    }

    @Step("断言开始时间必填错误可见")
    public AnnouncementFormModal expectStartTimeError() {
        page.waitForCondition(
                this::hasStartTimeError, new Page.WaitForConditionOptions().setTimeout(5_000));
        return this;
    }

    @Step("断言结束时间必填错误可见")
    public AnnouncementFormModal expectEndTimeError() {
        page.waitForCondition(
                this::hasEndTimeError, new Page.WaitForConditionOptions().setTimeout(5_000));
        return this;
    }

    @Step("断言弹窗仍然可见（未提交）")
    public AnnouncementFormModal expectStillOpen() {
        assertThat(modal()).isVisible();
        return this;
    }

    @Step("断言编辑公告弹窗标题回填为「{title}」")
    public AnnouncementFormModal expectTitleValue(String title) {
        assertThat(page.locator("#announcement-title")).hasValue(title);
        return this;
    }

    @Step("断言编辑公告弹窗正文回填为「{content}」")
    public AnnouncementFormModal expectContentValue(String content) {
        assertThat(page.locator("#announcement-content")).hasValue(content);
        return this;
    }
}
