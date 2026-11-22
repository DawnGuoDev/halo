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

    // ── Density switch ──────────────────────────────────────────────────────

    /** The density radiogroup container rendered by {@code DensitySwitch.vue}. */
    public Locator densitySwitch() {
        return page.locator(
                "[role=radiogroup][aria-label='阅读密度'], [role=radiogroup][aria-label='Reading density']");
    }

    public Locator densityOption(String value) {
        return page.locator("input[name='post-list-density'][value='" + value + "']");
    }

    @Step("等待密度切换控件可见")
    public PostListPage expectDensitySwitchVisible() {
        assertThat(densitySwitch()).isVisible();
        return this;
    }

    /** Checks the checked state of a density radio input. */
    public boolean isDensityChecked(String value) {
        return densityOption(value).isChecked();
    }

    /** Returns {@code true} when the post-list container has the compact modifier class. */
    public boolean isCompactMode() {
        return page.locator(".post-list.post-list--compact").count() > 0;
    }

    /** Returns {@code true} when the post-list container exists without the compact modifier. */
    public boolean isComfortableMode() {
        return page.locator(".post-list:not(.post-list--compact)").count() > 0;
    }

    @Step("切换到 {density} 密度")
    public void switchDensity(String density) {
        densityOption(density).click();
    }

    // ── Search ──────────────────────────────────────────────────────────────

    /** The search input in the post list toolbar (FormKit text input named "keyword"). */
    public Locator searchInput() {
        return page.getByPlaceholder(
                java.util.regex.Pattern.compile(".*(输入关键词搜索|Enter keywords to search).*")).first();
    }

    @Step("在搜索框中输入关键词并回车")
    public void search(String keyword) {
        searchInput().fill(keyword);
        searchInput().press("Enter");
    }

    // ── Checkbox / batch ────────────────────────────────────────────────────

    /** The per-row checkbox for a post whose title contains the given text. */
    public Locator rowCheckbox(String title) {
        return rowWithText(title).locator("input[name='post-checkbox']").first();
    }

    @Step("勾选标题包含 {title} 的文章")
    public void checkPost(String title) {
        rowCheckbox(title).check();
    }

    /** Returns the count of visible post rows in the list container. */
    public int visibleRowCount() {
        return page.locator(".post-list tr.entity-wrapper").count();
    }

    // ── Empty state ─────────────────────────────────────────────────────────

    /** Whether the empty-state message is visible. */
    public boolean isEmptyStateVisible() {
        return page.getByText(
                java.util.regex.Pattern.compile("^(当前没有文章|There are no posts currently.*)$"))
                .count() > 0;
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
