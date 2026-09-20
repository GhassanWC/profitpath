import 'dart:convert';
import 'dart:math' as math;

import 'package:shared_preferences/shared_preferences.dart';

import '../../models/app_notification.dart';
import '../../models/comment.dart';
import '../../models/feedback_signal.dart';
import '../../models/interest_profile.dart';
import '../../models/post.dart';
import '../../models/user.dart';
import 'mock_data.dart';

/// The in-memory store the mock repositories share.
///
/// One object so that a like on the country page is still a like on the
/// profile, and a post published in the composer appears in the feed. It stands
/// in for a database, and it is the only thing that has to be replaced to move
/// to a real one.
///
/// The learned interest profile *is* persisted to the device, because the
/// watch/skip loop is the hypothesis this prototype exists to test and it is
/// not worth much if it forgets everything on restart.
final class MockBackend {
  MockBackend({
    SharedPreferencesAsync? preferences,
    this.latency = const Duration(milliseconds: 260),
  }) : _preferences = preferences ?? SharedPreferencesAsync() {
    for (final AtlasUser user in MockData.creators) {
      users[user.id] = user;
    }
    posts.addAll(MockData.posts());
    comments.addAll(MockData.comments());
    notifications.addAll(MockData.notifications());
  }

  static const String _profileKeyPrefix = 'atlas.interest.';

  final SharedPreferencesAsync _preferences;

  /// Every mock call waits this long, so the UI is built against latency rather
  /// than against an instant answer it will never get in production.
  final Duration latency;

  final Map<String, AtlasUser> users = <String, AtlasUser>{};
  final List<Post> posts = <Post>[];
  final List<PostComment> comments = <PostComment>[];
  final List<AppNotification> notifications = <AppNotification>[];
  final List<FeedbackSignal> signals = <FeedbackSignal>[];

  final Map<String, Set<String>> likesByPost = <String, Set<String>>{};
  final Map<String, Set<String>> savesByPost = <String, Set<String>>{};
  final Map<String, Set<String>> followingByUser = <String, Set<String>>{};
  final Map<String, Set<String>> blockedByUser = <String, Set<String>>{};

  final Map<String, InterestProfile> _profiles = <String, InterestProfile>{};

  /// Seeded per-country activity.
  ///
  /// **Mock only.** A backend answers this with an aggregate over real posts;
  /// nothing in the app computes or caches these numbers itself. They exist so
  /// the map and the trending list can be judged at the scale they are designed
  /// for, which twenty-four seeded posts cannot show.
  static const Map<String, int> seededDailyPosts = <String, int>{
    'JP': 12400,
    'GB': 8200,
    'US': 15600,
    'IN': 11800,
    'KR': 6400,
    'DE': 5100,
    'FR': 4700,
    'BR': 7300,
    'OM': 4800,
    'ID': 5900,
    'KE': 2200,
    'MA': 1900,
    'IT': 3800,
    'ES': 3400,
    'TR': 3100,
    'EG': 2900,
    'MX': 4200,
    'NG': 3600,
    'ZA': 2100,
    'AU': 2800,
    'CA': 3300,
    'NL': 2400,
    'SE': 1400,
    'PL': 1800,
    'AE': 2600,
    'SA': 2300,
    'PK': 3900,
    'BD': 2700,
    'PH': 4100,
    'VN': 3200,
    'TH': 3500,
    'AR': 2900,
    'CO': 2200,
    'CL': 1600,
    'PE': 1500,
    'GR': 1200,
    'PT': 1300,
    'IE': 900,
    'NO': 800,
    'DK': 900,
    'FI': 700,
    'CH': 1100,
    'AT': 1000,
    'BE': 1200,
    'CZ': 1000,
    'RO': 1400,
    'UA': 1700,
    'IL': 1300,
    'JO': 800,
    'LB': 700,
    'QA': 900,
    'KW': 800,
    'BH': 500,
    'SG': 2000,
    'MY': 2500,
    'NZ': 900,
    'LK': 1100,
    'NP': 900,
    'GH': 1500,
    'TZ': 1000,
    'ET': 1200,
    'DZ': 1300,
    'TN': 900,
    'RS': 600,
    'HR': 500,
    'HU': 800,
  };

