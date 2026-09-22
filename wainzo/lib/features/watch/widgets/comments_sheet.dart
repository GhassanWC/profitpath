import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/wainzo_colors.dart';
import '../../../core/theme/wainzo_tokens.dart';
import '../../../core/theme/wainzo_typography.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/wainzo_button.dart';
import '../../../core/widgets/country_flag.dart';
import '../../../core/widgets/state_views.dart';
import '../../../core/widgets/user_avatar.dart';
import '../../../models/comment.dart';
import '../../../models/feedback_signal.dart';
import '../../../models/post.dart';
import '../../../providers/app_providers.dart';
import '../../../providers/session_providers.dart';
import '../../feed/feed_providers.dart';
import '../watch_providers.dart';

Future<void> showComments(BuildContext context, Post post) =>
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: WainzoColors.surface,
      builder: (BuildContext context) => _CommentsSheet(post: post),
    );

class _CommentsSheet extends ConsumerStatefulWidget {
  const _CommentsSheet({required this.post});

  final Post post;

  @override
  ConsumerState<_CommentsSheet> createState() => _CommentsSheetState();
}

class _CommentsSheetState extends ConsumerState<_CommentsSheet> {
  final TextEditingController _input = TextEditingController();
  bool _sending = false;
  String? _error;

  @override
  void dispose() {
    _input.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final String body = _input.text.trim();
    if (body.isEmpty || _sending) return;
    setState(() {
      _sending = true;
      _error = null;
    });
    try {
      await ref
          .read(commentRepositoryProvider)
          .add(
            postId: widget.post.id,
            authorId: ref.read(viewerIdProvider),
            body: body,
          );
      _input.clear();
      ref.invalidate(commentsProvider(widget.post.id));
      await ref.recordSignal(
        post: widget.post,
        kind: FeedbackKind.comment,
        surface: FeedbackSurface.watch,
      );
    } on Object catch (error) {
      if (mounted) setState(() => _error = WainzoErrorView.messageFor(error));
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final AsyncValue<List<PostComment>> comments = ref.watch(
      commentsProvider(widget.post.id),
    );

    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SizedBox(
        height: MediaQuery.sizeOf(context).height * 0.78,
        child: Column(
          children: <Widget>[
            Padding(
              padding: const EdgeInsets.fromLTRB(
                Insets.gutter,
                0,
                Insets.gutter,
                Insets.md,
              ),
              child: Row(
                children: <Widget>[
                  Text('Comments', style: WainzoTypography.title),
                  const SizedBox(width: Insets.sm),
                  Text(
                    Format.compact(widget.post.metrics.comments),
                    style: WainzoTypography.caption,
                  ),
                ],
              ),
            ),
            Expanded(
              child: switch (comments) {
                AsyncData<List<PostComment>>(
                  value: final List<PostComment> list,
                ) =>
                  list.isEmpty
                      ? const WainzoEmpty(
                          title: 'No replies yet',
                          body:
                              'If the creator asked something, an answer from where you are '
                              'is worth more than one from anywhere else.',
                          icon: Icons.mode_comment_outlined,
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.symmetric(
                            horizontal: Insets.gutter,
                          ),
                          itemCount: list.length,
                          itemBuilder: (BuildContext context, int index) =>
                              _CommentTile(comment: list[index]),
                        ),
                AsyncError<List<PostComment>>(error: final Object error) =>
                  WainzoErrorView(
                    error: error,
                    onRetry: () =>
                        ref.invalidate(commentsProvider(widget.post.id)),
                  ),
                _ => const WainzoLoading(),
              },
            ),
            if (_error != null)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: Insets.gutter),
                child: Text(
                  _error!,
                  style: WainzoTypography.caption.copyWith(
                    color: WainzoColors.danger,
                  ),
                ),
              ),
            SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(
                  Insets.gutter,
                  Insets.md,
                  Insets.gutter,
                  Insets.md,
                ),
                child: Row(
                  children: <Widget>[
                    Expanded(
                      child: TextField(
                        controller: _input,
                        textInputAction: TextInputAction.send,
                        onSubmitted: (_) => _send(),
                        minLines: 1,
                        maxLines: 4,
                        decoration: const InputDecoration(
                          hintText: 'Add a reply',
                        ),
                      ),
                    ),
                    const SizedBox(width: Insets.md),
                    WainzoButton(
                      label: 'Send',
                      onPressed: _send,
                      busy: _sending,
                      size: WainzoButtonSize.small,
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CommentTile extends StatelessWidget {
  const _CommentTile({required this.comment});

  final PostComment comment;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: Insets.md),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        UserAvatar(
          initials: _initials(comment.authorName),
          imageUrl: comment.authorImageUrl,
          size: 34,
        ),
        const SizedBox(width: Insets.md),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Row(
                children: <Widget>[
                  Flexible(
                    child: Text(
                      comment.authorName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: WainzoTypography.titleSmall.copyWith(fontSize: 14),
                    ),
                  ),
                  if (comment.authorCountry != null) ...<Widget>[
                    const SizedBox(width: Insets.sm),
                    CountryFlag(comment.authorCountry!, size: 13),
                  ],
                  const SizedBox(width: Insets.sm),
                  Text(
                    Format.relative(comment.createdAt),
                    style: WainzoTypography.overline,
                  ),
                ],
              ),
              const SizedBox(height: 3),
              Text(
                comment.body,
                style: WainzoTypography.bodyMuted.copyWith(fontSize: 14),
              ),
            ],
          ),
        ),
      ],
    ),
  );

  static String _initials(String name) {
    final List<String> parts = name.trim().split(RegExp(r'\s+'));
    if (parts.isEmpty || parts.first.isEmpty) return '?';
    if (parts.length == 1) return parts.first.substring(0, 1).toUpperCase();
    return (parts.first[0] + parts.last[0]).toUpperCase();
  }
}
