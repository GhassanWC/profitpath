import 'dart:math' as math;

import 'feedback_signal.dart';

/// One learned preference: how much this person leans toward a facet, and when
/// that was last true.
final class FacetAffinity {
  const FacetAffinity(this.value, this.updatedAt, {this.observations = 1});

  final double value;
  final DateTime updatedAt;
  final int observations;

  /// Affinities fade. Someone who skipped every hotel video in January should
  /// not be locked out of hotel videos for ever.
  double at(DateTime now, {Duration halfLife = const Duration(days: 21)}) {
    final double elapsed =
        now.difference(updatedAt).inSeconds / halfLife.inSeconds;
    if (elapsed <= 0) return value;
    return value * math.pow(0.5, elapsed).toDouble();
  }

  Map<String, dynamic> toJson() => <String, dynamic>{
    'v': value,
    't': updatedAt.toIso8601String(),
    'n': observations,
  };

  static FacetAffinity fromJson(Map<String, dynamic> json) => FacetAffinity(
    (json['v'] as num).toDouble(),
    DateTime.parse(json['t'] as String),
    observations: (json['n'] as num?)?.toInt() ?? 1,
  );
}

/// What the system has learned about one viewer.
///
/// Immutable: applying a signal returns a new profile, which keeps the update
/// rule in one place and makes it straightforward to test.
final class InterestProfile {
  const InterestProfile({
    required this.userId,
    this.affinities = const <String, FacetAffinity>{},
    this.seenPostIds = const <String>{},
  });

  factory InterestProfile.fromJson(Map<String, dynamic> json) =>
      InterestProfile(
        userId: json['userId'] as String,
        affinities:
            (json['affinities'] as Map<String, dynamic>? ??
                    const <String, dynamic>{})
                .map(
                  (String key, Object? value) =>
                      MapEntry<String, FacetAffinity>(
                        key,
                        FacetAffinity.fromJson(value! as Map<String, dynamic>),
                      ),
                ),
        seenPostIds: (json['seen'] as List<dynamic>? ?? const <dynamic>[])
            .cast<String>()
            .toSet(),
      );

  final String userId;
  final Map<String, FacetAffinity> affinities;

  /// Posts whose preview this person has already made a decision about. The
  /// feed does not show the same preview twice in a session.
  final Set<String> seenPostIds;

  /// How much a signal moves an affinity.
  ///
  /// Note the asymmetry, which is the product's discovery philosophy expressed
  /// as numbers: a save moves four times as far as a skip moves back. Skipping
  /// is the cheapest action in the app and must stay cheap to be honest — if a
  /// skip cost as much as a save, people would start hesitating over it and the
  /// signal would go to noise.
  static const Map<FeedbackKind, double> weights = <FeedbackKind, double>{
    FeedbackKind.previewSeen: 0.0,
    FeedbackKind.watch: 0.45,
    FeedbackKind.complete: 1.0,
    FeedbackKind.abandon: -0.1,
    FeedbackKind.skip: -0.25,
    FeedbackKind.like: 0.8,
    FeedbackKind.unlike: -0.3,
    FeedbackKind.save: 1.0,
    FeedbackKind.unsave: -0.3,
    FeedbackKind.share: 0.9,
    FeedbackKind.comment: 0.7,
    FeedbackKind.followCreator: 1.1,
    FeedbackKind.notInterested: -1.4,
    FeedbackKind.report: -2.0,
  };

  /// Facet prefixes that describe a whole area of interest rather than one
  /// specific thing.
  static const Set<String> broadFacets = <String>{
    'category',
    'lang',
    'country',
    'type',
    'intent',
  };

  /// A negative signal is applied at full strength to the narrow facets and at
  /// a fifth of that to the broad ones.
  ///
  /// This is the rule that produces the behaviour the product is after: skip a
  /// luxury-hotel video and `sub:travel/luxury-hotels` drops hard while
  /// `category:travel` barely moves, so the next travel post still gets shown.
  static const double broadNegativeDamping = 0.2;
  static const double broadPositiveDamping = 0.6;

  /// Returns a new profile with [signal] folded in.
  InterestProfile applying(FeedbackSignal signal) {
    final double base = weights[signal.kind] ?? 0;
    final Map<String, FacetAffinity> next = Map<String, FacetAffinity>.of(
      affinities,
    );

    // An abandoned watch is scaled by how much was actually watched: leaving at
    // 90% is nearly a completion, leaving at 5% is close to a skip.
    final double scaled = signal.kind == FeedbackKind.abandon
        ? -0.35 * (1 - (signal.watchedFraction ?? 0).clamp(0.0, 1.0))
        : base;

    if (scaled != 0) {
      for (final String facet in signal.facets) {
        final bool broad = broadFacets.contains(facet.split(':').first);
        final double damping = scaled < 0
            ? (broad ? broadNegativeDamping : 1.0)
            : (broad ? broadPositiveDamping : 1.0);
        final FacetAffinity? existing = next[facet];
        final double decayed = existing?.at(signal.createdAt) ?? 0;
        next[facet] = FacetAffinity(
          (decayed + scaled * damping).clamp(-3.0, 3.0),
          signal.createdAt,
          observations: (existing?.observations ?? 0) + 1,
        );
      }
    }

    return InterestProfile(
      userId: userId,
      affinities: next,
      seenPostIds: signal.kind == FeedbackKind.previewSeen
          ? seenPostIds
          : <String>{...seenPostIds, signal.postId},
    );
  }

  /// The person's current leaning toward a set of facets, squashed into -1..1
  /// so no single runaway facet can dominate a ranking.
  double affinityFor(Iterable<String> facets, {DateTime? now}) {
    final DateTime at = now ?? DateTime.now();
    double sum = 0;
    for (final String facet in facets) {
      sum += affinities[facet]?.at(at) ?? 0;
    }
    // tanh: generous in the middle, flat at the extremes.
    final double e = math.exp(-2 * (sum / 3));
    return (2 / (1 + e)) - 1;
  }

  /// The strongest facets, for the "what we think you're into" surfaces and for
  /// debugging a ranking decision.
  List<MapEntry<String, double>> topFacets({int limit = 8, DateTime? now}) {
    final DateTime at = now ?? DateTime.now();
    final List<MapEntry<String, double>> entries =
        affinities.entries
            .map(
              (MapEntry<String, FacetAffinity> e) =>
                  MapEntry<String, double>(e.key, e.value.at(at)),
            )
            .where((MapEntry<String, double> e) => e.value.abs() > 0.05)
            .toList()
          ..sort(
            (MapEntry<String, double> a, MapEntry<String, double> b) =>
                b.value.compareTo(a.value),
          );
    return entries.take(limit).toList(growable: false);
  }

  bool hasSeen(String postId) => seenPostIds.contains(postId);

  InterestProfile forgetSeen() =>
      InterestProfile(userId: userId, affinities: affinities);

  Map<String, dynamic> toJson() => <String, dynamic>{
    'userId': userId,
    'affinities': affinities.map(
      (String key, FacetAffinity value) =>
          MapEntry<String, Object>(key, value.toJson()),
    ),
    'seen': seenPostIds.toList(growable: false),
  };
}