  // --- helpers the repositories share ---------------------------------------

  /// Simulated round-trip time. Zero latency completes on a microtask rather
  /// than a timer, so tests are not left holding one.
  Future<void> wait([double factor = 1]) {
    final Duration delay = latency * factor;
    return delay == Duration.zero
        ? Future<void>.value()
        : Future<void>.delayed(delay);
  }

  Post? findPost(String id) {
    final int index = posts.indexWhere((Post p) => p.id == id);
    return index == -1 ? null : posts[index];
  }

  /// Replaces a post in place, keeping feed order stable.
  Post replace(Post post) {
    final int index = posts.indexWhere((Post p) => p.id == post.id);
    if (index == -1) {
      posts.insert(0, post);
    } else {
      posts[index] = post;
    }
    return post;
  }

  Set<String> likes(String postId) =>
      likesByPost.putIfAbsent(postId, () => <String>{});

  Set<String> saves(String postId) =>
      savesByPost.putIfAbsent(postId, () => <String>{});

  Set<String> following(String userId) =>
      followingByUser.putIfAbsent(userId, () => <String>{});

  Set<String> blocked(String userId) =>
      blockedByUser.putIfAbsent(userId, () => <String>{});

  /// Posts a viewer is allowed to see: published, approved, not their own, not
  /// from someone they blocked, and aimed at where they are.
  List<Post> eligibleFor({required String viewerId, String? viewerCountry}) {
    final Set<String> hidden = blocked(viewerId);
    return posts
        .where((Post post) {
          if (!post.isVisibleToOthers) return false;
          if (post.creatorId == viewerId) return false;
          if (hidden.contains(post.creatorId)) return false;
          if (viewerCountry == null) return true;
          return post.targets(viewerCountry);
        })
        .toList(growable: false);
  }

  // --- interest profile persistence ----------------------------------------

  Future<InterestProfile> profile(String userId) async {
    final InterestProfile? cached = _profiles[userId];
    if (cached != null) return cached;
    final String? raw = await _preferences.getString(
      '$_profileKeyPrefix$userId',
    );
    if (raw == null) return _profiles[userId] = InterestProfile(userId: userId);
    try {
      return _profiles[userId] = InterestProfile.fromJson(
        jsonDecode(raw) as Map<String, dynamic>,
      );
    } on Object {
      return _profiles[userId] = InterestProfile(userId: userId);
    }
  }

  Future<void> storeProfile(InterestProfile profile) async {
    _profiles[profile.userId] = profile;
    await _preferences.setString(
      '$_profileKeyPrefix${profile.userId}',
      jsonEncode(profile.toJson()),
    );
  }

  Future<void> clearProfile(String userId) async {
    _profiles.remove(userId);
    await _preferences.remove('$_profileKeyPrefix$userId');
  }

  /// Applies an interaction to a post's counters, so a creator's numbers move
  /// the way they would with a backend behind them.
  Post bumpMetrics(Post post, FeedbackKind kind, {double? watchedFraction}) {
    final PostMetrics m = post.metrics;
    final PostMetrics next = switch (kind) {
      FeedbackKind.watch => m.copyWith(watches: m.watches + 1),
      FeedbackKind.complete => m.copyWith(completions: m.completions + 1),
      FeedbackKind.skip => m.copyWith(skips: m.skips + 1),
      FeedbackKind.share => m.copyWith(shares: m.shares + 1),
      _ => m,
    };
    return identical(next, m) ? post : replace(post.copyWith(metrics: next));
  }

  static final math.Random random = math.Random(31);
}
