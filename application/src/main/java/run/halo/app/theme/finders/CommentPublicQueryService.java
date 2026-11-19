package run.halo.app.theme.finders;

import org.jspecify.annotations.Nullable;
import reactor.core.publisher.Mono;
import run.halo.app.extension.ListResult;
import run.halo.app.extension.PageRequest;
import run.halo.app.extension.Ref;
import run.halo.app.theme.finders.vo.CommentVo;
import run.halo.app.theme.finders.vo.CommentWithReplyVo;
import run.halo.app.theme.finders.vo.ReplyVo;

/**
 * comment finder.
 *
 * @author LIlGG
 */
public interface CommentPublicQueryService {
    Mono<CommentVo> getByName(String name);

    Mono<ReplyVo> getReply(String commentName, String replyName);

    Mono<ListResult<CommentVo>> list(Ref ref, @Nullable Integer page, @Nullable Integer size);

    Mono<ListResult<CommentVo>> list(Ref ref, @Nullable PageRequest pageRequest);

    /**
     * Lists comments of the subject ref, optionally filtered by a keyword matching {@code spec.raw}. Visibility rules
     * are always applied before the keyword condition.
     *
     * @param ref the comment subject ref, may be null to list all visible comments
     * @param keyword keyword used to match the raw content, blank or null means no keyword filter
     * @param pageRequest page request, null means default page request
     */
    Mono<ListResult<CommentVo>> list(@Nullable Ref ref, @Nullable String keyword, @Nullable PageRequest pageRequest);

    Mono<ListResult<CommentWithReplyVo>> convertToWithReplyVo(ListResult<CommentVo> comments, int replySize);

    Mono<ListResult<ReplyVo>> listReply(String commentName, @Nullable Integer page, @Nullable Integer size);

    Mono<ListResult<ReplyVo>> listReply(String commentName, PageRequest pageRequest);

    /**
     * Lists replies of the comment, optionally filtered by a keyword matching {@code spec.raw}. Visibility rules are
     * always applied before the keyword condition.
     *
     * @param commentName metadata.name of the parent comment
     * @param keyword keyword used to match the raw content, blank or null means no keyword filter
     * @param pageRequest page request, null means default page request
     */
    Mono<ListResult<ReplyVo>> listReply(
            String commentName, @Nullable String keyword, @Nullable PageRequest pageRequest);
}
