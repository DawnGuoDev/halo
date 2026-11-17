package run.halo.e2e.frontend.pages;

import static com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.options.AriaRole;
import com.microsoft.playwright.options.WaitUntilState;
import io.qameta.allure.Step;
import java.util.regex.Pattern;

/** Console post list: create entry point and published status verification. */
public class PostListPage {

    private final Page page;

    public PostListPage(Page page) {
        this.page = page;
    }

    @Step("Open /console/posts")
    public PostListPage open() {
        page.navigate(
                LoginPage.originOf(page) + "/console/posts",
                new Page.NavigateOptions().setWaitUntil(WaitUntilState.DOMCONTENTLOADED));
        page.waitForURL(Pattern.compile(".*/console/posts.*"), new Page.WaitForURLOptions().setTimeout(30_000));
        return this;
    }

    @Step("Open the new post editor")
    public void clickNewPost() {
        // Label from core.common.buttons.new ("New" / "新建"); no CSS class or DOM structure is used.
        Locator newButton = page.getByRole(
                AriaRole.BUTTON,
                new Page.GetByRoleOptions()
                        .setName(Pattern.compile("^(New|新建)$"))
                        .setExact(true));
        assertThat(newButton).isVisible(new com.microsoft.playwright.assertions.LocatorAssertions.IsVisibleOptions().setTimeout(30_000));
        newButton.click();
        page.waitForURL(
                Pattern.compile(".*/console/posts/editor.*"), new Page.WaitForURLOptions().setTimeout(30_000));
    }

    @Step("Assert post {title} appears in the list as published")
    public void assertPublished(String title) {
        Locator titleLink = page.getByRole(AriaRole.LINK, new Page.GetByRoleOptions().setName(title));
        Locator titleText = page.getByText(title, new Page.GetByTextOptions().setExact(true));
        Locator target = titleLink.count() > 0 ? titleLink.first() : titleText.first();
        assertThat(target).isVisible(new com.microsoft.playwright.assertions.LocatorAssertions.IsVisibleOptions().setTimeout(60_000));

        Locator row = page.locator("li, tr, article, [role=row], [role=listitem]")
                .filter(new Locator.FilterOptions().setHasText(title))
                .first();
        Locator status = row.getByText(Pattern.compile("^(Published|已发布)$"));
        assertThat(status).isVisible(new com.microsoft.playwright.assertions.LocatorAssertions.IsVisibleOptions().setTimeout(60_000));
    }
}
