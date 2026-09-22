import 'dart:math' as math;

import '../../core/utils/formatters.dart';
import '../../models/ai_profile.dart';
import '../../models/post.dart';
import '../../models/taxonomy.dart';
import 'ai_service.dart';

/// A stand-in model that runs on the device.
///
/// It exists so the product can be used — and judged — before a model is wired
/// up: the composer's analysis step, the honesty check, the preview a viewer
/// reads and the facets ranking runs on are all exercised for real. It reads
/// the creator's stated intent and caption, matches them against a keyword
/// vocabulary, and assembles a preview from the same sentence shapes the
/// production prompt asks a real model for.
///
/// It is deliberately conservative: when it cannot tell what something is, it
/// says so plainly rather than inventing a confident answer. That is the same
/// contract the real provider is held to.
final class MockAiService implements AiService {
  MockAiService({
    math.Random? random,
    this.latency = const Duration(milliseconds: 900),
  }) : _random = random ?? math.Random(7);

  final math.Random _random;

  /// Analysis is not instant in production, and a composer that pretends it is
  /// would be designed against the wrong shape.
  final Duration latency;

  static const String modelId = 'wainzo-mock-v1';

  @override
  Future<PostAnalysis> analyze(PostAnalysisRequest request) async {
    final AiContentProfile profile = await analyzePost(request);
    final AiPreview preview = await generatePreview(request, profile);
    return PostAnalysis(profile: profile, preview: preview);
  }

  @override
  Future<AiContentProfile> analyzePost(PostAnalysisRequest request) async {
    await Future<void>.delayed(latency);
    final String text = _corpus(request);
    final (ContentCategory category, List<String> subcategories) = _classify(
      text,
    );
    final ContentType contentType = _contentType(text, request);
    final ContentType intent = _intent(text, request);

    return AiContentProfile(
      category: category,
      contentType: contentType,
      intent: intent,
      subcategories: subcategories,
      topics: _topics(text, request, category),
      audience: _audience(request, category, intent),
      language: request.creatorLanguages.isEmpty
          ? 'en'
          : request.creatorLanguages.first,
      detectedCountry: request.originCountry,
      confidence: _confidence(text, subcategories),
      modelId: modelId,
    );
  }

  @override
  Future<AiPreview> generatePreview(
    PostAnalysisRequest request,
    AiContentProfile profile,
  ) async {
    await Future<void>.delayed(latency ~/ 2);
    return AiPreview(
      headline: _headline(request, profile),
      summary: _summary(request, profile),
      reasonToWatch: _reasonToWatch(request, profile),
      mediaLength: request.mediaDuration,
    );
  }

  @override
  Future<(ContentCategory, List<String>)> generateCategories(
    PostAnalysisRequest request,
  ) async {
    await Future<void>.delayed(latency ~/ 3);
    return _classify(_corpus(request));
  }

  @override
  Future<List<String>> generateAudience(
    PostAnalysisRequest request,
    AiContentProfile profile,
  ) async {
    await Future<void>.delayed(latency ~/ 3);
    return _audience(request, profile.category, profile.intent);
  }

  @override
  Future<ContentType> generateIntent(PostAnalysisRequest request) async {
    await Future<void>.delayed(latency ~/ 3);
    return _intent(_corpus(request), request);
  }

  // --- understanding --------------------------------------------------------

  String _corpus(PostAnalysisRequest request) =>
      '${request.caption} ${request.creatorIntent}'.toLowerCase();

