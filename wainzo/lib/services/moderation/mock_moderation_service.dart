import 'moderation_service.dart';

/// A placeholder with teeth where it is cheap to have them.
///
/// It is not a content classifier and does not pretend to be one — a real
/// provider goes behind this same interface. What it does do is refuse the
/// obvious cases outright rather than letting them through as ordinary public
/// content, and route anything it is unsure about to review instead of
/// guessing. Reports are recorded and can be read back in tests.
final class MockModerationService implements ModerationService {
  final List<
    ({
      String targetId,
      String reporterId,
      ReportReason reason,
      String note,
      bool isUser,
    })
  >
  reports =
      <
        ({
          String targetId,
          String reporterId,
          ReportReason reason,
          String note,
          bool isUser,
        })
      >[];

  /// Categories of content that are never published, whatever else is true.
  static final Map<String, RegExp> _prohibited = <String, RegExp>{
    'Threats or incitement to violence': RegExp(
      r'\b(kill|bomb|shoot|attack) (them|him|her|you|everyone)\b',
      caseSensitive: false,
    ),
    'Sexual content involving minors': RegExp(
      r'\b(child|minor|underage)\b.{0,24}\b(sexual|nude|porn)\b',
      caseSensitive: false,
    ),
    'Sale of prohibited goods': RegExp(
      r'\b(buy|sell|selling)\b.{0,20}\b(cocaine|heroin|meth|firearms?|passports?)\b',
      caseSensitive: false,
    ),
  };

  /// Cheap spam heuristics — held for review, not rejected, because a false
  /// positive here should cost a delay and not a deletion.
  static final Map<String, RegExp> _suspicious = <String, RegExp>{
    'Looks like an off-platform sales pitch': RegExp(
      r'(whats ?app|telegram|dm me).{0,24}(order|price|buy)',
      caseSensitive: false,
    ),
    'Repeated links': RegExp(r'(https?://\S+.*){3,}', caseSensitive: false),
  };

  @override
  Future<ModerationResult> screenPost({
    required String caption,
    required String creatorIntent,
    String? mediaUrl,
  }) async {
    await Future<void>.delayed(const Duration(milliseconds: 260));
    return _screen('$caption\n$creatorIntent');
  }

  @override
  Future<ModerationResult> screenText(String text) async {
    await Future<void>.delayed(const Duration(milliseconds: 120));
    return _screen(text);
  }

  ModerationResult _screen(String text) {
    final List<String> rejected = <String>[
      for (final MapEntry<String, RegExp> rule in _prohibited.entries)
        if (rule.value.hasMatch(text)) rule.key,
    ];
    if (rejected.isNotEmpty) {
      return ModerationResult(
        decision: ModerationDecision.reject,
        reasons: rejected,
      );
    }

    final List<String> flagged = <String>[
      for (final MapEntry<String, RegExp> rule in _suspicious.entries)
        if (rule.value.hasMatch(text)) rule.key,
    ];
    if (flagged.isNotEmpty) {
      return ModerationResult(
        decision: ModerationDecision.limit,
        reasons: flagged,
      );
    }

    return const ModerationResult.allowed();
  }

  @override
  Future<void> reportPost({
    required String postId,
    required String reporterId,
    required ReportReason reason,
    String note = '',
  }) async {
    reports.add((
      targetId: postId,
      reporterId: reporterId,
      reason: reason,
      note: note,
      isUser: false,
    ));
  }

  @override
  Future<void> reportUser({
    required String userId,
    required String reporterId,
    required ReportReason reason,
    String note = '',
  }) async {
    reports.add((
      targetId: userId,
      reporterId: reporterId,
      reason: reason,
      note: note,
      isUser: true,
    ));
  }
}
