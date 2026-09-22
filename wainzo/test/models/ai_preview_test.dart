import 'package:wainzo/models/ai_profile.dart';
import 'package:flutter_test/flutter_test.dart';

/// The preview contract, enforced in the app rather than trusted to a prompt.
void main() {
  AiPreview preview({
    String headline = 'Traditional Omani halwa',
    String summary =
        'This 35-second video shows halwa being stirred in a copper pot.',
    String reason =
        'You may be interested if you like seeing how a dish is made.',
  }) => AiPreview(headline: headline, summary: summary, reasonToWatch: reason);

  test('an honest preview passes', () {
    expect(preview().isHonest, isTrue);
    expect(preview().clickbaitFlags, isEmpty);
  });

  group('clickbait is caught before it can be published', () {
    test('withholding the point', () {
      expect(
        preview(headline: "You won't believe what happens next").isHonest,
        isFalse,
      );
      expect(preview(summary: 'Wait for it.').isHonest, isFalse);
      expect(preview(reason: 'This is shocking.').isHonest, isFalse);
    });

    test('unverifiable superlatives', () {
      expect(
        preview(summary: 'The best halwa in the world.').isHonest,
        isFalse,
      );
    });

    test('shouting', () {
      expect(preview(headline: 'OMANI HALWA').isHonest, isFalse);
      expect(preview(summary: 'Watch this!!').isHonest, isFalse);
    });

    test('the reason names what tripped it, so a creator can fix it', () {
      final AiPreview bad = preview(headline: "You won't believe this");
      expect(bad.clickbaitFlags.single, 'Withholds what the content is');
    });
  });

  test('an edit by the creator is recorded as theirs', () {
    final AiPreview original = preview();
    expect(original.editedByCreator, isFalse);
    expect(
      original
          .copyWith(headline: 'Omani halwa, start to finish')
          .editedByCreator,
      isTrue,
    );
  });

  test('survives a round trip through JSON', () {
    final AiPreview original = AiPreview(
      headline: preview().headline,
      summary: preview().summary,
      reasonToWatch: preview().reasonToWatch,
      mediaLength: const Duration(seconds: 35),
    );
    final AiPreview restored = AiPreview.fromJson(original.toJson());
    expect(restored.headline, original.headline);
    expect(restored.mediaLength, const Duration(seconds: 35));
  });
}
