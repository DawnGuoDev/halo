package run.halo.app.content.impl;

import static java.nio.charset.StandardCharsets.UTF_8;
import static run.halo.app.extension.index.query.Queries.equal;
import static run.halo.app.extension.index.query.Queries.in;

import com.google.common.hash.Hashing;
import java.util.Collection;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Component;
import org.springframework.util.CollectionUtils;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import run.halo.app.content.PostFavoriteService;
import run.halo.app.core.extension.content.Post;
import run.halo.app.core.extension.content.PostFavorite;
import run.halo.app.extension.ListOptions;
import run.halo.app.extension.Metadata;
import run.halo.app.extension.ReactiveExtensionClient;
import run.halo.app.infra.exception.DuplicateNameException;
import run.halo.app.infra.exception.NotFoundException;

/**
 * Default implementation of {@link PostFavoriteService}.
 *
 * @since 2.28.0
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PostFavoriteServiceImpl implements PostFavoriteService {

    static final String NAME_PREFIX = "postfavorite-";

    private final ReactiveExtensionClient client;

    @Override
    public Mono<Void> favorite(String username, String postName) {
        return assertPostFavoriteable(postName)
                .then(Mono.defer(() -> client.create(newFavorite(username, postName))))
                .onErrorResume(DuplicateNameException.class, e -> Mono.empty())
                .doOnError(e ->
                        log.warn("Failed to favorite post [{}] for user [{}]: {}", postName, username, e.getMessage()))
                .then();
    }

    @Override
    public Mono<Void> unfavorite(String username, String postName) {
        return assertPostFavoriteable(postName)
                .flatMap(post -> client.fetch(PostFavorite.class, nameOf(username, postName)))
                .flatMap(client::delete)
                .doOnError(e -> log.warn(
                        "Failed to unfavorite post [{}] for user [{}]: {}", postName, username, e.getMessage()))
                .then();
    }

    @Override
    public Flux<String> listFavoritePostNames(String username) {
        var listOptions = ListOptions.builder()
                .andQuery(equal(PostFavorite.USERNAME_INDEX, username))
                .build();
        return client.listAll(PostFavorite.class, listOptions, Sort.unsorted())
                .map(favorite -> favorite.getSpec().getPostName());
    }

    @Override
    public Flux<String> listFavoritePostNames(String username, Collection<String> postNames) {
        if (CollectionUtils.isEmpty(postNames)) {
            return Flux.empty();
        }
        var listOptions = ListOptions.builder()
                .andQuery(equal(PostFavorite.USERNAME_INDEX, username))
                .andQuery(in(PostFavorite.POST_NAME_INDEX, postNames))
                .build();
        return client.listAll(PostFavorite.class, listOptions, Sort.unsorted())
                .map(favorite -> favorite.getSpec().getPostName());
    }

    private Mono<Post> assertPostFavoriteable(String postName) {
        var notFound = Mono.<Post>error(() -> new NotFoundException("The post was not found or deleted."));
        return client.fetch(Post.class, postName)
                .switchIfEmpty(notFound)
                .filter(post -> !post.isDeleted())
                .switchIfEmpty(notFound);
    }

    private static PostFavorite newFavorite(String username, String postName) {
        var favorite = new PostFavorite();
        var metadata = new Metadata();
        metadata.setName(nameOf(username, postName));
        favorite.setMetadata(metadata);
        var spec = new PostFavorite.PostFavoriteSpec();
        spec.setUsername(username);
        spec.setPostName(postName);
        favorite.setSpec(spec);
        return favorite;
    }

    /** Builds a deterministic and metadata-name-safe identifier for the unique (user, post) relation. */
    static String nameOf(String username, String postName) {
        var digest = Hashing.sha256()
                .hashString(StringUtils.defaultString(username) + '\u0000' + StringUtils.defaultString(postName), UTF_8)
                .toString();
        return NAME_PREFIX + digest;
    }
}
