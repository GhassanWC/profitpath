import 'package:flutter/material.dart';

import '../../../core/theme/wainzo_colors.dart';
import '../../../core/theme/wainzo_tokens.dart';
import '../../../core/theme/wainzo_typography.dart';
import '../../../core/widgets/wainzo_button.dart';

/// What an AI preview is, in the app, at the moment someone wonders.
///
/// Offered from every preview card. If the product's claim is that the model
/// explains content honestly, then the terms of that claim have to be readable
/// without leaving the feed.
Future<void> showPreviewExplainer(BuildContext context) =>
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: WainzoColors.surface,
      isScrollControlled: true,
      builder: (BuildContext context) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(
            Insets.xl,
            Insets.sm,
            Insets.xl,
            Insets.xl,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text('About AI previews', style: WainzoTypography.headline),
              const SizedBox(height: Insets.lg),
              const _Point(
                title: 'It describes, it does not sell',
                body:
                    'The preview says what is in the post and who might care. It is not '
                    'allowed to withhold the point to make you tap, and previews that try '
                    'are held back before they are published.',
              ),
              const _Point(
                title: 'It starts from the creator’s own words',
                body:
                    'When someone posts, they say what they want the post to achieve and '
                    'where it should be seen. The model works from that, not from guessing '
                    'what would get the most attention.',
              ),
              const _Point(
                title: 'The creator saw it first',
                body:
                    'Every profile and preview is shown to the creator before publishing, '
                    'and they can change any of it. The model assists. It does not overrule.',
              ),
              const _Point(
                title: 'Skipping is not a downvote',
                body:
                    'Skipping tells us this one was not for you right now. It does not '
                    'count against the post or the person who made it.',
              ),
              const SizedBox(height: Insets.md),
              WainzoButton(
                label: 'Got it',
                onPressed: () => Navigator.of(context).pop(),
                kind: WainzoButtonKind.secondary,
                expand: true,
              ),
            ],
          ),
        ),
      ),
    );

class _Point extends StatelessWidget {
  const _Point({required this.title, required this.body});

  final String title;
  final String body;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: Insets.lg),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Text(title, style: WainzoTypography.titleSmall),
        const SizedBox(height: 4),
        Text(body, style: WainzoTypography.caption.copyWith(height: 1.5)),
      ],
    ),
  );
}
