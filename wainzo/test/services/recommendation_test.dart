import 'dart:math' as math;

import 'package:wainzo/models/ai_profile.dart';
import 'package:wainzo/models/feedback_signal.dart';
import 'package:wainzo/models/interest_profile.dart';
import 'package:wainzo/models/post.dart';
import 'package:wainzo/models/taxonomy.dart';
import 'package:wainzo/services/ranking/recommendation_service.dart';
import 'package:flutter_test/flutter_test.dart';

/// What the feed is allowed to rank on, and what it is not.
void main() {
  final DateTime now = DateTime(2026, 6, 1, 12);

  // No randomness, so exploration contributes nothing and the other terms can
  // be reasoned about on their own.
  const RecommendationService service = RecommendationService();

  Post post({
    required String id,
    List<String> targets = const <String>['JP'],
    String category = 'travel',
    List<String> subcategories = const <String>['Hiking'],
    int hoursOld = 6,
    PostMetrics metrics = const PostMetrics(),
    PostStatus status = PostStatus.published,
    ModerationStatus moderation = ModerationStatus.approved,
  }) => Post(
    id: id,
    creatorId: 'u_creator',
    mediaType: MediaType.video,
    caption: id,
    creatorIntent: 'test',
    originCountry: 'OM',
    targetCountries: targets,
    profile: AiContentProfile(
      category: ContentCategory.fromSlug(category),
      contentType: ContentType.informational,
      intent: ContentType.discovery,
      subcategories: subcategories,
    ),
    status: status,
    moderation: moderation,
    metrics: metrics,
    createdAt: now.subtract(Duration(hours: hoursOld)),
    updatedAt: now,
  );

  RankedPost scoreOf(
    Post p, {
    InterestProfile? profile,
    String? country = 'JP',
  }) => service.score(
    post: p,
    profile: profile ?? InterestProfile(userId: 'u_me'),
    viewerCountry: country,
    now: now,
  );

  group('creator targeting is the strongest signal', () {
    test('a post aimed at the viewer beats a global one, all else equal', () {
      final RankedPost aimed = scoreOf(post(id: 'aimed'));
      final RankedPost global = scoreOf(
        post(id: 'global', targets: const <String>[]),
      );

      expect(aimed.geo, 1.0);
      expect(global.geo, lessThan(aimed.geo));
      expect(aimed.score, greaterThan(global.score));
    });

    test(
      'ranking reorders eligible posts, it does not overrule who is eligible',
      () {
        // A post aimed only at Germany still scores, because eligibility is the
        // repository's job. What ranking does is put it last.
        final RankedPost elsewhere = scoreOf(
          post(id: 'de', targets: const <String>['DE']),
        );
        expect(elsewhere.geo, lessThan(scoreOf(post(id: 'jp')).geo));
      },
    );
  });

  group('likes are not an input', () {
    test(
      'a post with no likes is not penalised against one with thousands',
      () {
        final RankedPost unpopular = scoreOf(
          post(
            id: 'a',
            metrics: const PostMetrics(watches: 100, completions: 80),
          ),
        );
        final RankedPost popular = scoreOf(
          post(
            id: 'b',
            metrics: const PostMetrics(
              watches: 100,
              completions: 80,
              likes: 9000,
              shares: 4000,
            ),
          ),
        );

        expect(popular.score, closeTo(unpopular.score, 1e-9));
      },
    );

    test('what quality means here is whether people who watched stayed', () {
      final RankedPost honest = scoreOf(
        post(
          id: 'honest',
          metrics: const PostMetrics(watches: 200, completions: 180),
        ),
      );
      final RankedPost oversold = scoreOf(
        post(
          id: 'oversold',
          metrics: const PostMetrics(watches: 200, completions: 20),
        ),
      );

      expect(honest.honesty, greaterThan(oversold.honesty));
      expect(honest.score, greaterThan(oversold.score));
    });
  });

  test('a brand-new post is not starved by a rate it has no evidence for', () {
    // One watch, no completions. Taken literally that is a 0% completion rate.
    final RankedPost fresh = scoreOf(
      post(id: 'fresh', metrics: const PostMetrics(watches: 1)),
    );
    final RankedPost established = scoreOf(
      post(
        id: 'established',
        metrics: const PostMetrics(watches: 500, completions: 275),
      ),
    );

    expect(
      fresh.honesty,
      greaterThan(0.4),
      reason: 'the prior holds it near the middle',
    );
    expect(fresh.score, greaterThan(established.score * 0.85));
  });

  test('newer posts lead, but older ones stay reachable', () {
    final RankedPost today = scoreOf(post(id: 'today', hoursOld: 2));
    final RankedPost lastWeek = scoreOf(post(id: 'old', hoursOld: 24 * 7));

    expect(today.freshness, greaterThan(lastWeek.freshness));
    expect(lastWeek.score, greaterThan(0));
  });

  test('learned interest moves a post up', () {
    final Post hiking = post(id: 'hiking');
    final InterestProfile keen = InterestProfile(userId: 'u_me').applying(
      FeedbackSignal.forPost(
        id: 's',
        userId: 'u_me',
        post: hiking,
        kind: FeedbackKind.complete,
        createdAt: now,
      ),
    );

    expect(
      scoreOf(hiking, profile: keen).score,
      greaterThan(scoreOf(hiking).score),
    );
  });

  group('rank()', () {
    test('drops anything not publicly visible', () {
      final List<RankedPost> ranked = service.rank(
        candidates: <Post>[
          post(id: 'ok'),
          post(id: 'draft', status: PostStatus.draft),
          post(id: 'rejected', moderation: ModerationStatus.rejected),
          post(id: 'pending', moderation: ModerationStatus.pending),
        ],
        profile: InterestProfile(userId: 'u_me'),
        viewerCountry: 'JP',
        now: now,
      );

      expect(ranked.map((RankedPost r) => r.post.id), <String>['ok']);
    });

    test('orders by score, best first', () {
      final List<RankedPost> ranked = service.rank(
        candidates: <Post>[
          post(id: 'global', targets: const <String>[]),
          post(id: 'aimed'),
          post(id: 'elsewhere', targets: const <String>['DE']),
        ],
        profile: InterestProfile(userId: 'u_me'),
        viewerCountry: 'JP',
        now: now,
      );

      expect(ranked.first.post.id, 'aimed');
      expect(ranked.last.post.id, 'elsewhere');
      for (int i = 1; i < ranked.length; i++) {
        expect(ranked[i - 1].score, greaterThanOrEqualTo(ranked[i].score));
      }
    });

    test('exploration keeps a slice of the feed unoptimised', () {
      final RecommendationService noisy = RecommendationService(
        random: math.Random(1),
      );
      final List<RankedPost> ranked = noisy.rank(
        candidates: <Post>[for (int i = 0; i < 20; i++) post(id: 'p$i')],
        profile: InterestProfile(userId: 'u_me'),
        viewerCountry: 'JP',
        now: now,
      );

      final Set<double> explorations = ranked
          .map((RankedPost r) => r.exploration)
          .toSet();
      expect(
        explorations.length,
        greaterThan(1),
        reason: 'not every post gets the same nudge',
      );
      expect(ranked.every((RankedPost r) => r.exploration >= 0), isTrue);
    });

    test('a ranking decision can be explained', () {
      final RankedPost ranked = scoreOf(post(id: 'p'));
      expect(
        ranked.breakdown.keys,
        containsAll(<String>[
          'geo',
          'interest',
          'freshness',
          'honesty',
          'exploration',
        ]),
      );
    });
  });
}
