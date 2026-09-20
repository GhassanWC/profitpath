import 'ai_profile.dart';
import 'taxonomy.dart';

enum MediaType {
  video,
  image,
  text;

  static MediaType fromName(String? raw) => MediaType.values.firstWhere(
    (MediaType m) => m.name == raw,
    orElse: () => MediaType.text,
  );
}

enum PostStatus {
  draft,
  analyzing,
  published,
  removed;

  static PostStatus fromName(String? raw) => PostStatus.values.firstWhere(
    (PostStatus s) => s.name == raw,
    orElse: () => PostStatus.draft,
  );
}

/// Where a post sits with moderation. A post is only ever shown to strangers
/// while it is [approved]; everything else is visible to its creator alone.
enum ModerationStatus {
  pending,
  approved,
  limited,
  rejected;

  bool get isPubliclyVisible => this == ModerationStatus.approved;

  static ModerationStatus fromName(String? raw) =>
      ModerationStatus.values.firstWhere(
        (ModerationStatus s) => s.name == raw,
        orElse: () => ModerationStatus.pending,
      );
}

/// Counters.
///
/// [watches] and [skips] lead this list on purpose: they are the signals the
/// product actually runs on. Likes are kept because people expect to be able to
/// say "that was good", not because anything ranks on them — see
/// `RecommendationService`.
final class PostMetrics {
  const PostMetrics({
    this.watches = 0,
    this.skips = 0,
    this.completions = 0,
    this.likes = 0,
    this.comments = 0,
    this.shares = 0,
    this.saves = 0,
  });

  factory PostMetrics.fromJson(Map<String, dynamic> json) => PostMetrics(
    watches: (json['watches'] as num?)?.toInt() ?? 0,
    skips: (json['skips'] as num?)?.toInt() ?? 0,
    completions: (json['completions'] as num?)?.toInt() ?? 0,
    likes: (json['likes'] as num?)?.toInt() ?? 0,
    comments: (json['comments'] as num?)?.toInt() ?? 0,
    shares: (json['shares'] as num?)?.toInt() ?? 0,
    saves: (json['saves'] as num?)?.toInt() ?? 0,
  );

  final int watches;
  final int skips;
  final int completions;
  final int likes;
  final int comments;
  final int shares;
  final int saves;

  /// Of the people who saw the preview, how many chose to watch. This is the
  /// number that tells a creator whether their preview was honest — a high
  /// watch rate with a low completion rate means the preview oversold.
  double get watchRate =>
      (watches + skips) == 0 ? 0 : watches / (watches + skips);

  double get completionRate => watches == 0 ? 0 : completions / watches;

  PostMetrics copyWith({
    int? watches,
    int? skips,
    int? completions,
    int? likes,
    int? comments,
    int? shares,
    int? saves,
  }) => PostMetrics(
    watches: watches ?? this.watches,
    skips: skips ?? this.skips,
    completions: completions ?? this.completions,
    likes: likes ?? this.likes,
    comments: comments ?? this.comments,
    shares: shares ?? this.shares,
    saves: saves ?? this.saves,
  );

  Map<String, dynamic> toJson() => <String, dynamic>{
    'watches': watches,
    'skips': skips,
    'completions': completions,
    'likes': likes,
    'comments': comments,
    'shares': shares,
    'saves': saves,
  };
}

/// A piece of content, where its creator aimed it, and what the AI made of it.
final class Post {
  const Post({
    required this.id,
    required this.creatorId,
    required this.mediaType,
    required this.caption,
    required this.creatorIntent,
    required this.targetCountries,
    required this.createdAt,
    required this.updatedAt,
    this.mediaUrl,
    this.thumbnailUrl,
    this.mediaDuration,
    this.aspectRatio = 9 / 16,
    this.originCountry,
    this.targetCities = const <String>[],
    this.profile,
    this.preview,
    this.status = PostStatus.draft,
    this.moderation = ModerationStatus.pending,
    this.metrics = const PostMetrics(),
  });

  factory Post.fromJson(Map<String, dynamic> json) => Post(
    id: json['id'] as String,
    creatorId: json['creatorId'] as String,
    mediaType: MediaType.fromName(json['mediaType'] as String?),
    mediaUrl: json['mediaUrl'] as String?,
    thumbnailUrl: json['thumbnailUrl'] as String?,
    mediaDuration: json['mediaDurationMs'] == null
        ? null
        : Duration(milliseconds: (json['mediaDurationMs'] as num).toInt()),
    aspectRatio: (json['aspectRatio'] as num?)?.toDouble() ?? 9 / 16,
    caption: json['caption'] as String? ?? '',
    creatorIntent: json['creatorIntent'] as String? ?? '',
    originCountry: (json['originCountry'] as String?)?.toUpperCase(),
    targetCountries: _codes(json['targetCountries']),
    targetCities: (json['targetCities'] as List<dynamic>? ?? const <dynamic>[])
        .cast<String>()
        .toList(growable: false),
    profile: json['profile'] == null
        ? null
        : AiContentProfile.fromJson(json['profile'] as Map<String, dynamic>),
    preview: json['preview'] == null
        ? null
        : AiPreview.fromJson(json['preview'] as Map<String, dynamic>),
    status: PostStatus.fromName(json['status'] as String?),
    moderation: ModerationStatus.fromName(json['moderation'] as String?),
    metrics: PostMetrics.fromJson(
      json['metrics'] as Map<String, dynamic>? ?? const <String, dynamic>{},
    ),
    createdAt: DateTime.parse(json['createdAt'] as String),
    updatedAt: DateTime.parse(json['updatedAt'] as String),
  );

