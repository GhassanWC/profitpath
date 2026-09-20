import 'post.dart';

/// What a viewer did with a preview or a post.
///
/// The important one is [skip]. A skip is *information*, not a verdict: it says
/// "not this, for me, right now", and it is recorded with enough context
/// (category, subcategory, topics, language, creator) that the system can later
/// tell "doesn't like travel" apart from "likes travel, not luxury hotels".
/// Nothing in this app treats a skip as a mark against the post itself.
enum FeedbackKind {
  /// The preview was shown. An impression, carrying no judgement.
  previewSeen,
  watch,

  /// Watched to the end.
  complete,

  /// Left the video early. Carries [FeedbackSignal.watchedFraction].
  abandon,
  skip,
  like,
  unlike,
  save,
  unsave,
  share,
  comment,
  followCreator,

  /// The viewer said so explicitly. Weighted far more heavily than a skip,
  /// because it was deliberate.
  notInterested,
  report;

  bool get isPositive => const <FeedbackKind>{
    FeedbackKind.watch,
    FeedbackKind.complete,
    FeedbackKind.like,
    FeedbackKind.save,
    FeedbackKind.share,
    FeedbackKind.comment,
    FeedbackKind.followCreator,
  }.contains(this);

  bool get isNegative => const <FeedbackKind>{
    FeedbackKind.skip,
    FeedbackKind.notInterested,
    FeedbackKind.report,
  }.contains(this);

  static FeedbackKind fromName(String? raw) => FeedbackKind.values.firstWhere(
    (FeedbackKind k) => k.name == raw,
    orElse: () => FeedbackKind.previewSeen,
  );
}

/// Where the interaction happened, so the same action from the map and from the
/// feed can be told apart later.
enum FeedbackSurface { feed, country, profile, search, watch }

final class FeedbackSignal {
  const FeedbackSignal({
    required this.id,
    required this.userId,
    required this.postId,
    required this.kind,
    required this.createdAt,
    this.surface = FeedbackSurface.feed,
    this.watchedFraction,
    this.previewDwell,
    this.facets = const <String>[],
  });

  /// Builds a signal from the post it is about, capturing the content facets at
  /// the moment of the interaction. They are copied rather than looked up later
  /// because a post's AI profile can be re-run, and a signal should stay a
  /// record of what the person actually reacted to.
  factory FeedbackSignal.forPost({
    required String id,
    required String userId,
    required Post post,
    required FeedbackKind kind,
    required DateTime createdAt,
    FeedbackSurface surface = FeedbackSurface.feed,
    double? watchedFraction,
    Duration? previewDwell,
  }) => FeedbackSignal(
    id: id,
    userId: userId,
    postId: post.id,
    kind: kind,
    surface: surface,
    watchedFraction: watchedFraction,
    previewDwell: previewDwell,
    facets: facetsOf(post),
    createdAt: createdAt,
  );

  factory FeedbackSignal.fromJson(Map<String, dynamic> json) => FeedbackSignal(
    id: json['id'] as String,
    userId: json['userId'] as String,
    postId: json['postId'] as String,
    kind: FeedbackKind.fromName(json['kind'] as String?),
    surface: FeedbackSurface.values.firstWhere(
      (FeedbackSurface s) => s.name == json['surface'],
      orElse: () => FeedbackSurface.feed,
    ),
    watchedFraction: (json['watchedFraction'] as num?)?.toDouble(),
    previewDwell: json['previewDwellMs'] == null
        ? null
        : Duration(milliseconds: (json['previewDwellMs'] as num).toInt()),
    facets: (json['facets'] as List<dynamic>? ?? const <dynamic>[])
        .cast<String>()
        .toList(growable: false),
    createdAt: DateTime.parse(json['createdAt'] as String),
  );

  final String id;
  final String userId;
  final String postId;
  final FeedbackKind kind;
  final FeedbackSurface surface;

  /// 0..1 — how much of the video was actually watched.
  final double? watchedFraction;

  /// How long the preview was on screen before the decision. A two-second skip
  /// and a twenty-second skip are not the same event.
  final Duration? previewDwell;

  /// The content facets this interaction was about. See [facetsOf].
  final List<String> facets;

  final DateTime createdAt;

  /// The vocabulary the interest profile is keyed on.
  ///
  /// Facets are deliberately at mixed specificity — `category:travel` next to
  /// `sub:travel/luxury-hotels` — so that a negative signal can be applied
  /// hard to the narrow facet and barely at all to the broad one.
  static List<String> facetsOf(Post post) {
    final List<String> facets = <String>['creator:${post.creatorId}'];
    final String category = post.profile?.category.slug ?? 'other';
    facets.add('category:$category');
    for (final String sub in post.profile?.subcategories ?? const <String>[]) {
      facets.add('sub:$category/${_slug(sub)}');
    }
    for (final String topic in post.profile?.topics ?? const <String>[]) {
      facets.add('topic:${_slug(topic)}');
    }
    if (post.profile != null) {
      facets
        ..add('type:${post.profile!.contentType.slug}')
        ..add('intent:${post.profile!.intent.slug}')
        ..add('lang:${post.profile!.language}');
    }
    if (post.originCountry != null) facets.add('country:${post.originCountry}');
    return List<String>.unmodifiable(facets);
  }

  Map<String, dynamic> toJson() => <String, dynamic>{
    'id': id,
    'userId': userId,
    'postId': postId,
    'kind': kind.name,
    'surface': surface.name,
    if (watchedFraction != null) 'watchedFraction': watchedFraction,
    if (previewDwell != null) 'previewDwellMs': previewDwell!.inMilliseconds,
    'facets': facets,
    'createdAt': createdAt.toIso8601String(),
  };
}

String _slug(String raw) =>
    raw.trim().toLowerCase().replaceAll(RegExp(r'[\s_]+'), '-');
