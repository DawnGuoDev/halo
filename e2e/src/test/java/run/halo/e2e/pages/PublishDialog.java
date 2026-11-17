package run.halo.e2e.pages;

import static com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.options.AriaRole;
import io.qameta.allure.Step;

/**
 * Publish settings dialog shown when a brand-new post is published. Only documents with at least
 * one allowed publish action render the dialog; both branches are handled by the test.
 */
public final class PublishDialog {

    private final Page page;

    public PublishDialog(Page page) {
        this.page = page;
    }

    public boolean isVisible() {
        return page.getByRole(AriaRole.DIALOG).isVisible();
    }

    @Step("在发布设置弹窗中确认发布")
    public void confirmPublish() {
        var dialog = page.getByRole(AriaRole.DIALOG);
        assertThat(dialog).isVisible();
        dialog.getByRole(AriaRole.BUTTON, new Locator.GetByRoleOptions().setName("发布"))
                .last()
                .click();
    }

    public Page page() {
        return page;
    }
}
