import '../../models/post.dart';

enum ModerationDecision {
  /// Publish normally.
  allow,

  /// Publish, but hold it back from discovery surfaces pending a human look.
  limit,

  /// Do not publish.
  reject,

  /// Could not decide — queue for review and treat as [limit] until then.
  review,
}

final class ModerationResult {
  const ModerationResult({
    required this.decision,
    this.reasons = const <String>[],
    this.reviewId,
  });

  const ModerationResult.allowed()
    : decision = ModerationDecision.allow,
      reasons = const <String>[],
      reviewId = null;

  final ModerationDecision decision;

  /// Plain-language reasons, safe to show the creator. A person told only "your
  /// post was rejected" cannot fix anything.
  final List<String> reasons;
  final String? reviewId;

  bool get isAllowed => decision == ModerationDecision.allow;

  ModerationStatus get status => switch (decision) {
    ModerationDecision.allow => ModerationStatus.approved,
    ModerationDecision.limit ||
    ModerationDecision.review => ModerationStatus.limited,
    ModerationDecision.reject => ModerationStatus.rejected,
  };
}

enum ReportReason {
  spam,
  harassment,
  hateSpeech,
  violence,
  sexualContent,
  misinformation,
  illegalContent,
  impersonation,
  other;

  String get label => switch (this) {
    ReportReason.spam => 'Spam or scam',
    ReportReason.harassment => 'Harassment or bullying',
    ReportReason.hateSpeech => 'Hate speech',
    ReportReason.violence => 'Violence or dangerous acts',
    ReportReason.sexualContent => 'Sexual content',
    ReportReason.misinformation => 'False information',
    ReportReason.illegalContent => 'Illegal activity',
    ReportReason.impersonation => 'Pretending to be someone else',
    ReportReason.other => 'Something else',
  };
}

/// The safety boundary.
///
/// A public network needs this to exist before it needs almost anything else,
/// so the seam is defined now even though the MVP's implementation is a
/// placeholder. Two rules the implementation must keep:
///
/// * Nothing reaches a stranger before [screenPost] has returned. The mock
///   implementation approves nearly everything, but the *call* is on the
///   publish path, so wiring a real provider in is a one-line swap rather than
///   a re-architecture.
/// * A rejection is explained to its creator.
abstract interface class ModerationService {
  /// Called on the publish path, before a post becomes visible to anyone else.
  Future<ModerationResult> screenPost({
    required String caption,
    required String creatorIntent,
    String? mediaUrl,
  });

  /// Called before a comment is stored.
  Future<ModerationResult> screenText(String text);

  Future<void> reportPost({
    required String postId,
    required String reporterId,
    required ReportReason reason,
    String note = '',
  });

  Future<void> reportUser({
    required String userId,
    required String reporterId,
    required ReportReason reason,
    String note = '',
  });
}
