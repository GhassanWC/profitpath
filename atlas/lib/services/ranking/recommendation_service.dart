import 'dart:math' as math;

import '../../models/feedback_signal.dart';
import '../../models/interest_profile.dart';
import '../../models/post.dart';

/// A post with the reasons it was ranked where it was.
///
/// The components are kept rather than collapsed into one number so a ranking
/// decision can be explained — to a creator asking why their post is not
/// moving, and to whoever is tuning the weights.
final class RankedPost {
  const RankedPost({
    required this.post,
    required this.score,
    required this.geo,
    required this.interest,
    required this.freshness,
    required this.honesty,
    required this.exploration,
  });

  final Post post;
  final double score;

  /// 1.0 when the creator named this viewer's country, lower when the post is
  /// global. Creator choice outranks everything else the system knows.
  final double geo;

  /// -1..1, from the learned interest profile.
  final double interest;
  final double freshness;

  /// Did the preview tell the truth? Derived from completion rate against a
  /// prior, never from likes.
  final double honesty;

  /// The deliberate slice of the feed that is not optimised.
  final double exploration;

  Map<String, double> get breakdown => <String, double>{
    'geo': geo,
    'interest': interest,
    'freshness': freshness,
    'honesty': honesty,
    'exploration': exploration,
  };
}

/// How the feed is ordered.
///
/// The rules this encodes, which are product decisions rather than tuning:
///
/// * **Creator targeting is the strongest signal.** A creator who chose Japan
///   gets shown in Japan. Ranking reorders eligible posts; it never overrules
///   who is eligible.
/// * **Likes are not an input.** A post with no likes is not penalised. What
///   quality means here is whether people who chose to watch stayed — which
///   measures whether the preview was honest, not whether the post was popular.
/// * **A new post is not starved.** Completion rate is blended against a prior
///   so a post with two watches is not ranked as though its rate were certain.
/// * **A skip is narrow.** The penalty lands on the specific thing skipped,
///   through [InterestProfile], not on the whole category.
/// * **Some of the feed is not optimised at all.** [Weights.exploration] keeps
///   a slice open for posts the profile has no opinion about, so a person's
///   feed cannot collapse into the first thing they happened to watch.
final class RecommendationService {
  const RecommendationService({
    this.weights = const Weights(),
    math.Random? random,
  }) : _random = random;

  final Weights weights;
  final math.Random? _random;

  /// Orders [candidates] for one viewer. Candidates are assumed to already be
  /// geographically eligible — this decides the order, not the audience.
  List<RankedPost> rank({
    required List<Post> candidates,
    required InterestProfile profile,
    String? viewerCountry,
    DateTime? now,
    bool skipSeen = true,
  }) {
    final DateTime at = now ?? DateTime.now();
    final math.Random random =
        _random ?? math.Random(profile.userId.hashCode ^ at.day);

    final List<RankedPost> ranked = <RankedPost>[];
    for (final Post post in candidates) {
      if (!post.isVisibleToOthers) continue;
      if (skipSeen && profile.hasSeen(post.id)) continue;
      ranked.add(
        score(
          post: post,
          profile: profile,
          viewerCountry: viewerCountry,
          now: at,
          noise: random.nextDouble(),
        ),
      );
    }

    ranked.sort((RankedPost a, RankedPost b) => b.score.compareTo(a.score));
    return ranked;
  }

  RankedPost score({
    required Post post,
    required InterestProfile profile,
    String? viewerCountry,
    DateTime? now,
    double noise = 0,
  }) {
    final DateTime at = now ?? DateTime.now();

    final double geo =
        viewerCountry != null && post.targetCountries.contains(viewerCountry)
        ? 1.0
        : post.isGlobal
        ? 0.55
        : 0.3;

    final double interest = profile.affinityFor(
      FeedbackSignal.facetsOf(post),
      now: at,
    );

    // Half-life of two days: a week-old post is still reachable, it just isn't
    // leading the feed.
    final double ageDays = at.difference(post.createdAt).inMinutes / (60 * 24);
    final double freshness = math.pow(0.5, math.max(0, ageDays) / 2).toDouble();

    final double honesty = _honesty(post);

    // Exploration is largest where the profile has least to say, so the slice
    // shrinks as the system learns rather than staying a fixed tax on the feed.
    final double exploration = noise * (1 - interest.abs());

    final double total =
        weights.geo * geo +
        weights.interest * interest +
        weights.freshness * freshness +
        weights.honesty * honesty +
        weights.exploration * exploration;

    return RankedPost(
      post: post,
      score: total,
      geo: geo,
      interest: interest,
      freshness: freshness,
      honesty: honesty,
      exploration: exploration,
    );
  }

  /// Completion rate, blended toward [Weights.priorCompletionRate] by a prior
  /// worth [Weights.priorWatches] watches.
  ///
  /// The blend is the whole point: a post with three watches and one completion
  /// has a 33% rate, and treating that as fact would bury it before anybody
  /// saw it. With the prior, it sits near the middle until there is enough
  /// evidence to move it.
  double _honesty(Post post) {
    final double prior = weights.priorWatches;
    final int watches = post.metrics.watches;
    final int completions = post.metrics.completions;
    return (completions + prior * weights.priorCompletionRate) /
        (watches + prior);
  }
}

/// Tunable. Kept as data so an experiment is a configuration change.
final class Weights {
  const Weights({
    this.geo = 1.0,
    this.interest = 0.75,
    this.freshness = 0.45,
    this.honesty = 0.35,
    this.exploration = 0.3,
    this.priorWatches = 12,
    this.priorCompletionRate = 0.55,
  });

  final double geo;
  final double interest;
  final double freshness;
  final double honesty;
  final double exploration;

  /// How many watches of evidence the prior is worth.
  final double priorWatches;
  final double priorCompletionRate;
}
