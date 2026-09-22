import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/wainzo_colors.dart';
import '../../core/theme/wainzo_tokens.dart';
import '../../core/theme/wainzo_typography.dart';
import '../../core/widgets/state_views.dart';
import '../../models/feedback_signal.dart';
import '../../models/post.dart';
import '../../providers/app_providers.dart';
import '../../providers/session_providers.dart';
import '../../services/moderation/moderation_service.dart';
import '../feed/feed_providers.dart';

/// What happened, so the caller can react — pop the screen after a delete,
/// advance the feed after "not interested".
enum PostAction { none, notInterested, reported, blocked, deleted }

/// The safety and control menu for a post.
///
/// Reporting, blocking and deleting are here from the first version rather than
/// deferred, because a public network without them is not shippable — to a
/// store or to people. Everything destructive confirms first, and everything
/// says plainly what it will do.
Future<PostAction> showPostActions(BuildContext context, Post post) async =>
    await showModalBottomSheet<PostAction>(
      context: context,
      backgroundColor: WainzoColors.surface,
      builder: (BuildContext context) => _PostActionsSheet(post: post),
    ) ??
    PostAction.none;

class _PostActionsSheet extends ConsumerWidget {
  const _PostActionsSheet({required this.post});

  final Post post;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final bool isMine = post.creatorId == ref.watch(viewerIdProvider);

    return SafeArea(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          if (!isMine) ...<Widget>[
            _ActionTile(
              icon: Icons.do_not_disturb_on_outlined,
              label: 'Not interested',
              detail: 'Fewer posts like this one. Stronger than a skip.',
              onTap: () async {
                await ref.recordSignal(
                  post: post,
                  kind: FeedbackKind.notInterested,
                );
                if (context.mounted) {
                  Navigator.of(context).pop(PostAction.notInterested);
                }
              },
            ),
            _ActionTile(
              icon: Icons.flag_outlined,
              label: 'Report this post',
              detail: 'Send it to moderation for a look.',
              onTap: () => _report(context, ref),
            ),
            _ActionTile(
              icon: Icons.block_rounded,
              label: 'Block this creator',
              detail: 'You will stop seeing anything of theirs.',
              danger: true,
              onTap: () => _block(context, ref),
            ),
          ],
          if (isMine)
            _ActionTile(
              icon: Icons.delete_outline_rounded,
              label: 'Delete this post',
              detail: 'It is removed everywhere, including from people who saved it.',
              danger: true,
              onTap: () => _delete(context, ref),
            ),
          const SizedBox(height: Insets.md),
        ],
      ),
    );
  }

  Future<void> _report(BuildContext context, WidgetRef ref) async {
    final ReportReason? reason = await showModalBottomSheet<ReportReason>(
      context: context,
      backgroundColor: WainzoColors.surface,
      builder: (BuildContext context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Padding(
              padding: const EdgeInsets.fromLTRB(
                Insets.gutter,
                Insets.sm,
                Insets.gutter,
                Insets.md,
              ),
              child: Text(
                'What is wrong with it?',
                style: WainzoTypography.title,
              ),
            ),
            for (final ReportReason reason in ReportReason.values)
              ListTile(
                title: Text(reason.label, style: WainzoTypography.body),
                onTap: () => Navigator.of(context).pop(reason),
              ),
            const SizedBox(height: Insets.md),
          ],
        ),
      ),
    );
    if (reason == null) return;

    try {
      await ref
          .read(moderationServiceProvider)
          .reportPost(
            postId: post.id,
            reporterId: ref.read(viewerIdProvider),
            reason: reason,
          );
      await ref.recordSignal(post: post, kind: FeedbackKind.report);
      if (context.mounted) Navigator.of(context).pop(PostAction.reported);
    } on Object catch (error) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(WainzoErrorView.messageFor(error))),
        );
      }
    }
  }

  Future<void> _block(BuildContext context, WidgetRef ref) async {
    final bool confirmed = await _confirm(
      context,
      title: 'Block this creator?',
      body:
          'You will not see their posts again, and they will not see yours. '
          'You can undo this from their profile.',
      action: 'Block',
    );
    if (!confirmed) return;
    await ref
        .read(userRepositoryProvider)
        .block(userId: ref.read(viewerIdProvider), targetId: post.creatorId);
    if (context.mounted) Navigator.of(context).pop(PostAction.blocked);
  }

  Future<void> _delete(BuildContext context, WidgetRef ref) async {
    final bool confirmed = await _confirm(
      context,
      title: 'Delete this post?',
      body: 'This cannot be undone. It is removed from every country you sent it to.',
      action: 'Delete',
    );
    if (!confirmed) return;
    await ref.read(postRepositoryProvider).delete(post.id);
    if (context.mounted) Navigator.of(context).pop(PostAction.deleted);
  }

  Future<bool> _confirm(
    BuildContext context, {
    required String title,
    required String body,
    required String action,
  }) async =>
      await showDialog<bool>(
        context: context,
        builder: (BuildContext context) => AlertDialog(
          title: Text(title),
          content: Text(body),
          actions: <Widget>[
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('Cancel'),
            ),
            TextButton(
              onPressed: () => Navigator.of(context).pop(true),
              child: Text(
                action,
                style: const TextStyle(color: WainzoColors.danger),
              ),
            ),
          ],
        ),
      ) ??
      false;
}

class _ActionTile extends StatelessWidget {
  const _ActionTile({
    required this.icon,
    required this.label,
    required this.detail,
    required this.onTap,
    this.danger = false,
  });

  final IconData icon;
  final String label;
  final String detail;
  final VoidCallback onTap;
  final bool danger;

  @override
  Widget build(BuildContext context) => ListTile(
    onTap: onTap,
    leading: Icon(icon, color: danger ? WainzoColors.danger : WainzoColors.ink),
    title: Text(
      label,
      style: WainzoTypography.body.copyWith(
        color: danger ? WainzoColors.danger : WainzoColors.ink,
      ),
    ),
    subtitle: Text(detail, style: WainzoTypography.caption),
  );
}