  /// Keyword vocabulary. A real provider replaces this wholesale; the shape of
  /// what it returns does not change.
  static const Map<String, List<String>> _vocabulary = <String, List<String>>{
    'travel': <String>[
      'travel',
      'trip',
      'tourist',
      'tourism',
      'hotel',
      'beach',
      'desert',
      'mountain',
      'city',
      'visit',
      'wadi',
      'island',
      'hostel',
      'flight',
      'itinerary',
      'souq',
    ],
    'food': <String>[
      'food',
      'dish',
      'recipe',
      'cook',
      'eat',
      'restaurant',
      'coffee',
      'halwa',
      'bread',
      'street food',
      'kitchen',
      'meal',
      'dessert',
      'spice',
      'tea',
    ],
    'technology': <String>[
      'tech',
      'app',
      'software',
      'ai',
      'robot',
      'device',
      'startup',
      'code',
      'developer',
      'hardware',
      'gadget',
      'chip',
    ],
    'business': <String>[
      'business',
      'market',
      'shop',
      'brand',
      'sell',
      'export',
      'price',
      'customer',
      'founder',
      'store',
    ],
    'education': <String>[
      'learn',
      'teach',
      'lesson',
      'school',
      'university',
      'study',
      'course',
      'explain',
      'tutorial',
    ],
    'entertainment': <String>[
      'funny',
      'comedy',
      'music',
      'song',
      'dance',
      'film',
      'game',
      'perform',
      'concert',
    ],
    'sports': <String>[
      'football',
      'cricket',
      'match',
      'training',
      'run',
      'climb',
      'surf',
      'team',
      'gym',
      'dive',
    ],
    'lifestyle': <String>[
      'morning',
      'routine',
      'home',
      'daily',
      'life',
      'apartment',
      'minimal',
      'wellness',
    ],
    'culture': <String>[
      'culture',
      'tradition',
      'traditional',
      'heritage',
      'history',
      'festival',
      'craft',
      'language',
      'ceremony',
      'ancient',
    ],
    'news': <String>[
      'news',
      'report',
      'happening',
      'breaking',
      'update',
      'protest',
    ],
    'photography': <String>[
      'photo',
      'photography',
      'camera',
      'lens',
      'shot',
      'portrait',
    ],
    'fashion': <String>[
      'fashion',
      'outfit',
      'clothes',
      'textile',
      'design',
      'wear',
      'tailor',
    ],
    'products': <String>[
      'product',
      'review',
      'unbox',
      'launch',
      'prototype',
      'packaging',
    ],
    'events': <String>[
      'event',
      'festival',
      'conference',
      'meetup',
      'exhibition',
      'opening',
    ],
    'opinion': <String>[
      'opinion',
      'think',
      'believe',
      'view',
      'perspective',
      'argue',
    ],
    'question': <String>[
      'question',
      'ask',
      'wondering',
      'should i',
      'which one',
      'help me',
    ],
    'discussion': <String>[
      'discuss',
      'debate',
      'thoughts',
      'conversation',
      'tell me',
    ],
  };

  (ContentCategory, List<String>) _classify(String text) {
    final Map<String, int> hits = <String, int>{};
    final Map<String, List<String>> matched = <String, List<String>>{};
    _vocabulary.forEach((String slug, List<String> words) {
      for (final String word in words) {
        if (text.contains(word)) {
          hits[slug] = (hits[slug] ?? 0) + 1;
          matched.putIfAbsent(slug, () => <String>[]).add(word);
        }
      }
    });

    if (hits.isEmpty) {
      return (ContentCategory.other, const <String>[]);
    }

    final List<MapEntry<String, int>> ranked = hits.entries.toList()
      ..sort(
        (MapEntry<String, int> a, MapEntry<String, int> b) =>
            b.value.compareTo(a.value),
      );
    final ContentCategory category = ContentCategory.fromSlug(ranked.first.key);

    // Subcategories are the runner-up categories plus the words that actually
    // matched — specific enough for ranking to tell "budget hotels" apart from
    // "luxury hotels" rather than lumping both under Travel.
    final Set<String> subcategories = <String>{
      ...ranked
          .skip(1)
          .take(2)
          .map(
            (MapEntry<String, int> e) => ContentCategory.fromSlug(e.key).label,
          ),
      ...?matched[ranked.first.key]
          ?.where((String w) => !w.contains(' ') && !_notTopics.contains(w))
          .take(3)
          .map(_title),
    };

    return (category, subcategories.take(4).toList(growable: false));
  }

