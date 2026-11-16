package run.halo.app.content.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Sort;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;
import run.halo.app.core.extension.content.Post;
import run.halo.app.core.extension.content.Post.PostSpec;
import run.halo.app.core.extension.content.PostFavorite;
import run.halo.app.extension.ListOptions;
import run.halo.app.extension.Metadata;
import run.halo.app.extension.ReactiveExtensionClient;
import run.halo.app.infra.exception.DuplicateNameException;
import run.halo.app.infra.exception.NotFoundException;

/** Tests for {@link PostFavoriteServiceImpl}. */
@ExtendWith(MockitoExtension.class)
class PostFavoriteServiceImplTest {

    @Mock
    ReactiveExtensionClient client;

    PostFavoriteServiceImpl favoriteService;

    @BeforeEach
    void setUp() {
        favoriteService = new PostFavoriteServiceImpl(client);
    }

    @Test
    void shouldCreateFavoriteRelation() {
        when(client.fetch(Post.class, "post-1")).thenReturn(Mono.just(post("post-1")));
        when(client.create(any(PostFavorite.class))).thenReturn(Mono.just(new PostFavorite()));

        StepVerifier.create(favoriteService.favorite("alice", "post-1")).verifyComplete();

        var captor = ArgumentCaptor.forClass(PostFavorite.class);
        verify(client).create(captor.capture());
        var favorite = captor.getValue();
        assertThat(favorite.getMetadata().getName()).isEqualTo(PostFavoriteServiceImpl.nameOf("alice", "post-1"));
        assertThat(favorite.getSpec().getUsername()).isEqualTo("alice");
        assertThat(favorite.getSpec().getPostName()).isEqualTo("post-1");
    }

    @Test
    void shouldTreatDuplicateFavoriteAsSuccess() {
        when(client.fetch(Post.class, "post-1")).thenReturn(Mono.just(post("post-1")));
        when(client.create(any(PostFavorite.class))).thenReturn(Mono.error(new DuplicateNameException()));

        StepVerifier.create(favoriteService.favorite("alice", "post-1")).verifyComplete();
    }

    @Test
    void shouldRejectFavoriteForMissingPost() {
        when(client.fetch(Post.class, "post-1")).thenReturn(Mono.empty());

        StepVerifier.create(favoriteService.favorite("alice", "post-1"))
                .expectError(NotFoundException.class)
                .verify();

        verify(client, never()).create(any(PostFavorite.class));
    }

    @Test
    void shouldRejectFavoriteForRecycledPost() {
        var post = post("post-1");
        post.getSpec().setDeleted(true);
        when(client.fetch(Post.class, "post-1")).thenReturn(Mono.just(post));

        StepVerifier.create(favoriteService.favorite("alice", "post-1"))
                .expectError(NotFoundException.class)
                .verify();
    }

    @Test
    void shouldDeleteExistingFavorite() {
        when(client.fetch(Post.class, "post-1")).thenReturn(Mono.just(post("post-1")));
        var favorite = new PostFavorite();
        when(client.fetch(PostFavorite.class, PostFavoriteServiceImpl.nameOf("alice", "post-1")))
                .thenReturn(Mono.just(favorite));
        when(client.delete(favorite)).thenReturn(Mono.just(favorite));

        StepVerifier.create(favoriteService.unfavorite("alice", "post-1")).verifyComplete();

        verify(client).delete(favorite);
    }

    @Test
    void shouldTreatMissingFavoriteAsSuccessOnUnfavorite() {
        when(client.fetch(Post.class, "post-1")).thenReturn(Mono.just(post("post-1")));
        when(client.fetch(PostFavorite.class, PostFavoriteServiceImpl.nameOf("alice", "post-1")))
                .thenReturn(Mono.empty());

        StepVerifier.create(favoriteService.unfavorite("alice", "post-1")).verifyComplete();

        verify(client, never()).delete(any(PostFavorite.class));
    }

    @Test
    void shouldListFavoritePostNamesOfUser() {
        when(client.listAll(eq(PostFavorite.class), any(ListOptions.class), eq(Sort.unsorted())))
                .thenReturn(Flux.just(favorite("alice", "post-1"), favorite("alice", "post-2")));

        StepVerifier.create(favoriteService.listFavoritePostNames("alice"))
                .expectNext("post-1", "post-2")
                .verifyComplete();
    }

    @Test
    void shouldListFavoritePostNamesAmongCandidates() {
        when(client.listAll(eq(PostFavorite.class), any(ListOptions.class), eq(Sort.unsorted())))
                .thenReturn(Flux.just(favorite("alice", "post-1")));

        StepVerifier.create(favoriteService.listFavoritePostNames("alice", List.of("post-1", "post-2")))
                .expectNext("post-1")
                .verifyComplete();

        verify(client).listAll(eq(PostFavorite.class), any(ListOptions.class), eq(Sort.unsorted()));
    }

    @Test
    void shouldSkipQueryWhenNoCandidatePostNames() {
        StepVerifier.create(favoriteService.listFavoritePostNames("alice", List.of()))
                .verifyComplete();

        verify(client, never()).listAll(eq(PostFavorite.class), any(ListOptions.class), any(Sort.class));
    }

    private static Post post(String name) {
        var post = new Post();
        var metadata = new Metadata();
        metadata.setName(name);
        post.setMetadata(metadata);
        post.setSpec(new PostSpec());
        return post;
    }

    private static PostFavorite favorite(String username, String postName) {
        var favorite = new PostFavorite();
        var spec = new PostFavorite.PostFavoriteSpec();
        spec.setUsername(username);
        spec.setPostName(postName);
        favorite.setSpec(spec);
        return favorite;
    }
}