  final String id;
  final String creatorId;

  final MediaType mediaType;

  /// Absolute URL, or an `asset://` path for the content bundled with the
  /// prototype. Null for a text-only post.
  final String? mediaUrl;
  final String? thumbnailUrl;
  final Duration? mediaDuration;
  final double aspectRatio;

  final String caption;

  /// The creator's own words about what they want this post to achieve. This is
  /// the input the AI reasons from, and it is never rewritten without them
  /// seeing it.
  final String creatorIntent;

  /// Where the post is *from*, which is only a display detail.
  final String? originCountry;

  /// Where the creator chose to send it, as ISO alpha-2 codes. An empty list
  /// means global — see [isGlobal].
  final List<String> targetCountries;
  final List<String> targetCities;

  final AiContentProfile? profile;
  final AiPreview? preview;

  final PostStatus status;
  final ModerationStatus moderation;
  final PostMetrics metrics;

  final DateTime createdAt;
  final DateTime updatedAt;

  /// An empty target list is the creator saying "anywhere", not an error.
  bool get isGlobal => targetCountries.isEmpty;

  bool get hasAiAnalysis => profile != null && preview != null;

  bool get isPlayable =>
      mediaType == MediaType.video && (mediaUrl?.isNotEmpty ?? false);

  bool get isVisibleToOthers =>
      status == PostStatus.published && moderation.isPubliclyVisible;

  ContentCategory get category => profile?.category ?? ContentCategory.other;

  /// Is this post aimed at [countryCode]? Global posts reach everywhere.
  bool targets(String countryCode) =>
      isGlobal || targetCountries.contains(countryCode.toUpperCase());

  Post copyWith({
    String? id,
    MediaType? mediaType,
    String? mediaUrl,
    String? thumbnailUrl,
    Duration? mediaDuration,
    double? aspectRatio,
    String? caption,
    String? creatorIntent,
    String? originCountry,
    List<String>? targetCountries,
    List<String>? targetCities,
    AiContentProfile? profile,
    AiPreview? preview,
    PostStatus? status,
    ModerationStatus? moderation,
    PostMetrics? metrics,
    DateTime? updatedAt,
  }) => Post(
    id: id ?? this.id,
    creatorId: creatorId,
    mediaType: mediaType ?? this.mediaType,
    mediaUrl: mediaUrl ?? this.mediaUrl,
    thumbnailUrl: thumbnailUrl ?? this.thumbnailUrl,
    mediaDuration: mediaDuration ?? this.mediaDuration,
    aspectRatio: aspectRatio ?? this.aspectRatio,
    caption: caption ?? this.caption,
    creatorIntent: creatorIntent ?? this.creatorIntent,
    originCountry: originCountry ?? this.originCountry,
    targetCountries: targetCountries ?? this.targetCountries,
    targetCities: targetCities ?? this.targetCities,
    profile: profile ?? this.profile,
    preview: preview ?? this.preview,
    status: status ?? this.status,
    moderation: moderation ?? this.moderation,
    metrics: metrics ?? this.metrics,
    createdAt: createdAt,
    updatedAt: updatedAt ?? this.updatedAt,
  );

  Map<String, dynamic> toJson() => <String, dynamic>{
    'id': id,
    'creatorId': creatorId,
    'mediaType': mediaType.name,
    if (mediaUrl != null) 'mediaUrl': mediaUrl,
    if (thumbnailUrl != null) 'thumbnailUrl': thumbnailUrl,
    if (mediaDuration != null) 'mediaDurationMs': mediaDuration!.inMilliseconds,
    'aspectRatio': aspectRatio,
    'caption': caption,
    'creatorIntent': creatorIntent,
    if (originCountry != null) 'originCountry': originCountry,
    'targetCountries': targetCountries,
    'targetCities': targetCities,
    if (profile != null) 'profile': profile!.toJson(),
    if (preview != null) 'preview': preview!.toJson(),
    'status': status.name,
    'moderation': moderation.name,
    'metrics': metrics.toJson(),
    'createdAt': createdAt.toIso8601String(),
    'updatedAt': updatedAt.toIso8601String(),
  };

  @override
  bool operator ==(Object other) => other is Post && other.id == id;

  @override
  int get hashCode => id.hashCode;
}

List<String> _codes(Object? value) =>
    (value as List<dynamic>? ?? const <dynamic>[])
        .cast<String>()
        .map((String c) => c.toUpperCase())
        .toList(growable: false);
