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

    /**
     * The settings modal shows up for every new post. In this environment Playwright's
     * actionability check reports the VModal wrapper as hidden, so the decision is based on the
     * rendered settings content (title "文章设置" and footer actions).
     */
    public boolean isVisible() {
        var dialog = page.locator("[role=dialog]");
        return dialog.count() > 0
                && dialog.getByText(java.util.regex.Pattern.compile("^(文章设置|Post settings)$")).count() > 0;
    }

    @Step("在发布设置弹窗中确认发布")
    public void confirmPublish() {
        // Footer publish action of the settings dialog (the header action sits outside it).
        // getByRole excludes the modal because of the outer focus trap, so the exact label is used
        // with a forced click; the post list URL afterwards confirms the action succeeded.
        var publish = page.locator("[role=dialog]")
                .getByText(java.util.regex.Pattern.compile("^(发布|Publish)$"));
        assertThat(publish.last()).isAttached();
        publish.last().click(new Locator.ClickOptions().setForce(true));
        page.waitForURL(url -> url.contains("/console/posts") && !url.contains("/editor"),
                new Page.WaitForURLOptions().setTimeout(60_000));
    }

    public Page page() {
        return page;
    }
}
