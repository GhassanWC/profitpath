import 'package:wainzo/models/ai_profile.dart';
import 'package:wainzo/models/post.dart';
import 'package:wainzo/models/taxonomy.dart';
import 'package:wainzo/services/ai/ai_service.dart';
import 'package:wainzo/services/ai/mock_ai_service.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final MockAiService ai = MockAiService(latency: Duration.zero);

  PostAnalysisRequest request({
    String caption = 'How Omani halwa is made, start to finish',
    String intent =
        'I want people in Japan to discover traditional Omani food.',
    MediaType media = MediaType.video,
    Duration? duration = const Duration(seconds: 35),
    List<String> targets = const <String>['JP'],
  }) => PostAnalysisRequest(
    mediaType: media,
    caption: caption,
    creatorIntent: intent,
    targetCountries: targets,
    originCountry: 'OM',
    mediaDuration: duration,
  );

  test('reads the creator\'s words and files the post', () async {
    final AiContentProfile profile = await ai.analyzePost(request());

    expect(profile.category, ContentCategory.food);
    expect(profile.intent, ContentType.discovery);
    expect(profile.topics, isNotEmpty);
    expect(profile.audience, isNotEmpty);
    expect(profile.detectedCountry, 'OM');
    expect(profile.modelId, MockAiService.modelId);
    expect(profile.editedByCreator, isFalse);
  });

  test('a question is recognised as a question', () async {
    final AiContentProfile profile = await ai.analyzePost(
      request(
        caption: 'Which chisel should I buy?',
        intent: 'I want people in the UK to give me their opinion about this product.',
      ),
    );

    expect(profile.contentType, ContentType.question);
    expect(profile.audience, contains('People willing to give an opinion'));
  });

  test('the preview says what the thing is, with its real length', () async {
    final PostAnalysis analysis = await ai.analyze(request());

    expect(analysis.preview.summary, contains('35-second'));
    expect(analysis.preview.summary, contains('video'));
    expect(analysis.preview.reasonToWatch, isNotEmpty);
    expect(analysis.preview.mediaLength, const Duration(seconds: 35));
  });

  test(
    'the preview it writes passes the honesty check it will be held to',
    () async {
      for (final (String caption, String intent) in <(String, String)>[
        (
          'How Omani halwa is made',
          'I want people in Japan to discover Omani food.',
        ),
        (
          'Crossing Patagonia by bus for under 90 dollars',
          'I want travellers to see the cheap way.',
        ),
        (
          'Which chisel should I buy?',
          'I want your opinion about this product.',
        ),
        (
          'A soil sensor that runs a year on one cell',
          'I want engineers to tell me where it breaks.',
        ),
        ('', 'I want people to discover something.'),
      ]) {
        final PostAnalysis analysis = await ai.analyze(
          request(caption: caption, intent: intent),
        );
        expect(
          analysis.preview.isHonest,
          isTrue,
          reason: 'flags: ${analysis.preview.clickbaitFlags} for "$caption"',
        );
      }
    },
  );

  test(
    'says what it does not know rather than inventing a confident answer',
    () async {
      final AiContentProfile profile = await ai.analyzePost(
        request(caption: 'zzz', intent: 'zzz'),
      );

      expect(profile.category, ContentCategory.other);
      expect(profile.confidence, lessThan(0.6));
    },
  );

  test('a text post is described as a post, not as a video', () async {
    final PostAnalysis analysis = await ai.analyze(
      request(
        caption: 'A flat white is now 4.20 here. What is it where you are?',
        intent: 'I want to know what people actually pay in other countries.',
        media: MediaType.text,
        duration: null,
      ),
    );

    expect(analysis.preview.summary, startsWith('This post'));
    expect(analysis.preview.summary, isNot(contains('video')));
  });

  test('the named operations line up with the composed one', () async {
    final PostAnalysisRequest req = request();
    final (ContentCategory category, List<String> subcategories) = await ai
        .generateCategories(req);
    final ContentType intent = await ai.generateIntent(req);
    final AiContentProfile profile = await ai.analyzePost(req);

    expect(category, profile.category);
    expect(subcategories, profile.subcategories);
    expect(intent, profile.intent);
    expect(await ai.generateAudience(req, profile), profile.audience);
  });
}
