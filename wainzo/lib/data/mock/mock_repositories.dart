import '../../core/network/api_exception.dart';
import '../../models/app_notification.dart';
import '../../models/comment.dart';
import '../../models/country.dart';
import '../../models/feedback_signal.dart';
import '../../models/interest_profile.dart';
import '../../models/post.dart';
import '../../models/user.dart';
import '../../services/moderation/moderation_service.dart';
import '../../services/ranking/recommendation_service.dart';
import '../geo/country_registry.dart';
import '../repositories/repositories.dart';
import 'mock_backend.dart';

/// Posts, against the in-memory store.
final class MockPostRepository implements PostRepository {
  MockPostRepository({
    required MockBackend backend,
    required ModerationService moderation,
    RecommendationService ranking = const RecommendationService(),
  }) : _backend = backend,
       _moderation = moderation,
       _ranking = ranking;

  final MockBackend _backend;
  final ModerationService _moderation;
  final RecommendationService _ranking;

  @override
  Future<List<Post>> feed({
    required String viewerId,
    String? viewerCountry,
    Set<String> exclude = const <String>{},
    int limit = 20,
  }) async {
    await _backend.wait();
    final List<Post> candidates = _backend
        .eligibleFor(viewerId: viewerId, viewerCountry: viewerCountry)
        .where((Post p) => !exclude.contains(p.id))
        .toList(growable: false);

    final InterestProfile profile = await _backend.profile(viewerId);
    final List<RankedPost> ranked = _ranking.rank(
      candidates: candidates,
      profile: profile,
      viewerCountry: viewerCountry,
      // The feed's own session already tracks what it has shown; the stored
      // "seen" set would otherwise empty the feed permanently after one pass.
      skipSeen: false,
    );
    return ranked
        .take(limit)
        .map((RankedPost r) => r.post)
        .toList(growable: false);
  }

  @override
  Future<List<Post>> inCountry(
    String countryCode, {
    int limit = 40,
    String? category,
  }) async {
    await _backend.wait();
    final String code = countryCode.toUpperCase();
    final List<Post> matching =
        _backend.posts
            .where(
              (Post p) =>
                  p.isVisibleToOthers &&
                  p.targets(code) &&
                  (category == null || p.category.slug == category),
            )
            .toList()
          ..sort((Post a, Post b) => b.createdAt.compareTo(a.createdAt));
    return matching.take(limit).toList(growable: false);
  }

  @override
  Future<List<Post>> byCreator(
    String creatorId, {
    bool includeUnpublished = false,
  }) async {
    await _backend.wait(0.6);
    final List<Post> mine =
        _backend.posts
            .where(
              (Post p) =>
                  p.creatorId == creatorId &&
                  (includeUnpublished || p.isVisibleToOthers),
            )
            .toList()
          ..sort((Post a, Post b) => b.createdAt.compareTo(a.createdAt));
    return mine;
  }

  @override
  Future<List<Post>> saved(String userId) async {
    await _backend.wait(0.6);
    return _backend.posts
        .where((Post p) => _backend.saves(p.id).contains(userId))
        .toList(growable: false);
  }

  @override
  Future<Post> byId(String id) async {
    await _backend.wait(0.4);
    final Post? post = _backend.findPost(id);
    if (post == null) {
      throw const NotFoundException("That post isn't here any more.");
    }
    return post;
  }

  @override
  Future<Post> saveDraft(Post draft) async {
    await _backend.wait();
    return _backend.replace(
      draft.copyWith(status: PostStatus.draft, updatedAt: DateTime.now()),
    );
  }

  @override
  Future<List<Post>> drafts(String creatorId) async {
    await _backend.wait(0.5);
    return _backend.posts
        .where(
          (Post p) => p.creatorId == creatorId && p.status == PostStatus.draft,
        )
        .toList(growable: false);
  }

  @override
  Future<Post> publish(Post post) async {
    await _backend.wait(1.4);

    // Nothing reaches a stranger before this has returned.
    final ModerationResult decision = await _moderation.screenPost(
      caption: post.caption,
      creatorIntent: post.creatorIntent,
      mediaUrl: post.mediaUrl,
    );
    if (decision.decision == ModerationDecision.reject) {
      throw RejectedException(
        decision.reasons.isEmpty
            ? "This post can't be published."
            : "This post can't be published: ${decision.reasons.first.toLowerCase()}.",
      );
    }

    return _backend.replace(
      post.copyWith(
        status: PostStatus.published,
        moderation: decision.status,
        updatedAt: DateTime.now(),
      ),
    );
  }

