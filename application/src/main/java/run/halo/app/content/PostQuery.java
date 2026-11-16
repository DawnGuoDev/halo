package run.halo.app.content;

import static org.springdoc.core.fn.builders.parameter.Builder.parameterBuilder;
import static run.halo.app.core.extension.content.Post.PUBLISHED_LABEL;
import static run.halo.app.core.extension.content.Post.PostPhase.PENDING_APPROVAL;
import static run.halo.app.extension.index.query.Queries.*;
import static run.halo.app.extension.router.QueryParamBuildUtil.sortParameter;

import io.swagger.v3.oas.annotations.enums.ParameterIn;
import java.util.Optional;
import org.apache.commons.lang3.StringUtils;
import org.jspecify.annotations.Nullable;
import org.springdoc.core.fn.builders.operation.Builder;
import org.springframework.web.reactive.function.server.ServerRequest;
import org.springframework.web.server.ServerWebInputException;
import run.halo.app.core.extension.content.Post;
import run.halo.app.extension.ListOptions;
import run.halo.app.extension.router.IListRequest;
import run.halo.app.extension.router.SortableRequest;

/**
 * A query object for {@link Post} list.
 *
 * @author guqing
 * @since 2.0.0
 */
public class PostQuery extends SortableRequest {

    private final @Nullable String username;

    private final boolean favoriteSupported;

    public PostQuery(ServerRequest request) {
        this(request, null, true);
    }

    public PostQuery(ServerRequest request, @Nullable String username) {
        this(request, username, false);
    }

    private PostQuery(ServerRequest request, @Nullable String username, boolean favoriteSupported) {
        super(request.exchange());
        this.username = username;
        this.favoriteSupported = favoriteSupported;
    }

    /**
     * Whether the current query is allowed to read and filter personal favorites.
     *
     * <p>Only the console post list supports favorites. Other consumers of {@link PostQuery} must keep the previous
     * behavior and response contract.
     *
     * @return true when favorite state is supported
     */
    public boolean isFavoriteSupported() {
        return favoriteSupported;
    }

    /**
     * Gets the favorite filter of the current user.
     *
     * @return {@code true} for favorited posts, {@code false} for unfavorited posts, or {@code null} when the filter is
     *     absent or unsupported
     * @throws ServerWebInputException when the value is neither {@code true} nor {@code false}
     */
    public @Nullable Boolean getFavorite() {
        if (!favoriteSupported) {
            return null;
        }
        var value = StringUtils.trimToNull(queryParams.getFirst("favorite"));
        if (value == null) {
            return null;
        }
        return switch (value) {
            case "true" -> Boolean.TRUE;
            case "false" -> Boolean.FALSE;
            default ->
                throw new ServerWebInputException(
                        "Invalid value for query parameter 'favorite', expected 'true' or 'false'.");
        };
    }

    public @Nullable String getPublishPhase() {
        return queryParams.getFirst("publishPhase");
    }

    public @Nullable String getCategoryWithChildren() {
        var value = queryParams.getFirst("categoryWithChildren");
        return StringUtils.defaultIfBlank(value, null);
    }

    public @Nullable String getKeyword() {
        return StringUtils.defaultIfBlank(queryParams.getFirst("keyword"), null);
    }

    /**
     * Build a list options from the query object.
     *
     * @return a list options
     */
    @Override
    public ListOptions toListOptions() {
        var builder = ListOptions.builder(super.toListOptions());

        Optional.ofNullable(getKeyword())
                .filter(StringUtils::isNotBlank)
                .ifPresent(keyword -> builder.andQuery(or(
                        contains("status.excerpt", keyword),
                        contains("spec.slug", keyword),
                        contains("spec.title", keyword))));

        Optional.ofNullable(getPublishPhase())
                .filter(StringUtils::isNotBlank)
                .map(Post.PostPhase::from)
                .ifPresent(phase -> {
                    if (PENDING_APPROVAL.equals(phase)) {
                        builder.andQuery(equal("status.phase", phase.name()));
                    }
                    var labelSelector = builder.labelSelector();
                    Optional.of(phase)
                            .filter(Post.PostPhase.PUBLISHED::equals)
                            .ifPresentOrElse(
                                    published -> labelSelector.eq(PUBLISHED_LABEL, Boolean.TRUE.toString()),
                                    () -> labelSelector.notEq(PUBLISHED_LABEL, Boolean.TRUE.toString()));
                });

        Optional.ofNullable(username)
                .filter(StringUtils::isNotBlank)
                .ifPresent(username -> builder.andQuery(equal("spec.owner", username)));

        return builder.build();
    }

    /**
     * Builds the console-specific query parameters, including the personal favorite filter.
     *
     * @param builder operation builder
     */
    public static void buildConsoleParameters(Builder builder) {
        buildParameters(builder);
        builder.parameter(parameterBuilder()
                .in(ParameterIn.QUERY)
                .name("favorite")
                .description("Filter posts by the current user's favorite state. 'true' returns favorited "
                        + "posts, 'false' returns unfavorited posts, and omitting the parameter disables "
                        + "the filter.")
                .implementation(Boolean.class)
                .required(false));
    }

    public static void buildParameters(Builder builder) {
        IListRequest.buildParameters(builder);
        builder.parameter(sortParameter())
                .parameter(parameterBuilder()
                        .in(ParameterIn.QUERY)
                        .name("publishPhase")
                        .description("Filter posts by publish phase. Supported values follow PostPhase, such as DRAFT, "
                                + "PENDING_APPROVAL, PUBLISHED, or FAILED.")
                        .implementation(Post.PostPhase.class)
                        .required(false))
                .parameter(parameterBuilder()
                        .in(ParameterIn.QUERY)
                        .name("keyword")
                        .description("Keyword used to match post title, slug, or excerpt.")
                        .implementation(String.class)
                        .required(false))
                .parameter(parameterBuilder()
                        .in(ParameterIn.QUERY)
                        .name("categoryWithChildren")
                        .description("Category metadata name used to include posts in that category and its child "
                                + "categories.")
                        .implementation(String.class)
                        .required(false));
    }
}
