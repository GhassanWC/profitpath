import 'package:atlas/models/ai_profile.dart';
import 'package:atlas/models/feedback_signal.dart';
import 'package:atlas/models/interest_profile.dart';
import 'package:atlas/models/post.dart';
import 'package:atlas/models/taxonomy.dart';
import 'package:flutter_test/flutter_test.dart';

/// The product's discovery philosophy, as tests.
///
/// These are the claims the app makes about what a skip means. If any of them
/// stops holding, the product has changed into something else regardless of
/// what the marketing says.
void main() {
  final DateTime now = DateTime(2026, 3, 1, 12);

  Post post({
    required String id,
    required String category,
    required List<String> subcategories,
    List<String> topics = const <String>[],
    String creator = 'u_creator',
  }) => Post(
    id: id,
    creatorId: creator,
    mediaType: MediaType.video,
    caption: id,
    creatorIntent: 'test',
    originCountry: 'OM',
    targetCountries: const <String>['JP'],
    profile: AiContentProfile(
      category: ContentCategory.fromSlug(category),
      contentType: ContentType.informational,
      intent: ContentType.discovery,
      subcategories: subcategories,
      topics: topics,
    ),
    status: PostStatus.published,
    moderation: ModerationStatus.approved,
    createdAt: now,
    updatedAt: now,
  );

  FeedbackSignal signal(Post p, FeedbackKind kind, {double? watched}) =>
      FeedbackSignal.forPost(
        id: 'sig_${p.id}_${kind.name}',
        userId: 'u_me',
        post: p,
        kind: kind,
        createdAt: now,
        watchedFraction: watched,
      );

  group('a skip is narrow', () {
    test('skipping luxury hotels barely moves travel, but moves luxury hotels a lot', () {
      final Post luxury = post(
        id: 'p_luxury',
        category: 'travel',
        subcategories: <String>['Luxury hotels'],
      );

      final InterestProfile after = InterestProfile(userId: 'u_me')
          .applying(signal(luxury, FeedbackKind.skip));

      final double category = after.affinities['category:travel']!.at(now);
      final double subcategory = after.affinities['sub:travel/luxury-hotels']!
          .at(now);

      expect(subcategory, lessThan(0));
      expect(category, lessThan(0));
      // The whole design: the narrow facet takes the hit, the broad one is
      // nudged. Five times, from InterestProfile.broadNegativeDamping.
      expect(subcategory.abs() / category.abs(), closeTo(5, 0.001));
    });

    test('the example from the product brief: travel stays alive after skipping luxury', () {
      final Post luxury = post(
        id: 'p_luxury',
        category: 'travel',
        subcategories: <String>['Luxury hotels'],
      );
      final Post budget = post(
        id: 'p_budget',
        category: 'travel',
        subcategories: <String>['Budget hotels'],
      );

      InterestProfile profile = InterestProfile(userId: 'u_me');
      // Skipped three luxury posts, watched one budget post to the end.
      for (int i = 0; i < 3; i++) {
        profile = profile.applying(signal(luxury, FeedbackKind.skip));
      }
      profile = profile.applying(signal(budget, FeedbackKind.complete));

      final double luxuryScore = profile.affinityFor(
        FeedbackSignal.facetsOf(luxury),
        now: now,
      );
      final double budgetScore = profile.affinityFor(
        FeedbackSignal.facetsOf(budget),
        now: now,
      );

      expect(budgetScore, greaterThan(0), reason: 'budget travel is wanted');
      expect(
        luxuryScore,
        lessThan(budgetScore),
        reason: 'luxury travel is not',
      );
      expect(
        profile.affinities['category:travel']!.at(now),
        greaterThan(0),
        reason: 'travel as a whole survived three skips because one watch outweighs them',
      );
    });
  });

  group('the weighting is asymmetric on purpose', () {
    test('a save moves further than a skip moves back', () {
      final Post p = post(
        id: 'p',
        category: 'food',
        subcategories: <String>['Dessert'],
      );
      final double saved = InterestProfile(userId: 'u_me')
          .applying(signal(p, FeedbackKind.save))
          .affinities['sub:food/dessert']!
          .at(now);
      final double skipped = InterestProfile(userId: 'u_me')
          .applying(signal(p, FeedbackKind.skip))
          .affinities['sub:food/dessert']!
          .at(now);

      expect(saved, greaterThan(skipped.abs() * 3));
    });

    test('saying "not interested" counts for far more than skipping', () {
      final Post p = post(
        id: 'p',
        category: 'food',
        subcategories: <String>['Dessert'],
      );
      final double skip = InterestProfile(userId: 'u_me')
          .applying(signal(p, FeedbackKind.skip))
          .affinities['category:food']!
          .at(now);
      final double explicit = InterestProfile(userId: 'u_me')
          .applying(signal(p, FeedbackKind.notInterested))
          .affinities['category:food']!
          .at(now);

      expect(explicit, lessThan(skip));
    });

    test('an abandoned watch is scaled by how much was actually watched', () {
      final Post p = post(
        id: 'p',
        category: 'travel',
        subcategories: <String>['Hiking'],
      );
      final double early = InterestProfile(userId: 'u_me')
          .applying(signal(p, FeedbackKind.abandon, watched: 0.05))
          .affinities['sub:travel/hiking']!
          .at(now);
      final double late = InterestProfile(userId: 'u_me')
          .applying(signal(p, FeedbackKind.abandon, watched: 0.92))
          .affinities['sub:travel/hiking']!
          .at(now);

      expect(early, lessThan(late));
      expect(
        late,
        greaterThan(-0.05),
        reason: 'leaving at 92% is nearly a completion',
      );
    });
  });

  test(
    'affinities fade, so an old opinion does not become a permanent one',
    () {
      final Post p = post(
        id: 'p',
        category: 'travel',
        subcategories: <String>['Luxury hotels'],
      );
      final InterestProfile profile = InterestProfile(userId: 'u_me')
          .applying(signal(p, FeedbackKind.notInterested));

      final double immediately = profile.affinities['sub:travel/luxury-hotels']!
          .at(now);
      final double muchLater = profile.affinities['sub:travel/luxury-hotels']!
          .at(now.add(const Duration(days: 42)));

      expect(muchLater.abs(), lessThan(immediately.abs() / 3));
    },
  );

  test('survives a round trip through JSON', () {
    final Post p = post(
      id: 'p',
      category: 'food',
      subcategories: <String>['Bread'],
    );
    final InterestProfile original = InterestProfile(userId: 'u_me')
        .applying(signal(p, FeedbackKind.complete));
    final InterestProfile restored = InterestProfile.fromJson(
      original.toJson(),
    );

    expect(restored.userId, original.userId);
    expect(restored.seenPostIds, original.seenPostIds);
    expect(
      restored.affinities['category:food']!.at(now),
      closeTo(original.affinities['category:food']!.at(now), 1e-9),
    );
  });
}