  @override
  Future<void> delete(String postId) async {
    await _backend.wait();
    _backend.posts.removeWhere((Post p) => p.id == postId);
    _backend.comments.removeWhere((PostComment c) => c.postId == postId);
  }

  @override
  Future<Post> setLiked({
    required String postId,
    required String userId,
    required bool liked,
  }) async {
    final Post post = await byId(postId);
    final Set<String> likes = _backend.likes(postId);
    final bool changed = liked ? likes.add(userId) : likes.remove(userId);
    if (!changed) return post;
    return _backend.replace(
      post.copyWith(
        metrics: post.metrics.copyWith(
          likes: post.metrics.likes + (liked ? 1 : -1),
        ),
      ),
    );
  }

  @override
  Future<Post> setSaved({
    required String postId,
    required String userId,
    required bool saved,
  }) async {
    final Post post = await byId(postId);
    final Set<String> saves = _backend.saves(postId);
    final bool changed = saved ? saves.add(userId) : saves.remove(userId);
    if (!changed) return post;
    return _backend.replace(
      post.copyWith(
        metrics: post.metrics.copyWith(
          saves: post.metrics.saves + (saved ? 1 : -1),
        ),
      ),
    );
  }

  @override
  Future<Post> registerShare({
    required String postId,
    required String userId,
  }) async {
    final Post post = await byId(postId);
    return _backend.bumpMetrics(post, FeedbackKind.share);
  }

  @override
  Future<bool> isLiked({
    required String postId,
    required String userId,
  }) async => _backend.likes(postId).contains(userId);

  @override
  Future<bool> isSaved({
    required String postId,
    required String userId,
  }) async => _backend.saves(postId).contains(userId);

  @override
  Future<List<CountryActivity>> activity({
    String? viewerCountry,
    int limit = 0,
  }) async {
    await _backend.wait(0.8);
    final CountryRegistry registry = await CountryRegistry.load();

    // Real counts over the real store. The seeded daily figure alongside them
    // is mock-only and is documented as such on MockBackend.
    final Map<String, int> counts = <String, int>{};
    final Map<String, List<String>> topics = <String, List<String>>{};
    for (final Post post in _backend.posts.where(
      (Post p) => p.isVisibleToOthers,
    )) {
      final Iterable<String> reach = post.isGlobal
          ? MockBackend.seededDailyPosts.keys
          : post.targetCountries;
      for (final String code in reach) {
        counts[code] = (counts[code] ?? 0) + 1;
        topics
            .putIfAbsent(code, () => <String>[])
            .addAll(post.profile?.topics ?? const <String>[]);
      }
    }

    final List<CountryActivity> activity =
        <CountryActivity>[
          for (final MapEntry<String, int> entry in counts.entries)
            if (registry[entry.key] != null)
              CountryActivity(
                country: registry[entry.key]!,
                postCount: entry.value,
                newPostsToday: MockBackend.seededDailyPosts[entry.key] ?? 0,
                trendingTopics: _topTopics(
                  topics[entry.key] ?? const <String>[],
                ),
              ),
        ]..sort(
          (CountryActivity a, CountryActivity b) =>
              b.newPostsToday.compareTo(a.newPostsToday),
        );

    return limit > 0 ? activity.take(limit).toList(growable: false) : activity;
  }

  static List<String> _topTopics(List<String> raw, {int limit = 4}) {
    final Map<String, int> counts = <String, int>{};
    for (final String topic in raw) {
      counts[topic] = (counts[topic] ?? 0) + 1;
    }
    final List<MapEntry<String, int>> ranked = counts.entries.toList()
      ..sort(
        (MapEntry<String, int> a, MapEntry<String, int> b) =>
            b.value.compareTo(a.value),
      );
    return ranked
        .take(limit)
        .map((MapEntry<String, int> e) => e.key)
        .toList(growable: false);
  }
}

final class MockUserRepository implements UserRepository {
  MockUserRepository(this._backend);

  final MockBackend _backend;

  @override
  Future<WainzoUser> byId(String id) async {
    await _backend.wait(0.4);
    final WainzoUser? user = _backend.users[id];
    if (user == null) {
      throw const NotFoundException("That account isn't here any more.");
    }
    return user;
  }

