import 'package:wainzo/models/ai_profile.dart';
import 'package:wainzo/models/post.dart';
import 'package:wainzo/models/taxonomy.dart';

/// A published post with a full AI profile, for widget tests.
Post samplePost({
  required String id,
  String headline = 'Traditional Omani halwa',
  String category = 'food',
  List<String> targets = const <String>['OM', 'JP'],
  MediaType mediaType = MediaType.video,
  String creatorId = 'u_layla',
}) {
  final DateTime now = DateTime(2026, 6, 1, 12);
  return Post(
    id: id,
    creatorId: creatorId,
    mediaType: mediaType,
    mediaUrl: mediaType == MediaType.video
        ? 'assets/media/sample_reel_a.mp4'
        : null,
    mediaDuration: mediaType == MediaType.video
        ? const Duration(seconds: 35)
        : null,
    caption: headline,
    creatorIntent: 'I want people in Japan to discover traditional Omani food.',
    originCountry: 'OM',
    targetCountries: targets,
    profile: AiContentProfile(
      category: ContentCategory.fromSlug(category),
      contentType: ContentType.informational,
      intent: ContentType.discovery,
      subcategories: const <String>['Culture'],
      topics: const <String>['Omani halwa'],
      audience: const <String>['Food lovers'],
    ),
    preview: AiPreview(
      headline: headline,
      summary:
          'This 35-second video shows how it is made, and when it is served.',
      reasonToWatch:
          'You may be interested if you like seeing how a dish is made.',
      mediaLength: const Duration(seconds: 35),
    ),
    status: PostStatus.published,
    moderation: ModerationStatus.approved,
    metrics: const PostMetrics(
      watches: 400,
      skips: 300,
      completions: 320,
      likes: 80,
    ),
    createdAt: now,
    updatedAt: now,
  );
}
