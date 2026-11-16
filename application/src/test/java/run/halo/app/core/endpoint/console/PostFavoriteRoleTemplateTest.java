package run.halo.app.core.endpoint.console;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.mock.http.server.reactive.MockServerHttpRequest.method;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpMethod;
import run.halo.app.core.extension.Role;
import run.halo.app.extension.Unstructured;
import run.halo.app.infra.utils.YamlUnstructuredLoader;
import run.halo.app.security.authorization.AttributesRecord;
import run.halo.app.security.authorization.RbacRequestEvaluation;
import run.halo.app.security.authorization.RequestInfoFactory;

/** Verifies that the view posts role can use the personal favorite endpoints. */
class PostFavoriteRoleTemplateTest {

    @ParameterizedTest
    @CsvSource({
        "POST, /apis/api.console.halo.run/v1alpha1/posts/post-1/favorite, true",
        "DELETE, /apis/api.console.halo.run/v1alpha1/posts/post-1/favorite, true",
        "GET, /apis/api.console.halo.run/v1alpha1/posts/post-1/favorite, false",
        "POST, /apis/api.console.halo.run/v1alpha1/posts/post-1/publish, false",
        "DELETE, /apis/api.console.halo.run/v1alpha1/posts/post-1, false"
    })
    void viewPostsRoleShouldAllowFavoriteOperations(HttpMethod method, String path, boolean allowed) {
        var roles = new YamlUnstructuredLoader(new ClassPathResource("extensions/role-template-post.yaml"))
                .load().stream()
                        .map(value -> Unstructured.OBJECT_MAPPER.convertValue(value.getData(), Role.class))
                        .filter(role -> role.getMetadata().getName().equals("role-template-view-posts"))
                        .toList();
        var rules = roles.stream().flatMap(role -> role.getRules().stream()).toList();
        var requestInfo =
                RequestInfoFactory.INSTANCE.newRequestInfo(method(method, path).build());
        assertThat(new RbacRequestEvaluation().rulesAllow(new AttributesRecord(requestInfo), rules))
                .isEqualTo(allowed);
    }
}
