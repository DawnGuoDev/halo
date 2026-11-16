package run.halo.app.core.extension.content;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.ToString;
import org.jspecify.annotations.Nullable;
import run.halo.app.extension.AbstractExtension;
import run.halo.app.extension.GVK;
import run.halo.app.extension.GroupVersionKind;

/**
 * Personal favorite relation between a user and a post.
 *
 * <p>The relation is keyed by the user {@code metadata.name} and the post {@code metadata.name}. It is intentionally
 * stored outside of {@link Post} so that favorites stay private to the owner and never leak into theme rendering or
 * other users' views.
 *
 * @since 2.28.0
 */
@Data
@Schema(name = "PostFavorite")
@ToString(callSuper = true)
@GVK(
        group = Constant.GROUP,
        version = Constant.VERSION,
        kind = PostFavorite.KIND,
        plural = "postfavorites",
        singular = "postfavorite")
@EqualsAndHashCode(callSuper = true)
public class PostFavorite extends AbstractExtension {

    public static final String KIND = "PostFavorite";

    public static final GroupVersionKind GVK = GroupVersionKind.fromExtension(PostFavorite.class);

    public static final String USERNAME_INDEX = "spec.username";

    public static final String POST_NAME_INDEX = "spec.postName";

    /** Desired state of the favorite relation. */
    @Schema(requiredMode = REQUIRED)
    @Nullable
    private PostFavoriteSpec spec;

    /** Owner and favorite target of this relation. */
    @Data
    public static class PostFavoriteSpec {

        /** {@code metadata.name} of the user who owns the favorite. */
        @Schema(requiredMode = REQUIRED, minLength = 1)
        private String username;

        /** {@code metadata.name} of the favorited post. */
        @Schema(requiredMode = REQUIRED, minLength = 1)
        private String postName;
    }
}
