import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../models/comment.dart';
import '../../models/feedback_signal.dart';
import '../../models/post.dart';
import '../../providers/app_providers.dart';
import '../../providers/session_providers.dart';
import '../feed/feed_providers.dart';

final postProvider = FutureProvider.family<Post, String>(
  (Ref ref, String id) => ref.watch(postRepositoryProvider).byId(id),
);

final commentsProvider = FutureProvider.family<List<PostComment>, String>(
  (Ref ref, String postId) =>
      ref.watch(commentRepositoryProvider).forPost(postId),
);

/// What this viewer has done with a post.
final class PostInteraction {
  const PostInteraction({
    this.post,
    this.liked = false,
    this.saved = false,
    this.following = false,
  });

  /// The post as the repository last returned it, so counters stay honest
  /// after a like without refetching the whole thing.
  final Post? post;
  final bool liked;
  final bool saved;
  final bool following;

  PostInteraction copyWith({
    Post? post,
    bool? liked,
    bool? saved,
    bool? following,
  }) => PostInteraction(
    post: post ?? this.post,
    liked: liked ?? this.liked,
    saved: saved ?? this.saved,
    following: following ?? this.following,
  );
}

/// Likes, saves, shares and follows, for every post the session has touched.
///
/// One controller keyed by post id rather than one per post: the same post can
/// be on screen in the feed, on a country page and in a profile grid at once,
/// and a like in one of them has to be a like in all of them.
///
/// Every action is applied optimistically and rolled back if the write fails.
/// The product is about a fast decision; a spinner on a heart is not that.
final postInteractionsProvider =
    NotifierProvider<PostInteractions, Map<String, PostInteraction>>(
      PostInteractions.new,
    );

final class PostInteractions extends Notifier<Map<String, PostInteraction>> {
  @override
  Map<String, PostInteraction> build() => const <String, PostInteraction>{};

  PostInteraction? operator [](String postId) => state[postId];

  void _set(String postId, PostInteraction value) =>
      state = <String, PostInteraction>{...state, postId: value};

  /// Reads the stored state for a post. Called once when a post opens.
  Future<void> load(Post post) async {
    final String viewerId = ref.read(viewerIdProvider);
    final repository = ref.read(postRepositoryProvider);
    final users = ref.read(userRepositoryProvider);
    final (bool liked, bool saved, bool following) = (
      await repository.isLiked(postId: post.id, userId: viewerId),
      await repository.isSaved(postId: post.id, userId: viewerId),
      await users.isFollowing(userId: viewerId, targetId: post.creatorId),
    );
    _set(
      post.id,
      PostInteraction(
        post: post,
        liked: liked,
        saved: saved,
        following: following,
      ),
    );
  }

  Future<void> toggleLike(Post post) async {
    final PostInteraction current =
        state[post.id] ?? PostInteraction(post: post);
    final bool next = !current.liked;
    _set(post.id, current.copyWith(liked: next));
    try {
      final Post updated = await ref
          .read(postRepositoryProvider)
          .setLiked(
            postId: post.id,
            userId: ref.read(viewerIdProvider),
            liked: next,
          );
      _set(
        post.id,
        (state[post.id] ?? current).copyWith(post: updated, liked: next),
      );
      await ref.recordSignal(
        post: updated,
        kind: next ? FeedbackKind.like : FeedbackKind.unlike,
        surface: FeedbackSurface.watch,
      );
    } on Object {
      _set(post.id, current);
      rethrow;
    }
  }

  Future<void> toggleSave(Post post) async {
    final PostInteraction current =
        state[post.id] ?? PostInteraction(post: post);
    final bool next = !current.saved;
    _set(post.id, current.copyWith(saved: next));
    try {
      final Post updated = await ref
          .read(postRepositoryProvider)
          .setSaved(
            postId: post.id,
            userId: ref.read(viewerIdProvider),
            saved: next,
          );
      _set(
        post.id,
        (state[post.id] ?? current).copyWith(post: updated, saved: next),
      );
      await ref.recordSignal(
        post: updated,
        kind: next ? FeedbackKind.save : FeedbackKind.unsave,
        surface: FeedbackSurface.watch,
      );
    } on Object {
      _set(post.id, current);
      rethrow;
    }
  }

  Future<void> share(Post post) async {
    final Post updated = await ref
        .read(postRepositoryProvider)
        .registerShare(postId: post.id, userId: ref.read(viewerIdProvider));
    _set(
      post.id,
      (state[post.id] ?? PostInteraction(post: post)).copyWith(post: updated),
    );
    await ref.recordSignal(
      post: updated,
      kind: FeedbackKind.share,
      surface: FeedbackSurface.watch,
    );
  }

  Future<void> toggleFollow(Post post) async {
    final PostInteraction current =
        state[post.id] ?? PostInteraction(post: post);
    final bool next = !current.following;
    _set(post.id, current.copyWith(following: next));
    try {
      await ref
          .read(userRepositoryProvider)
          .setFollowing(
            userId: ref.read(viewerIdProvider),
            targetId: post.creatorId,
            following: next,
          );
      if (next) {
        await ref.recordSignal(
          post: post,
          kind: FeedbackKind.followCreator,
          surface: FeedbackSurface.watch,
        );
      }
      ref.invalidate(userByIdProvider(post.creatorId));
    } on Object {
      _set(post.id, current);
      rethrow;
    }
  }
}
