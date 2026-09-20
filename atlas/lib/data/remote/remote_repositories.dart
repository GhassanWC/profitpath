import '../../core/network/api_client.dart';
import '../../models/app_notification.dart';
import '../../models/comment.dart';
import '../../models/country.dart';
import '../../models/feedback_signal.dart';
import '../../models/interest_profile.dart';
import '../../models/post.dart';
import '../../models/user.dart';
import '../geo/country_registry.dart';
import '../repositories/repositories.dart';

/// The HTTP half of the data layer.
///
/// These are the implementations the app runs on once `ATLAS_BACKEND=remote`
/// and `ATLAS_API_BASE_URL` are set. They are deliberately thin: the server
/// owns ranking, eligibility and moderation, because none of those can be
/// trusted to a client. Nothing above this layer changes when the switch is
/// flipped — the interfaces are the same ones the mock implements.
final class RemotePostRepository implements PostRepository {
  const RemotePostRepository(this._api);

  final ApiClient _api;

  @override
  Future<List<Post>> feed({
    required String viewerId,
    String? viewerCountry,
    Set<String> exclude = const <String>{},
    int limit = 20,
  }) async => _posts(
    await _api.getList(
      '/v1/feed',
      query: <String, String>{
        'limit': '$limit',
        'country': ?viewerCountry,
        if (exclude.isNotEmpty) 'exclude': exclude.join(','),
      },
    ),
  );

  @override
  Future<List<Post>> inCountry(
    String countryCode, {
    int limit = 40,
    String? category,
  }) async => _posts(
    await _api.getList(
      '/v1/countries/$countryCode/posts',
      query: <String, String>{'limit': '$limit', 'category': ?category},
    ),
  );

  @override
  Future<List<Post>> byCreator(
    String creatorId, {
    bool includeUnpublished = false,
  }) async => _posts(
    await _api.getList(
      '/v1/users/$creatorId/posts',
      query: <String, String>{if (includeUnpublished) 'include': 'drafts'},
    ),
  );

  @override
  Future<List<Post>> saved(String userId) async =>
      _posts(await _api.getList('/v1/users/$userId/saved'));

  @override
  Future<Post> byId(String id) async =>
      Post.fromJson(await _api.getJson('/v1/posts/$id'));

  @override
  Future<Post> saveDraft(Post draft) async => Post.fromJson(
    await _api.postJson('/v1/posts/drafts', body: draft.toJson()),
  );

  @override
  Future<List<Post>> drafts(String creatorId) async =>
      _posts(await _api.getList('/v1/users/$creatorId/drafts'));

  @override
  Future<Post> publish(Post post) async => Post.fromJson(
    await _api.postJson('/v1/posts/${post.id}/publish', body: post.toJson()),
  );

  @override
  Future<void> delete(String postId) => _api.delete('/v1/posts/$postId');

  @override
  Future<Post> setLiked({
    required String postId,
    required String userId,
    required bool liked,
  }) async => Post.fromJson(
    await _api.postJson(
      '/v1/posts/$postId/like',
      body: <String, dynamic>{'liked': liked},
    ),
  );

  @override
  Future<Post> setSaved({
    required String postId,
    required String userId,
    required bool saved,
  }) async => Post.fromJson(
    await _api.postJson(
      '/v1/posts/$postId/save',
      body: <String, dynamic>{'saved': saved},
    ),
  );

  @override
  Future<Post> registerShare({
    required String postId,
    required String userId,
  }) async => Post.fromJson(await _api.postJson('/v1/posts/$postId/share'));

  @override
  Future<bool> isLiked({
    required String postId,
    required String userId,
  }) async =>
      (await _api.getJson('/v1/posts/$postId/like'))['liked'] as bool? ?? false;

  @override
  Future<bool> isSaved({
    required String postId,
    required String userId,
  }) async =>
      (await _api.getJson('/v1/posts/$postId/save'))['saved'] as bool? ?? false;

  @override
  Future<List<CountryActivity>> activity({
    String? viewerCountry,
    int limit = 0,
  }) async {
    final List<dynamic> raw = await _api.getList(
      '/v1/activity',
      query: <String, String>{
        'country': ?viewerCountry,
        if (limit > 0) 'limit': '$limit',
      },
    );
    final CountryRegistry registry = await CountryRegistry.load();
    return <CountryActivity>[
      for (final dynamic entry in raw.cast<Map<String, dynamic>>())
        CountryActivity(
          country: registry.resolve(entry['code'] as String),
          postCount: (entry['postCount'] as num?)?.toInt() ?? 0,
          newPostsToday: (entry['newPostsToday'] as num?)?.toInt() ?? 0,
          trendingTopics:
              (entry['trendingTopics'] as List<dynamic>? ?? const <dynamic>[])
                  .cast<String>(),
        ),
    ];
  }

  List<Post> _posts(List<dynamic> raw) => raw
      .cast<Map<String, dynamic>>()
      .map(Post.fromJson)
      .toList(growable: false);
}

