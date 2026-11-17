package run.halo.e2e.frontend.pages;

import static com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.options.AriaRole;
import io.qameta.allure.Step;
import java.util.regex.Pattern;

/**
 * Post editor page. Selectors rely on the default editor placeholders and
 * accessible button names only ({@code core.components.default_editor.*} and
 * {@code core.common.buttons.publish}).
 */
public class PostEditorPage {

    private final Page page;

    public PostEditorPage(Page page) {
        this.page = page;
    }

    @Step("Fill title and body of the new post")
    public void fill(String title, String body) {
        // The default editor is lazily initialised by Vue and then renders its title input.
        Locator titleInput = page.getByPlaceholder(Pattern.compile("^(Please enter the title|请输入标题)$")).first();
        titleInput.waitFor(new Locator.WaitForOptions()
                .setState(com.microsoft.playwright.options.WaitForSelectorState.VISIBLE)
                .setTimeout(60_000));
        assertThat(titleInput).isVisible(new com.microsoft.playwright.assertions.LocatorAssertions.IsVisibleOptions().setTimeout(30_000));
        titleInput.fill(title);

        Locator editable = page.locator("[contenteditable=true]").first();
        assertThat(editable).isVisible(new com.microsoft.playwright.assertions.LocatorAssertions.IsVisibleOptions().setTimeout(30_000));
        editable.click();
        editable.pressSequentially(body, new Locator.PressSequentiallyOptions().setDelay(5));
    }

    @Step("Publish the new post")
    public void publish() {
        Locator headerPublish = publishButton(page.locator("body"));
        assertThat(headerPublish.first()).isVisible(new com.microsoft.playwright.assertions.LocatorAssertions.IsVisibleOptions().setTimeout(30_000));
        headerPublish.first().click();

        // New posts open the settings modal, where publishing must be confirmed.
        Locator dialog = page.getByRole(AriaRole.DIALOG).first();
        if (dialog.isVisible()) {
            Locator modalPublish = publishButton(dialog).first();
            assertThat(modalPublish).isVisible(new com.microsoft.playwright.assertions.LocatorAssertions.IsVisibleOptions().setTimeout(20_000));
            modalPublish.click();
        }

        page.waitForURL(
                Pattern.compile(".*/console/posts(\\?.*)?$"), new Page.WaitForURLOptions().setTimeout(60_000));
    }

    @Step("Save the draft without publishing")
    public void saveDraft() {
        Locator saveButton = page.getByRole(
                AriaRole.BUTTON,
                new Page.GetByRoleOptions()
                        .setName(Pattern.compile("^(Save|保存)$"))
                        .setExact(true));
        assertThat(saveButton).isVisible(new com.microsoft.playwright.assertions.LocatorAssertions.IsVisibleOptions().setTimeout(20_000));
        saveButton.click();
    }

    private static Locator publishButton(Locator scope) {
        return scope.getByRole(
                AriaRole.BUTTON,
                new Locator.GetByRoleOptions()
                        .setName(Pattern.compile("^(Publish|发布)$"))
                        .setExact(true));
    }

}
