package run.halo.e2e.pages;

import static com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import io.qameta.allure.Step;

/**
 * Announcement detail drawer ({@code AnnouncementDetailDrawer.vue}).
 *
 * <p>The drawer is mounted via {@code v-if} on {@code detailLive}; once visible, field labels and
 * footer action buttons are addressed by class hooks.
 */
public final class AnnouncementDetailDrawer {

    private final Page page;

    public AnnouncementDetailDrawer(Page page) {
        this.page = page;
    }

    public Locator drawer() {
        return page.locator(".announcement-detail");
    }

    @Step("等待公告详情抽屉可见")
    public AnnouncementDetailDrawer expectVisible() {
        page.waitForCondition(
                () -> drawer().count() > 0,
                new Page.WaitForConditionOptions().setTimeout(10_000));
        assertThat(drawer()).isVisible();
        return this;
    }

    @Step("等待公告详情抽屉关闭")
    public AnnouncementDetailDrawer expectGone() {
        page.waitForCondition(
                () -> drawer().count() == 0,
                new Page.WaitForConditionOptions().setTimeout(10_000));
        return this;
    }

    public String title() {
        return drawer().locator(".announcement-detail__title-row h3").innerText();
    }

    public String statusTag() {
        return drawer().locator(".announcement-detail__title-row .v-tag").innerText();
    }

    @Step("断言详情抽屉标题为「{expected}」")
    public AnnouncementDetailDrawer expectTitle(String expected) {
        assertThat(drawer().locator(".announcement-detail__title-row h3")).hasText(expected);
        return this;
    }

    @Step("断言详情抽屉状态标签为「{expected}」")
    public AnnouncementDetailDrawer expectStatusTag(String expected) {
        assertThat(drawer().locator(".announcement-detail__title-row .v-tag")).hasText(expected);
        return this;
    }

    // ---------- footer actions ----------

    @Step("在详情抽屉点击发布")
    public void clickPublish() {
        footerButton("发布").click();
    }

    @Step("在详情抽屉点击停用")
    public void clickDisable() {
        footerButton("停用").click();
    }

    @Step("在详情抽屉点击编辑")
    public void clickEdit() {
        footerButton("编辑").click();
    }

    @Step("在详情抽屉点击删除")
    public void clickDelete() {
        footerButton("删除").click();
    }

    @Step("关闭详情抽屉")
    public void close() {
        drawer().locator(".announcement-detail__close").click();
    }

    public boolean hasPublishButton() {
        return drawer().locator(".announcement-detail__button--primary").count() > 0;
    }

    public boolean hasDisableButton() {
        return footerButton("停用").count() > 0;
    }

    public boolean hasEditButton() {
        return footerButton("编辑").count() > 0;
    }

    public boolean hasDeleteButton() {
        return footerButton("删除").count() > 0;
    }

    private Locator footerButton(String text) {
        return drawer()
                .locator(".announcement-detail__footer .announcement-detail__button")
                .filter(new Locator.FilterOptions().setHasText(text));
    }
}