final class RemoteUserRepository implements UserRepository {
  const RemoteUserRepository(this._api);

  final ApiClient _api;

  @override
  Future<AtlasUser> byId(String id) async =>
      AtlasUser.fromJson(await _api.getJson('/v1/users/$id'));

  @override
  Future<AtlasUser?> byUsername(String username) async => AtlasUser.fromJson(
    await _api.getJson(
      '/v1/users/by-username/${username.replaceFirst('@', '')}',
    ),
  );

  @override
  Future<void> setFollowing({
    required String userId,
    required String targetId,
    required bool following,
  }) async {
    await _api.postJson(
      '/v1/users/$targetId/follow',
      body: <String, dynamic>{'following': following},
    );
  }

  @override
  Future<bool> isFollowing({
    required String userId,
    required String targetId,
  }) async =>
      (await _api.getJson('/v1/users/$targetId/follow'))['following']
          as bool? ??
      false;

  @override
  Future<void> block({required String userId, required String targetId}) async {
    await _api.postJson('/v1/users/$targetId/block');
  }

  @override
  Future<Set<String>> blocked(String userId) async =>
      (await _api.getList('/v1/users/$userId/blocked')).cast<String>().toSet();

  @override
  Future<AtlasUser> update(AtlasUser user) async => AtlasUser.fromJson(
    await _api.patchJson('/v1/users/${user.id}', body: user.toJson()),
  );

  @override
  Future<Map<String, int>> contentReach(String creatorId) async {
    final Map<String, dynamic> json = await _api.getJson(
      '/v1/users/$creatorId/reach',
    );
    return json.map(
      (String key, Object? value) =>
          MapEntry<String, int>(key, (value as num).toInt()),
    );
  }

  @override
  Future<void> deleteAccount(String userId) => _api.delete('/v1/users/$userId');
}

final class RemoteCommentRepository implements CommentRepository {
  const RemoteCommentRepository(this._api);

  final ApiClient _api;

  @override
  Future<List<PostComment>> forPost(String postId) async =>
      (await _api.getList('/v1/posts/$postId/comments'))
          .cast<Map<String, dynamic>>()
          .map(PostComment.fromJson)
          .toList(growable: false);

  @override
  Future<PostComment> add({
    required String postId,
    required String authorId,
    required String body,
  }) async => PostComment.fromJson(
    await _api.postJson(
      '/v1/posts/$postId/comments',
      body: <String, dynamic>{'body': body},
    ),
  );

  @override
  Future<void> delete(String commentId) =>
      _api.delete('/v1/comments/$commentId');

  @override
  Future<PostComment> setLiked({
    required String commentId,
    required bool liked,
  }) async => PostComment.fromJson(
    await _api.postJson(
      '/v1/comments/$commentId/like',
      body: <String, dynamic>{'liked': liked},
    ),
  );
}

final class RemoteNotificationRepository implements NotificationRepository {
  const RemoteNotificationRepository(this._api);

  final ApiClient _api;

  @override
  Future<List<AppNotification>> forUser(String userId) async =>
      (await _api.getList('/v1/notifications'))
          .cast<Map<String, dynamic>>()
          .map(AppNotification.fromJson)
          .toList(growable: false);

  @override
  Future<int> unreadCount(String userId) async =>
      ((await _api.getJson('/v1/notifications/unread'))['count'] as num?)
          ?.toInt() ??
      0;

  @override
  Future<void> markRead(String notificationId) async {
    await _api.postJson('/v1/notifications/$notificationId/read');
  }

  @override
  Future<void> markAllRead(String userId) async {
    await _api.postJson('/v1/notifications/read-all');
  }
}

final class RemoteFeedbackRepository implements FeedbackRepository {
  const RemoteFeedbackRepository(this._api);

  final ApiClient _api;

  @override
  Future<void> record(FeedbackSignal signal) async {
    // Fire-and-forget by design. A skip must never wait on a round trip, so a
    // failure here is swallowed: a lost signal costs a little ranking quality,
    // a blocked skip costs the product.
    try {
      await _api.postJson('/v1/signals', body: signal.toJson());
    } on Object {
      // Intentionally ignored. A production build batches and retries these
      // through an outbox rather than dropping them.
    }
  }

  @override
  Future<InterestProfile> profileFor(String userId) async =>
      InterestProfile.fromJson(
        await _api.getJson('/v1/users/$userId/interests'),
      );

  @override
  Future<List<FeedbackSignal>> history(
    String userId, {
    int limit = 200,
  }) async =>
      (await _api.getList(
            '/v1/users/$userId/signals',
            query: <String, String>{'limit': '$limit'},
          ))
          .cast<Map<String, dynamic>>()
          .map(FeedbackSignal.fromJson)
          .toList(growable: false);

  @override
  Future<void> reset(String userId) =>
      _api.delete('/v1/users/$userId/interests');
}
