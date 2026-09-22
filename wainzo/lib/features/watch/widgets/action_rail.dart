import 'package:flutter/material.dart';

import '../../../core/theme/wainzo_colors.dart';
import '../../../core/theme/wainzo_tokens.dart';
import '../../../core/theme/wainzo_typography.dart';
import '../../../core/utils/formatters.dart';
import '../../../models/post.dart';

/// Like, comment, share, save.
///
/// Present because people expect to be able to say "that was good" — but small,
/// quiet, and never the first thing on the screen. The counts are shown at
/// label size rather than headline size for the same reason: this product does
/// not want anyone, creator or viewer, reading a feed through them.
class ActionRail extends StatelessWidget {
  const ActionRail({
    required this.post,
    required this.liked,
    required this.saved,
    required this.onLike,
    required this.onComment,
    required this.onShare,
    required this.onSave,
    super.key,
  });

  final Post post;
  final bool liked;
  final bool saved;
  final VoidCallback onLike;
  final VoidCallback onComment;
  final VoidCallback onShare;
  final VoidCallback onSave;

  @override
  Widget build(BuildContext context) => Column(
    mainAxisSize: MainAxisSize.min,
    children: <Widget>[
      _RailButton(
        icon: liked ? Icons.favorite_rounded : Icons.favorite_border_rounded,
        label: Format.compact(post.metrics.likes),
        tooltip: liked ? 'Remove like' : 'Like',
        active: liked,
        onPressed: onLike,
      ),
      _RailButton(
        icon: Icons.mode_comment_outlined,
        label: Format.compact(post.metrics.comments),
        tooltip: 'Comments',
        onPressed: onComment,
      ),
      _RailButton(
        icon: saved ? Icons.bookmark_rounded : Icons.bookmark_border_rounded,
        label: Format.compact(post.metrics.saves),
        tooltip: saved ? 'Remove from saved' : 'Save',
        active: saved,
        onPressed: onSave,
      ),
      _RailButton(
        icon: Icons.ios_share_rounded,
        label: Format.compact(post.metrics.shares),
        tooltip: 'Share',
        onPressed: onShare,
      ),
    ],
  );
}

class _RailButton extends StatelessWidget {
  const _RailButton({
    required this.icon,
    required this.label,
    required this.tooltip,
    required this.onPressed,
    this.active = false,
  });

  final IconData icon;
  final String label;
  final String tooltip;
  final VoidCallback onPressed;
  final bool active;

  @override
  Widget build(BuildContext context) => Semantics(
    button: true,
    label: '$tooltip, $label',
    child: Padding(
      padding: const EdgeInsets.only(bottom: Insets.lg),
      child: InkResponse(
        onTap: onPressed,
        radius: 28,
        child: Column(
          children: <Widget>[
            AnimatedScale(
              scale: active ? 1.12 : 1,
              duration: Motion.fast,
              curve: Motion.enter,
              child: Icon(
                icon,
                size: 26,
                color: active ? WainzoColors.accent : WainzoColors.ink,
                shadows: const <Shadow>[
                  Shadow(color: Color(0x99000000), blurRadius: 8),
                ],
              ),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: WainzoTypography.overline.copyWith(
                color: WainzoColors.ink,
                fontSize: 10.5,
                letterSpacing: 0.4,
              ),
            ),
          ],
        ),
      ),
    ),
  );
}
