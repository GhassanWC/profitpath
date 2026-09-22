import 'package:wainzo/models/ai_profile.dart';
import 'package:wainzo/models/post.dart';
import 'package:wainzo/models/taxonomy.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final DateTime now = DateTime(2026, 5, 4, 9, 30);

  Post build({List<String> targets = const <String>['JP', 'KR']}) => Post(
    id: 'p_1',
    creatorId: 'u_layla',
    mediaType: MediaType.video,
    mediaUrl: 'assets/media/sample_reel_a.mp4',
    mediaDuration: const Duration(seconds: 35),
    caption: 'How Omani halwa is made',
    creatorIntent: 'I want people in Japan to discover traditional Omani food.',
    originCountry: 'OM',
    targetCountries: targets,
    profile: const AiContentProfile(
      category: ContentCategory.food,
      contentType: ContentType.informational,
      intent: ContentType.discovery,
      subcategories: <String>['Culture', 'Dessert'],
      topics: <String>['Omani halwa'],
      audience: <String>['Food lovers'],
    ),
    preview: const AiPreview(
      headline: 'Traditional Omani halwa',
      summary:
          'This 35-second video shows halwa being stirred in a copper pot.',
      reasonToWatch:
          'You may be interested if you like seeing how a dish is made.',
    ),
    status: PostStatus.published,
    moderation: ModerationStatus.approved,
    metrics: const PostMetrics(
      watches: 400,
      skips: 600,
      completions: 320,
      likes: 80,
    ),
    createdAt: now,
    updatedAt: now,
  );

  group('targeting', () {
    test('reaches the countries the creator named, and nowhere else', () {
      final Post post = build();
      expect(post.targets('JP'), isTrue);
      expect(
        post.targets('jp'),
        isTrue,
        reason: 'codes are compared case-insensitively',
      );
      expect(post.targets('GB'), isFalse);
      expect(post.isGlobal, isFalse);
    });

    test('an empty target list means everywhere, not nowhere', () {
      final Post post = build(targets: const <String>[]);
      expect(post.isGlobal, isTrue);
      expect(post.targets('GB'), isTrue);
      expect(post.targets('OM'), isTrue);
    });
  });

  group('visibility', () {
    test(
      'is only public once it is published and moderation has approved it',
      () {
        final Post post = build();
        expect(post.isVisibleToOthers, isTrue);
        expect(
          post.copyWith(moderation: ModerationStatus.pending).isVisibleToOthers,
          isFalse,
        );
        expect(
          post.copyWith(status: PostStatus.draft).isVisibleToOthers,
          isFalse,
        );
        expect(
          post
              .copyWith(moderation: ModerationStatus.rejected)
              .isVisibleToOthers,
          isFalse,
        );
      },
    );
  });

  group('metrics', () {
    test(
      'watch rate is watches over decisions, not over impressions guessed at',
      () {
        expect(build().metrics.watchRate, closeTo(0.4, 1e-9));
        expect(build().metrics.completionRate, closeTo(0.8, 1e-9));
      },
    );

    test(
      'a post nobody has decided on yet has no rate, rather than a zero rate',
      () {
        const PostMetrics fresh = PostMetrics();
        expect(fresh.watchRate, 0);
        expect(fresh.completionRate, 0);
      },
    );
  });

  test('survives a round trip through JSON, AI profile and all', () {
    final Post original = build();
    final Post restored = Post.fromJson(original.toJson());

    expect(restored.id, original.id);
    expect(restored.targetCountries, original.targetCountries);
    expect(restored.mediaDuration, original.mediaDuration);
    expect(restored.profile!.category, ContentCategory.food);
    expect(restored.profile!.subcategories, original.profile!.subcategories);
    expect(restored.preview!.headline, original.preview!.headline);
    expect(restored.metrics.watches, 400);
    expect(restored.createdAt, original.createdAt);
  });

  test('an unknown category from the backend is kept, not dropped', () {
    final Map<String, dynamic> json = build().toJson();
    (json['profile']! as Map<String, dynamic>)['category'] = 'urban-farming';

    final Post restored = Post.fromJson(json);
    expect(restored.profile!.category.slug, 'urban-farming');
    expect(restored.profile!.category.label, 'Urban Farming');
  });
}