  @override
  Future<WainzoUser?> byUsername(String username) async {
    await _backend.wait(0.4);
    final String needle = username.toLowerCase().replaceFirst('@', '');
    for (final WainzoUser user in _backend.users.values) {
      if (user.username.toLowerCase() == needle) return user;
    }
    return null;
  }

  @override
  Future<void> setFollowing({
    required String userId,
    required String targetId,
    required bool following,
  }) async {
    await _backend.wait(0.4);
    final Set<String> set = _backend.following(userId);
    if (following) {
      set.add(targetId);
    } else {
      set.remove(targetId);
    }
    final WainzoUser? target = _backend.users[targetId];
    if (target != null) {
      _backend.users[targetId] = target.copyWith(
        followersCount: target.followersCount + (following ? 1 : -1),
      );
    }
  }

  @override
  Future<bool> isFollowing({
    required String userId,
    required String targetId,
  }) async => _backend.following(userId).contains(targetId);

  @override
  Future<void> block({required String userId, required String targetId}) async {
    await _backend.wait(0.4);
    _backend.blocked(userId).add(targetId);
    _backend.following(userId).remove(targetId);
  }

  @override
  Future<Set<String>> blocked(String userId) async => _backend.blocked(userId);

  @override
  Future<WainzoUser> update(WainzoUser user) async {
    await _backend.wait();
    return _backend.users[user.id] = user;
  }

  @override
  Future<Map<String, int>> contentReach(String creatorId) async {
    await _backend.wait(0.5);
    final Map<String, int> reach = <String, int>{};
    for (final Post post in _backend.posts) {
      if (post.creatorId != creatorId || !post.isVisibleToOthers) continue;
      for (final String code in post.targetCountries) {
        reach[code] = (reach[code] ?? 0) + 1;
      }
    }
    return reach;
  }

  @override
  Future<void> deleteAccount(String userId) async {
    await _backend.wait(1.5);
    _backend.posts.removeWhere((Post p) => p.creatorId == userId);
    _backend.comments.removeWhere((PostComment c) => c.authorId == userId);
    _backend.notifications.clear();
    _backend.users.remove(userId);
    await _backend.clearProfile(userId);
  }
}

final class MockCommentRepository implements CommentRepository {
  MockCommentRepository({
    required MockBackend backend,
    required ModerationService moderation,
  }) : _backend = backend,
       _moderation = moderation;

  final MockBackend _backend;
  final ModerationService _moderation;

  @override
  Future<List<PostComment>> forPost(String postId) async {
    await _backend.wait(0.6);
    return _backend.comments
        .where((PostComment c) => c.postId == postId)
        .toList()
      ..sort(
        (PostComment a, PostComment b) => b.createdAt.compareTo(a.createdAt),
      );
  }

  @override
  Future<PostComment> add({
    required String postId,
    required String authorId,
    required String body,
  }) async {
    final String trimmed = body.trim();
    if (trimmed.isEmpty) {
      throw const RejectedException('Write something first.');
    }

    final ModerationResult decision = await _moderation.screenText(trimmed);
    if (decision.decision == ModerationDecision.reject) {
      throw RejectedException(
        decision.reasons.isEmpty
            ? "That comment can't be posted."
            : decision.reasons.first,
      );
    }

    final WainzoUser author =
        _backend.users[authorId] ??
        (throw const NotFoundException('Sign in to comment.'));
    final PostComment comment = PostComment(
      id: 'c_${DateTime.now().microsecondsSinceEpoch}',
      postId: postId,
      authorId: authorId,
      authorName: author.displayName,
      authorImageUrl: author.profileImageUrl,
      authorCountry: author.country,
      body: trimmed,
      createdAt: DateTime.now(),
    );
    _backend.comments.add(comment);

    final Post? post = _backend.findPost(postId);
    if (post != null) {
      _backend.replace(
        post.copyWith(
          metrics: post.metrics.copyWith(comments: post.metrics.comments + 1),
        ),
      );
    }
    return comment;
  }

  @override
  Future<void> delete(String commentId) async {
    await _backend.wait(0.4);
    _backend.comments.removeWhere((PostComment c) => c.id == commentId);
  }

