import 'package:flutter/material.dart';

import '../../../core/theme/wainzo_colors.dart';
import '../../../core/theme/wainzo_tokens.dart';
import '../../../core/theme/wainzo_typography.dart';
import '../../../core/widgets/wainzo_chip.dart';
import '../../../models/ai_profile.dart';
import '../../../models/post.dart';

/// The AI's reading of the post, collapsed by default.
///
/// Someone who tapped watch has already read the preview — repeating it over
/// the video would be noise. It stays available in one tap for the times it is
/// wanted: checking whether the preview was accurate, or seeing what the post
/// is filed under.
class AiSummaryPanel extends StatefulWidget {
  const AiSummaryPanel({required this.post, super.key});

  final Post post;

  @override
  State<AiSummaryPanel> createState() => _AiSummaryPanelState();
}

class _AiSummaryPanelState extends State<AiSummaryPanel> {
  bool _open = false;

  @override
  Widget build(BuildContext context) {
    final AiContentProfile? profile = widget.post.profile;
    final AiPreview? preview = widget.post.preview;
    if (profile == null && preview == null) return const SizedBox.shrink();

    return AnimatedSize(
      duration: Motion.base,
      curve: Motion.enter,
      alignment: Alignment.bottomCenter,
      child: Container(
        width: double.infinity,
        decoration: BoxDecoration(
          color: WainzoColors.ground.withValues(alpha: 0.72),
          borderRadius: BorderRadius.circular(Radii.md),
          border: Border.all(color: WainzoColors.hairline),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Semantics(
              button: true,
              expanded: _open,
              label: 'What the AI made of this post',
              child: InkWell(
                onTap: () => setState(() => _open = !_open),
                borderRadius: BorderRadius.circular(Radii.md),
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: Insets.lg,
                    vertical: Insets.md,
                  ),
                  child: Row(
                    children: <Widget>[
                      Expanded(
                        child: Text(
                          'WHAT THE AI MADE OF THIS',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: WainzoTypography.overline.copyWith(
                            color: WainzoColors.accent,
                          ),
                        ),
                      ),
                      const SizedBox(width: Insets.sm),
                      AnimatedRotation(
                        turns: _open ? 0.5 : 0,
                        duration: Motion.base,
                        child: const Icon(
                          Icons.keyboard_arrow_down_rounded,
                          size: 18,
                          color: WainzoColors.inkMuted,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            if (_open)
              Padding(
                padding: const EdgeInsets.fromLTRB(
                  Insets.lg,
                  0,
                  Insets.lg,
                  Insets.lg,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    if (preview != null) ...<Widget>[
                      Text(preview.summary, style: WainzoTypography.bodyMuted),
                      const SizedBox(height: Insets.md),
                    ],
                    if (profile != null) ...<Widget>[
                      Wrap(
                        spacing: Insets.sm,
                        runSpacing: Insets.sm,
                        children: <Widget>[
                          WainzoChip(
                            label: profile.category.label,
                            dotColor: profile.category.swatch,
                            dense: true,
                          ),
                          WainzoChip(
                            label: profile.contentType.label,
                            dense: true,
                          ),
                          for (final String topic in profile.topics.take(4))
                            WainzoChip(label: topic, dense: true),
                        ],
                      ),
                      if (profile.audience.isNotEmpty) ...<Widget>[
                        const SizedBox(height: Insets.md),
                        Text('WHO IT IS FOR', style: WainzoTypography.overline),
                        const SizedBox(height: 4),
                        Text(
                          profile.audience.join(' · '),
                          style: WainzoTypography.caption,
                        ),
                      ],
                    ],
                    if (widget.post.creatorIntent.isNotEmpty) ...<Widget>[
                      const SizedBox(height: Insets.md),
                      Text(
                        'WHAT THE CREATOR WANTED',
                        style: WainzoTypography.overline,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '“${widget.post.creatorIntent}”',
                        style: WainzoTypography.caption.copyWith(
                          fontStyle: FontStyle.italic,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}
