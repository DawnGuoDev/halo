package run.halo.app.content;

import java.util.Collection;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

/**
 * Personal favorite service for posts.
 *
 * <p>All operations are scoped to the given user {@code metadata.name}. The caller is responsible for taking the
 * username from the authenticated subject.
 *
 * @since 2.28.0
 */
public interface PostFavoriteService {

    /**
     * Marks the post as favorited by the user. The operation is idempotent.
     *
     * @param username user {@code metadata.name}
     * @param postName post {@code metadata.name}
     * @return completion signal
     */
    Mono<Void> favorite(String username, String postName);

    /**
     * Removes the favorite relation of the user and the post. The operation is idempotent.
     *
     * @param username user {@code metadata.name}
     * @param postName post {@code metadata.name}
     * @return completion signal
     */
    Mono<Void> unfavorite(String username, String postName);

    /**
     * Lists all favorited post names of the user.
     *
     * @param username user {@code metadata.name}
     * @return favorited post names
     */
    Flux<String> listFavoritePostNames(String username);

    /**
     * Lists favorited post names of the user restricted to the given post names.
     *
     * @param username user {@code metadata.name}
     * @param postNames candidate post names
     * @return favorited post names among the candidates
     */
    Flux<String> listFavoritePostNames(String username, Collection<String> postNames);
}
