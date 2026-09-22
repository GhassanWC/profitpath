import 'taxonomy.dart';

/// What the AI understood about a post.
///
/// This is a *proposal*. The creator can change every field of it before
/// publishing (see `AiContentProfile.edited`), and the stored profile is
/// whatever they approved — the model assists, it does not overrule.
final class AiContentProfile {
  const AiContentProfile({
    required this.category,
    required this.contentType,
    required this.intent,
    this.subcategories = const <String>[],
    this.topics = const <String>[],
    this.audience = const <String>[],
    this.language = 'en',
    this.detectedCountry,
    this.confidence = 0.0,
    this.modelId = '',
    this.editedByCreator = false,
  });

  factory AiContentProfile.fromJson(Map<String, dynamic> json) =>
      AiContentProfile(
        category: ContentCategory.fromSlug(
          json['category'] as String? ?? 'other',
        ),
        contentType: ContentType.fromSlug(
          json['contentType'] as String? ?? 'informational',
        ),
        intent: ContentType.fromSlug(json['intent'] as String? ?? 'discovery'),
        subcategories: _strings(json['subcategories']),
        topics: _strings(json['topics']),
        audience: _strings(json['audience']),
        language: json['language'] as String? ?? 'en',
        detectedCountry: json['detectedCountry'] as String?,
        confidence: (json['confidence'] as num?)?.toDouble() ?? 0.0,
        modelId: json['modelId'] as String? ?? '',
        editedByCreator: json['editedByCreator'] as bool? ?? false,
      );

  final ContentCategory category;
  final ContentType contentType;
  final ContentType intent;
  final List<String> subcategories;
  final List<String> topics;

  /// Who this looks like it is for, in plain words: "Travellers", "Food lovers".
  final List<String> audience;

  /// BCP 47 language tag of the content itself.
  final String language;

  /// ISO alpha-2 of a place the AI could identify *in* the content — which is
  /// not the same thing as where the creator is aiming it.
  final String? detectedCountry;

  /// 0..1. Shown to the creator, never to the viewer: a viewer should not have
  /// to reason about how sure a model was.
  final double confidence;

  /// Which model produced this, so a profile can be re-run when the provider
  /// changes without re-running everything.
  final String modelId;

  /// True once a creator has changed anything here.
  final bool editedByCreator;

  AiContentProfile copyWith({
    ContentCategory? category,
    ContentType? contentType,
    ContentType? intent,
    List<String>? subcategories,
    List<String>? topics,
    List<String>? audience,
    String? language,
    String? detectedCountry,
    bool? editedByCreator,
  }) => AiContentProfile(
    category: category ?? this.category,
    contentType: contentType ?? this.contentType,
    intent: intent ?? this.intent,
    subcategories: subcategories ?? this.subcategories,
    topics: topics ?? this.topics,
    audience: audience ?? this.audience,
    language: language ?? this.language,
    detectedCountry: detectedCountry ?? this.detectedCountry,
    confidence: confidence,
    modelId: modelId,
    editedByCreator: editedByCreator ?? this.editedByCreator,
  );

  /// Marks the profile as creator-authored. Any edit made in the composer goes
  /// through here so the distinction survives into the data layer.
  AiContentProfile edited({
    ContentCategory? category,
    ContentType? contentType,
    ContentType? intent,
    List<String>? subcategories,
    List<String>? topics,
    List<String>? audience,
    String? language,
  }) => copyWith(
    category: category,
    contentType: contentType,
    intent: intent,
    subcategories: subcategories,
    topics: topics,
    audience: audience,
    language: language,
    editedByCreator: true,
  );

  Map<String, dynamic> toJson() => <String, dynamic>{
    'category': category.slug,
    'contentType': contentType.slug,
    'intent': intent.slug,
    'subcategories': subcategories,
    'topics': topics,
    'audience': audience,
    'language': language,
    if (detectedCountry != null) 'detectedCountry': detectedCountry,
    'confidence': confidence,
    'modelId': modelId,
    'editedByCreator': editedByCreator,
  };
}

/// The sentence a viewer reads before deciding to watch.
///
/// The contract, enforced in [AiPreview.isHonest] and in every provider's
/// prompt, is that this explains the content rather than sells it. No
/// withheld payoff, no second person dare, no superlatives.
final class AiPreview {
  const AiPreview({
    required this.headline,
    required this.summary,
    required this.reasonToWatch,
    this.mediaLength,
    this.editedByCreator = false,
  });

  factory AiPreview.fromJson(Map<String, dynamic> json) => AiPreview(
    headline: json['headline'] as String,
    summary: json['summary'] as String,
    reasonToWatch: json['reasonToWatch'] as String,
    mediaLength: json['mediaLengthMs'] == null
        ? null
        : Duration(milliseconds: (json['mediaLengthMs'] as num).toInt()),
    editedByCreator: json['editedByCreator'] as bool? ?? false,
  );

  /// Four or five words. What this is.
  final String headline;

  /// One or two plain sentences. What actually happens in the content.
  final String summary;

  /// Why *this* viewer might care — stated as a possibility, not a promise.
  final String reasonToWatch;

  final Duration? mediaLength;
  final bool editedByCreator;

  /// The clickbait smell test, applied in the app rather than trusted to the
  /// prompt. Anything failing this is held back from publishing and sent back
  /// to the creator (and, on the server, back to the model).
  bool get isHonest => clickbaitFlags.isEmpty;

  List<String> get clickbaitFlags {
    final String text = '$headline $summary $reasonToWatch'.toLowerCase();
    return <String>[
      if (RegExp(
        r"you won'?t believe|wait for it|shocking|insane|"
        r'jaw-?dropping|mind-?blowing|gone wrong|you need to see',
      ).hasMatch(text))
        'Withholds what the content is',
      if (RegExp(
        r'\b(best|worst|craziest|greatest)\b[^.!?]{0,40}'
        r'\b(ever|in the world|of all time|you will ever)\b',
      ).hasMatch(text))
        'Unverifiable superlative',
      if (text.contains('!!') || RegExp(r'[A-Z]{5,}').hasMatch(headline))
        'Shouting',
    ];
  }

  AiPreview copyWith({
    String? headline,
    String? summary,
    String? reasonToWatch,
  }) => AiPreview(
    headline: headline ?? this.headline,
    summary: summary ?? this.summary,
    reasonToWatch: reasonToWatch ?? this.reasonToWatch,
    mediaLength: mediaLength,
    editedByCreator:
        editedByCreator ||
        headline != null ||
        summary != null ||
        reasonToWatch != null,
  );

  Map<String, dynamic> toJson() => <String, dynamic>{
    'headline': headline,
    'summary': summary,
    'reasonToWatch': reasonToWatch,
    if (mediaLength != null) 'mediaLengthMs': mediaLength!.inMilliseconds,
    'editedByCreator': editedByCreator,
  };
}

List<String> _strings(Object? value) =>
    (value as List<dynamic>? ?? const <dynamic>[]).cast<String>().toList(
      growable: false,
    );
