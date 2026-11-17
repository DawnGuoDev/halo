package run.halo.e2e.pages;

import static com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.options.AriaRole;
import io.qameta.allure.Step;

/** Console post list ({@code /console/posts}). */
public final class PostListPage {

    private final Page page;
    private final String baseUrl;

    public PostListPage(Page page, String baseUrl) {
        this.page = page;
        this.baseUrl = baseUrl;
    }

    @Step("打开控制台文章列表 /console/posts")
    public PostListPage open() {
        page.navigate(baseUrl + "/console/posts");
        page.waitForURL(url -> url.contains("/console/posts"), new Page.WaitForURLOptions().setTimeout(30_000));
        return this;
    }

    @Step("点击新建文章")
    public void clickNewPost() {
        // English UI ("New") and Chinese UI ("新建") are both supported. The label also carries a
        // shortcut suffix (e.g. "新建 (N)"), so match it, but never the surrounding wrapper element.
        page.getByRole(
                        AriaRole.BUTTON,
                        new Page.GetByRoleOptions()
                                .setName(java.util.regex.Pattern.compile("^(New|新建)(\\s*\\(.*\\))?$"))
                                .setExact(false))
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
        page.getByRole(
                        AriaRole.BUTTON,
                        new Page.GetByRoleOptions().setName(java.util.regex.Pattern.compile("^(Publish|发布)$")))
                .first()
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

    /** Bounded wait for a row (the list is refetched right after publishing). */
    @Step("等待文章 {text} 出现在列表")
    public void expectRowWithText(String text) {
        page.waitForCondition(
                () -> hasRowWithText(text), new Page.WaitForConditionOptions().setTimeout(30_000));
        assertThat(rowWithText(text)).isAttached();
    }

    public String titleValue() {
        return titleInput().inputValue();
    }

    /**
     * Title input of the default editor. It is matched by the i18n placeholder from
     * {@code core.components.default_editor.title_placeholder} ("请输入标题" / "Title"), avoiding
     * the sidebar search box which is the first placeholder input on the page.
     */
    public Locator titleInput() {
        return page.getByPlaceholder(java.util.regex.Pattern.compile(".*(Title|请输入标题).*")).first();
    }
}