  ContentType _contentType(String text, PostAnalysisRequest request) {
    if (_any(text, <String>[
      '?',
      'which',
      'should i',
      'what do you think',
      'your opinion',
    ])) {
      return ContentType.question;
    }
    if (_any(text, <String>[
      'buy',
      'launch',
      'our product',
      'discount',
      'available now',
      'order',
    ])) {
      return ContentType.promotional;
    }
    if (_any(text, <String>[
      'how to',
      'explain',
      'learn',
      'tutorial',
      'guide',
      'step',
    ])) {
      return ContentType.educational;
    }
    if (_any(text, <String>['discuss', 'debate', 'thoughts on', 'tell me'])) {
      return ContentType.discussion;
    }
    if (_any(text, <String>['funny', 'comedy', 'music', 'dance', 'perform'])) {
      return ContentType.entertainment;
    }
    if (_any(text, <String>['my ', 'i made', 'we went', 'our family'])) {
      return ContentType.personal;
    }
    return request.mediaType == MediaType.text
        ? ContentType.discussion
        : ContentType.informational;
  }

  ContentType _intent(String text, PostAnalysisRequest request) {
    if (_any(text, <String>[
      'discover',
      'introduce',
      'show them',
      'never seen',
      'find out about',
    ])) {
      return ContentType.discovery;
    }
    if (_any(text, <String>[
      'opinion',
      'feedback',
      'what do you think',
      'tell me',
    ])) {
      return ContentType.discussion;
    }
    if (_any(text, <String>['question', 'ask', 'should i', 'which'])) {
      return ContentType.question;
    }
    if (_any(text, <String>['sell', 'buy', 'customers', 'our product'])) {
      return ContentType.promotional;
    }
    if (_any(text, <String>['teach', 'learn', 'explain', 'how to'])) {
      return ContentType.educational;
    }
    return ContentType.discovery;
  }

  /// Phrases the vocabulary matches on but which are not topics — they are how
  /// someone asks, not what they are asking about.
  static const Set<String> _notTopics = <String>{
    'should i',
    'which one',
    'help me',
    'tell me',
    'thoughts',
    'happening',
    'wondering',
    'street food',
  };

  List<String> _topics(
    String text,
    PostAnalysisRequest request,
    ContentCategory category,
  ) {
    final Set<String> topics = <String>{category.label};
    // No raw country codes: the post already carries where it is from, and
    // "OM" is not a subject anyone is interested in.
    for (final MapEntry<String, List<String>> entry in _vocabulary.entries) {
      for (final String word in entry.value) {
        if (word.length > 4 &&
            !word.contains(' ') &&
            !_notTopics.contains(word) &&
            text.contains(word)) {
          topics.add(_title(word));
        }
      }
    }
    return topics.take(6).toList(growable: false);
  }

  List<String> _audience(
    PostAnalysisRequest request,
    ContentCategory category,
    ContentType intent,
  ) {
    final Set<String> audience = <String>{};
    switch (category.slug) {
      case 'travel':
        audience.addAll(<String>['Travellers', 'People planning a trip']);
      case 'food':
        audience.addAll(<String>['Food lovers', 'Home cooks']);
      case 'technology':
        audience.addAll(<String>['People who follow technology', 'Builders']);
      case 'business':
        audience.addAll(<String>[
          'Small business owners',
          'People who sell online',
        ]);
      case 'culture':
        audience.addAll(<String>['People curious about other cultures']);
      case 'education':
        audience.addAll(<String>['Learners', 'Students']);
      case 'products':
        audience.addAll(<String>['People considering a purchase']);
      default:
        audience.add('People browsing something new');
    }
    if (intent == ContentType.question || intent == ContentType.discussion) {
      audience.add('People willing to give an opinion');
    }
    if (request.targetCountries.length == 1) {
      audience.add('People in ${request.targetCountries.single}');
    }
    return audience.take(4).toList(growable: false);
  }