  @override
  Future<PostComment> setLiked({
    required String commentId,
    required bool liked,
  }) async {
    final int index = _backend.comments.indexWhere(
      (PostComment c) => c.id == commentId,
    );
    if (index == -1) throw const NotFoundException('That comment is gone.');
    final PostComment current = _backend.comments[index];
    return _backend.comments[index] = current.copyWith(
      likedByMe: liked,
      likes: current.likes + (liked ? 1 : -1),
    );
  }
}

final class MockNotificationRepository implements NotificationRepository {
  MockNotificationRepository(this._backend);

  final MockBackend _backend;

  @override
  Future<List<AppNotification>> forUser(String userId) async {
    await _backend.wait(0.6);
    return _backend.notifications.toList()..sort(
      (AppNotification a, AppNotification b) =>
          b.createdAt.compareTo(a.createdAt),
    );
  }

  @override
  Future<int> unreadCount(String userId) async =>
      _backend.notifications.where((AppNotification n) => !n.read).length;

  @override
  Future<void> markRead(String notificationId) async {
    final int index = _backend.notifications.indexWhere(
      (AppNotification n) => n.id == notificationId,
    );
    if (index != -1) {
      _backend.notifications[index] = _backend.notifications[index].copyWith(
        read: true,
      );
    }
  }

  @override
  Future<void> markAllRead(String userId) async {
    for (int i = 0; i < _backend.notifications.length; i++) {
      _backend.notifications[i] = _backend.notifications[i].copyWith(
        read: true,
      );
    }
  }
}

final class MockFeedbackRepository implements FeedbackRepository {
  MockFeedbackRepository(this._backend);

  final MockBackend _backend;

  @override
  Future<void> record(FeedbackSignal signal) async {
    // No artificial latency here on purpose: skipping must stay instant, and a
    // signal that made the UI wait would be a signal worth not collecting.
    _backend.signals.add(signal);
    final Post? post = _backend.findPost(signal.postId);
    if (post != null) {
      _backend.bumpMetrics(
        post,
        signal.kind,
        watchedFraction: signal.watchedFraction,
      );
    }
    final InterestProfile profile = await _backend.profile(signal.userId);
    await _backend.storeProfile(profile.applying(signal));
  }

  @override
  Future<InterestProfile> profileFor(String userId) => _backend.profile(userId);

  @override
  Future<List<FeedbackSignal>> history(String userId, {int limit = 200}) async {
    final List<FeedbackSignal> mine =
        _backend.signals
            .where((FeedbackSignal s) => s.userId == userId)
            .toList()
          ..sort(
            (FeedbackSignal a, FeedbackSignal b) =>
                b.createdAt.compareTo(a.createdAt),
          );
    return mine.take(limit).toList(growable: false);
  }

  @override
  Future<void> reset(String userId) async {
    _backend.signals.removeWhere((FeedbackSignal s) => s.userId == userId);
    await _backend.clearProfile(userId);
  }
}

/// Countries come from the bundled registry in both the mock and the remote
/// build: the list of countries is not something a backend should have to serve.
final class LocalCountryRepository implements CountryRepository {
  const LocalCountryRepository({PostRepository? posts}) : _posts = posts;

  final PostRepository? _posts;

  @override
  Future<List<Country>> all() async => (await CountryRegistry.load()).all;

  @override
  Future<Country?> byCode(String code) async =>
      (await CountryRegistry.load())[code];

  @override
  Future<List<Country>> search(String query) async =>
      (await CountryRegistry.load()).search(query);

  @override
  Future<List<String>> trendingTopics(
    String countryCode, {
    int limit = 6,
  }) async {
    final PostRepository? posts = _posts;
    if (posts == null) return const <String>[];
    final List<Post> inCountry = await posts.inCountry(countryCode, limit: 60);
    final Map<String, int> counts = <String, int>{};
    for (final Post post in inCountry) {
      for (final String topic in post.profile?.topics ?? const <String>[]) {
        counts[topic] = (counts[topic] ?? 0) + 1;
      }
      counts[post.category.label] = (counts[post.category.label] ?? 0) + 2;
    }
    final List<MapEntry<String, int>> ranked = counts.entries.toList()
      ..sort(
        (MapEntry<String, int> a, MapEntry<String, int> b) =>
            b.value.compareTo(a.value),
      );
    return ranked
        .take(limit)
        .map((MapEntry<String, int> e) => e.key)
        .toList(growable: false);
  }
}
