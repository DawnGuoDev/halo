package run.halo.e2e.pages;

import static com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import io.qameta.allure.Step;

/**
 * Confirmation dialog for publish / disable / delete actions
 * ({@code AnnouncementConfirmDialog.vue}).
 *
 * <p>The dialog uses {@code role=alertdialog} and is always rendered (visibility controlled by the
 * {@code visible} prop). Buttons are distinguished by the confirm/cancel class order.
 */
public final class AnnouncementConfirmDialog {

    private final Page page;

    public AnnouncementConfirmDialog(Page page) {
        this.page = page;
    }

    public Locator dialog() {
        return page.locator(".announcement-dialog");
    }

    public boolean isVisible() {
        return dialog().count() > 0 && dialog().isVisible();
    }

    @Step("等待确认弹窗可见")
    public AnnouncementConfirmDialog expectVisible() {
        page.waitForCondition(
                this::isVisible, new Page.WaitForConditionOptions().setTimeout(10_000));
        assertThat(dialog()).isVisible();
        return this;
    }

    @Step("等待确认弹窗消失")
    public AnnouncementConfirmDialog expectGone() {
        page.waitForCondition(
                () -> dialog().count() == 0,
                new Page.WaitForConditionOptions().setTimeout(15_000));
        return this;
    }

    public String title() {
        return dialog().locator("h3").innerText();
    }

    public String description() {
        return dialog().locator("p").innerText();
    }

    @Step("断言弹窗标题为「{expected}」")
    public AnnouncementConfirmDialog expectTitle(String expected) {
        assertThat(dialog().locator("h3")).hasText(expected);
        return this;
    }

    @Step("点击确认按钮")
    public void confirm() {
        dialog().locator(".announcement-dialog__button").last().click();
    }

    @Step("点击取消按钮")
    public void cancel() {
        dialog().locator(".announcement-dialog__button").first().click();
    }
}
