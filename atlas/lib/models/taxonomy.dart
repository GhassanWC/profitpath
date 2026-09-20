import 'package:flutter/painting.dart';

import '../core/theme/atlas_colors.dart';

/// What a post is about.
///
/// Deliberately *not* an enum. The categories below are the set the MVP ships
/// with, but the backend owns the vocabulary: a slug this build has never seen
/// arrives, is kept, and renders with a humanised label instead of crashing or
/// being silently dropped. Nothing in the UI may switch on a specific category.
final class ContentCategory {
  const ContentCategory._(this.slug, this._label, this._swatchIndex);

  /// Resolves a slug against the known set, falling back to a display-only
  /// category so unknown vocabulary survives a round trip.
  factory ContentCategory.fromSlug(String slug) {
    final String normalised = _normalise(slug);
    return _bySlug[normalised] ??
        ContentCategory._(normalised, _humanise(normalised), null);
  }

  final String slug;
  final String _label;
  final int? _swatchIndex;

  String get label => _label;

  /// A 6px dot, and nothing more. Categories do not get to colour a screen.
  Color get swatch =>
      AtlasColors.categorySwatches[(_swatchIndex ?? slug.hashCode.abs()) %
          AtlasColors.categorySwatches.length];

  static const ContentCategory travel = ContentCategory._(
    'travel',
    'Travel',
    0,
  );
  static const ContentCategory food = ContentCategory._('food', 'Food', 3);
  static const ContentCategory technology = ContentCategory._(
    'technology',
    'Technology',
    1,
  );
  static const ContentCategory business = ContentCategory._(
    'business',
    'Business',
    5,
  );
  static const ContentCategory education = ContentCategory._(
    'education',
    'Education',
    6,
  );
  static const ContentCategory entertainment = ContentCategory._(
    'entertainment',
    'Entertainment',
    2,
  );
  static const ContentCategory sports = ContentCategory._(
    'sports',
    'Sports',
    7,
  );
  static const ContentCategory lifestyle = ContentCategory._(
    'lifestyle',
    'Lifestyle',
    4,
  );
  static const ContentCategory culture = ContentCategory._(
    'culture',
    'Culture',
    2,
  );
  static const ContentCategory news = ContentCategory._('news', 'News', 5);
  static const ContentCategory photography = ContentCategory._(
    'photography',
    'Photography',
    1,
  );
  static const ContentCategory fashion = ContentCategory._(
    'fashion',
    'Fashion',
    4,
  );
  static const ContentCategory products = ContentCategory._(
    'products',
    'Products',
    3,
  );
  static const ContentCategory events = ContentCategory._(
    'events',
    'Events',
    6,
  );
  static const ContentCategory opinion = ContentCategory._(
    'opinion',
    'Opinion',
    0,
  );
  static const ContentCategory question = ContentCategory._(
    'question',
    'Question',
    7,
  );
  static const ContentCategory discussion = ContentCategory._(
    'discussion',
    'Discussion',
    1,
  );
  static const ContentCategory other = ContentCategory._('other', 'Other', 6);

  /// The set this build ships with. The picker renders this list; it does not
  /// assume it is the whole vocabulary.
  static const List<ContentCategory> initial = <ContentCategory>[
    travel,
    food,
    technology,
    business,
    education,
    entertainment,
    sports,
    lifestyle,
    culture,
    news,
    photography,
    fashion,
    products,
    events,
    opinion,
    question,
    discussion,
    other,
  ];

  static final Map<String, ContentCategory> _bySlug = <String, ContentCategory>{
    for (final ContentCategory c in initial) c.slug: c,
  };

  @override
  bool operator ==(Object other) =>
      other is ContentCategory && other.slug == slug;

  @override
  int get hashCode => slug.hashCode;

  @override
  String toString() => slug;
}

/// One vocabulary doing two jobs: what a post *is* (`contentType`) and what it
/// is *for* (`intent`). Extensible for the same reason [ContentCategory] is.
final class ContentType {
  const ContentType._(this.slug, this._label);

  factory ContentType.fromSlug(String slug) {
    final String normalised = _normalise(slug);
    return _bySlug[normalised] ??
        ContentType._(normalised, _humanise(normalised));
  }

  final String slug;
  final String _label;

  String get label => _label;

  static const ContentType informational = ContentType._(
    'informational',
    'Informational',
  );
  static const ContentType entertainment = ContentType._(
    'entertainment',
    'Entertainment',
  );
  static const ContentType promotional = ContentType._(
    'promotional',
    'Promotional',
  );
  static const ContentType question = ContentType._('question', 'Question');
  static const ContentType discussion = ContentType._(
    'discussion',
    'Discussion',
  );
  static const ContentType personal = ContentType._('personal', 'Personal');
  static const ContentType educational = ContentType._(
    'educational',
    'Educational',
  );
  static const ContentType discovery = ContentType._('discovery', 'Discovery');

  static const List<ContentType> initial = <ContentType>[
    informational,
    entertainment,
    promotional,
    question,
    discussion,
    personal,
    educational,
    discovery,
  ];

  static final Map<String, ContentType> _bySlug = <String, ContentType>{
    for (final ContentType t in initial) t.slug: t,
  };

  @override
  bool operator ==(Object other) => other is ContentType && other.slug == slug;

  @override
  int get hashCode => slug.hashCode;

  @override
  String toString() => slug;
}

String _normalise(String raw) =>
    raw.trim().toLowerCase().replaceAll(RegExp(r'[\s_]+'), '-');

String _humanise(String slug) {
  if (slug.isEmpty) return 'Other';
  return slug
      .split('-')
      .where((String part) => part.isNotEmpty)
      .map((String part) => '${part[0].toUpperCase()}${part.substring(1)}')
      .join(' ');
}
