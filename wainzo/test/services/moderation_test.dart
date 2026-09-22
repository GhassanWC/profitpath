import 'package:wainzo/models/post.dart';
import 'package:wainzo/services/moderation/mock_moderation_service.dart';
import 'package:wainzo/services/moderation/moderation_service.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  late MockModerationService moderation;

  setUp(() => moderation = MockModerationService());

  test('ordinary content is allowed', () async {
    final ModerationResult result = await moderation.screenPost(
      caption: 'How Omani halwa is made, start to finish',
      creatorIntent:
          'I want people in Japan to discover traditional Omani food.',
    );

    expect(result.isAllowed, isTrue);
    expect(result.status.isPubliclyVisible, isTrue);
  });

  test('the obvious cases are refused rather than treated as normal public content', () async {
    final ModerationResult result = await moderation.screenPost(
      caption: 'selling firearms, message me',
      creatorIntent: 'buy firearms here',
    );

    expect(result.decision, ModerationDecision.reject);
    expect(result.status, isNot(ModerationStatus.approved));
    expect(result.reasons, isNotEmpty, reason: 'a creator has to be told why');
  });

  test('something merely suspicious is held for review, not deleted', () async {
    final ModerationResult result = await moderation.screenText(
      'whatsapp me to order, price is good',
    );

    expect(result.decision, ModerationDecision.limit);
    expect(result.status, ModerationStatus.limited);
  });

  test('reports are recorded against the thing reported', () async {
    await moderation.reportPost(
      postId: 'p_1',
      reporterId: 'u_me',
      reason: ReportReason.spam,
    );
    await moderation.reportUser(
      userId: 'u_other',
      reporterId: 'u_me',
      reason: ReportReason.harassment,
    );

    expect(moderation.reports, hasLength(2));
    expect(moderation.reports.first.targetId, 'p_1');
    expect(moderation.reports.first.isUser, isFalse);
    expect(moderation.reports.last.isUser, isTrue);
  });

  test('every reason has a label a person can choose between', () {
    for (final ReportReason reason in ReportReason.values) {
      expect(reason.label, isNotEmpty);
    }
  });
}
