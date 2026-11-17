package run.halo.e2e.pages;

import static com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.options.AriaRole;
import io.qameta.allure.Step;

/** Console post list ({@code /console/posts}). */
public final class PostListPage {

    private final Page page;

    public PostListPage(Page page) {
        this.page = page;
    }

    @Step("打开控制台文章列表 /console/posts")
    public PostListPage open() {
        page.navigate("/console/posts");
        page.waitForURL(url -> url.contains("/console/posts"), new Page.WaitForURLOptions().setTimeout(30_000));
        return this;
    }

    @Step("点击新建文章")
    public void clickNewPost() {
        page.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName("新建"))
                .first()
                .click();
    }

    /** Waits until the editor URL and new-post form are rendered. */
    @Step("等待文章编辑器就绪")
    public void expectEditorLoaded() {
        page.waitForURL(url -> url.contains("/console/posts/editor"), new Page.WaitForURLOptions().setTimeout(30_000));
        assertThat(titleInput()).isVisible();
    }

    @Step("在编辑器中填写标题与正文")
    public void fillEditor(String title, String body) {
        titleInput().fill(title);
        var richText = page.locator(".tiptap.ProseMirror, [contenteditable=true]").first();
        richText.click();
        richText.fill(body);
    }

    @Step("点击编辑器顶部发布按钮")
    public void clickPublish() {
        page.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName("发布"))
                .first()
                .click();
    }

    /** Looks up a row in the post list by its visible title. */
    public Locator rowWithText(String text) {
        return page.locator("tr, li, a").filter(new Locator.FilterOptions().setHasText(text)).first();
    }

    public boolean hasRowWithText(String text) {
        return page.locator("tr, li, a")
                        .filter(new Locator.FilterOptions().setHasText(text))
                        .count()
                > 0;
    }

    public String titleValue() {
        return titleInput().inputValue();
    }

    public Locator titleInput() {
        return page.locator("input[type=text][placeholder], input[placeholder]").first();
    }
}
