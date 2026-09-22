import '../../models/app_notification.dart';
import '../../models/comment.dart';
import '../../models/country.dart';
import '../../models/feedback_signal.dart';
import '../../models/interest_profile.dart';
import '../../models/post.dart';
import '../../models/user.dart';

/// The boundary between the product and wherever its data happens to live.
///
/// Every screen talks to these interfaces and nothing else, so the in-memory
/// implementation the prototype runs on and an HTTP or Firestore one are
/// interchangeable without a single widget changing. Implementations throw
/// `WainzoException` subclasses and nothing else.
abstract interface class PostRepository {
  /// Posts a person is eligible to see, already ranked.
  ///
  /// Eligibility is geographic — the viewer's country has to be in the post's
  /// targets, or the post has to be global. Ranking is the ranking service's
  /// job; a repository only supplies candidates and applies the ordering it is
  /// handed.
  Future<List<Post>> feed({
    required String viewerId,
    String? viewerCountry,
    Set<String> exclude = const <String>{},
    int limit = 20,
  });

  /// Everything aimed at one country, newest first.
  Future<List<Post>> inCountry(
    String countryCode, {
    int limit = 40,
    String? category,
  });

  Future<List<Post>> byCreator(
    String creatorId, {
    bool includeUnpublished = false,
  });

  Future<List<Post>> saved(String userId);

  Future<Post> byId(String id);

  /// Stores a post that is not visible to anyone else yet.
  Future<Post> saveDraft(Post draft);

  Future<List<Post>> drafts(String creatorId);

  /// Runs moderation, then makes the post visible to its target countries.
  Future<Post> publish(Post post);

  Future<void> delete(String postId);

  /// Returns the post with its counters updated, so a caller never has to guess.
  Future<Post> setLiked({
    required String postId,
    required String userId,
    required bool liked,
  });

  Future<Post> setSaved({
    required String postId,
    required String userId,
    required bool saved,
  });

  Future<Post> registerShare({required String postId, required String userId});

  Future<bool> isLiked({required String postId, required String userId});

  Future<bool> isSaved({required String postId, required String userId});

  /// How much live content each country has for this viewer. Drives the map's
  /// activity and the trending list — these are real counts over the eligible
  /// set, never a decorative number.
  Future<List<CountryActivity>> activity({
    String? viewerCountry,
    int limit = 0,
  });
}

abstract interface class UserRepository {
  Future<WainzoUser> byId(String id);

  Future<WainzoUser?> byUsername(String username);

  Future<void> setFollowing({
    required String userId,
    required String targetId,
    required bool following,
  });

  Future<bool> isFollowing({required String userId, required String targetId});

  Future<void> block({required String userId, required String targetId});

  Future<Set<String>> blocked(String userId);

  Future<WainzoUser> update(WainzoUser user);

  /// The countries this creator has sent content to, with how many posts each.
  Future<Map<String, int>> contentReach(String creatorId);

  /// Removes the account and everything attached to it.
  Future<void> deleteAccount(String userId);
}

abstract interface class CommentRepository {
  Future<List<PostComment>> forPost(String postId);

  Future<PostComment> add({
    required String postId,
    required String authorId,
    required String body,
  });

  Future<void> delete(String commentId);

  Future<PostComment> setLiked({
    required String commentId,
    required bool liked,
  });
}

abstract interface class NotificationRepository {
  Future<List<AppNotification>> forUser(String userId);

  Future<int> unreadCount(String userId);

  Future<void> markRead(String notificationId);

  Future<void> markAllRead(String userId);
}

/// Where watch/skip and the rest of the signals go.
///
/// Separate from [PostRepository] because these writes are fire-and-forget,
/// high-volume and must never block the UI: skipping has to stay instant.
abstract interface class FeedbackRepository {
  Future<void> record(FeedbackSignal signal);

  Future<InterestProfile> profileFor(String userId);

  /// Signals for one user, newest first. Used to rebuild an interest profile
  /// from scratch, and by the creator-facing "how did this land" view.
  Future<List<FeedbackSignal>> history(String userId, {int limit = 200});

  /// Clears the learned profile. A person can always ask for that.
  Future<void> reset(String userId);
}

abstract interface class CountryRepository {
  Future<List<Country>> all();

  Future<Country?> byCode(String code);

  Future<List<Country>> search(String query);

  /// The topics currently moving in a country, derived from its live posts.
  Future<List<String>> trendingTopics(String countryCode, {int limit = 6});
}