  double _confidence(String text, List<String> subcategories) {
    final double base = text.trim().length < 24 ? 0.42 : 0.68;
    return (base + subcategories.length * 0.07 + _random.nextDouble() * 0.06)
        .clamp(0.0, 0.95);
  }

  // --- the preview ----------------------------------------------------------

  /// Four or five words describing what the thing is. Built from the creator's
  /// own caption where possible, because their words are more specific than any
  /// template.
  String _headline(PostAnalysisRequest request, AiContentProfile profile) {
    final String caption = request.caption.trim();
    if (caption.isNotEmpty) {
      final String firstClause = caption.split(RegExp(r'[.!?\n]')).first.trim();
      final List<String> words = firstClause.split(RegExp(r'\s+'));
      if (words.length >= 2 && words.length <= 7) {
        return _sentenceCase(firstClause);
      }
      if (words.length > 7) return _sentenceCase(words.take(6).join(' '));
    }
    final String place = profile.detectedCountry ?? '';
    return place.isEmpty
        ? '${profile.category.label} from a creator'
        : '${profile.category.label} from $place';
  }

  /// What actually happens in the content. No withheld payoff — if the summary
  /// gives away the whole post, that is the summary working.
  String _summary(PostAnalysisRequest request, AiContentProfile profile) {
    final String noun = switch (request.mediaType) {
      MediaType.video =>
        request.mediaDuration == null
            ? 'This video'
            : 'This ${Format.spokenLength(request.mediaDuration!)} video',
      MediaType.image => 'This photo',
      MediaType.text => 'This post',
    };
    final String verb = switch (request.mediaType) {
      MediaType.video => 'shows',
      MediaType.image => 'shows',
      MediaType.text => 'describes',
    };
    final String subject = request.caption.trim().isEmpty
        ? '${profile.category.label.toLowerCase()} from ${profile.detectedCountry ?? 'the creator'}'
        : _lowerFirst(
            request.caption.trim().split(RegExp(r'[.!?\n]')).first.trim(),
          );

    final String opening = '$noun $verb $subject.';
    final String closing = switch (profile.intent.slug) {
      'question' => 'The creator is asking viewers for an answer.',
      'discussion' => 'The creator is asking viewers what they think.',
      'promotional' => 'The creator is promoting something of their own.',
      'educational' => 'It is explained step by step.',
      _ => '',
    };
    return closing.isEmpty ? opening : '$opening $closing';
  }

  /// Stated as a possibility, never as a promise. "You may be interested in"
  /// is a weaker sentence than "You have to see this" — on purpose.
  String _reasonToWatch(PostAnalysisRequest request, AiContentProfile profile) {
    final String audience = profile.audience.isEmpty
        ? 'people browsing something new'
        : _lowerFirst(profile.audience.first);
    return switch (profile.intent.slug) {
      'question' =>
        'The creator wants an answer from people here — you may have one.',
      'discussion' => 'You may have a view on this worth adding.',
      'promotional' =>
        'Useful if you are $audience and want to see what this is before deciding.',
      'educational' =>
        'Useful if you are $audience and want to learn how this is done.',
      _ => 'You may be interested if you are $audience.',
    };
  }

  // --- small helpers --------------------------------------------------------

  bool _any(String text, List<String> needles) => needles.any(text.contains);

  String _title(String raw) => raw
      .split(' ')
      .map(
        (String w) => w.isEmpty ? w : '${w[0].toUpperCase()}${w.substring(1)}',
      )
      .join(' ');

  String _sentenceCase(String raw) =>
      raw.isEmpty ? raw : '${raw[0].toUpperCase()}${raw.substring(1)}';

  String _lowerFirst(String raw) =>
      raw.isEmpty ? raw : '${raw[0].toLowerCase()}${raw.substring(1)}';
}
