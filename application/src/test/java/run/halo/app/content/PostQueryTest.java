package run.halo.app.content;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import org.springframework.web.reactive.function.server.HandlerStrategies;
import org.springframework.web.reactive.function.server.ServerRequest;
import org.springframework.web.server.ServerWebInputException;

/** Tests for the favorite query parameter of {@link PostQuery}. */
class PostQueryTest {

    private PostQuery createQuery(String rawQuery) {
        return createQuery(rawQuery, true);
    }

    private PostQuery createQuery(String rawQuery, boolean console) {
        var request = MockServerHttpRequest.get("/apis/api.console.halo.run/v1alpha1/posts" + rawQuery)
                .build();
        var exchange = MockServerWebExchange.from(request);
        var serverRequest =
                ServerRequest.create(exchange, HandlerStrategies.withDefaults().messageReaders());
        return console ? new PostQuery(serverRequest) : new PostQuery(serverRequest, "fake-user");
    }

    @Test
    void shouldReadFavoriteFilter() {
        assertThat(createQuery("?favorite=true").getFavorite()).isTrue();
        assertThat(createQuery("?favorite=false").getFavorite()).isFalse();
        assertThat(createQuery("").getFavorite()).isNull();
        assertThat(createQuery("?favorite=").getFavorite()).isNull();
    }

    @Test
    void shouldRejectInvalidFavoriteFilter() {
        assertThatThrownBy(() -> createQuery("?favorite=maybe").getFavorite())
                .isInstanceOf(ServerWebInputException.class);
    }

    @Test
    void shouldIgnoreFavoriteFilterWhenNotSupported() {
        var query = createQuery("?favorite=true", false);
        assertThat(query.isFavoriteSupported()).isFalse();
        assertThat(query.getFavorite()).isNull();
    }

    @Test
    void shouldReportConsoleFavoriteSupport() {
        assertThat(createQuery("").isFavoriteSupported()).isTrue();
    }
}
