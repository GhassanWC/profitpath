import 'package:flutter/material.dart';

import '../theme/atlas_colors.dart';
import '../theme/atlas_tokens.dart';
import '../theme/atlas_typography.dart';

/// A small, selectable label.
///
/// Fully rounded, because a chip is a pill by nature — one of the few shapes
/// in the app that is.
class AtlasChip extends StatelessWidget {
  const AtlasChip({
    required this.label,
    super.key,
    this.selected = false,
    this.onTap,
    this.onRemove,
    this.leading,
    this.dotColor,
    this.dense = false,
  });

  final String label;
  final bool selected;
  final VoidCallback? onTap;

  /// When set, the chip shows an × and this fires. Used for target countries.
  final VoidCallback? onRemove;

  final Widget? leading;

  /// A category's 6px mark.
  final Color? dotColor;
  final bool dense;

  @override
  Widget build(BuildContext context) {
    final Color foreground = selected ? AtlasColors.onAccent : AtlasColors.ink;
    final Widget content = AnimatedContainer(
      duration: Motion.fast,
      curve: Motion.enter,
      padding: EdgeInsets.symmetric(
        horizontal: dense ? Insets.md : Insets.lg,
        vertical: dense ? Insets.sm : Insets.md - 2,
      ),
      decoration: BoxDecoration(
        color: selected ? AtlasColors.accent : AtlasColors.surfaceRaised,
        borderRadius: BorderRadius.circular(Radii.pill),
        border: Border.all(
          color: selected ? AtlasColors.accent : AtlasColors.hairline,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          if (dotColor != null) ...<Widget>[
            Container(
              width: 6,
              height: 6,
              decoration: BoxDecoration(
                color: dotColor,
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: Insets.sm),
          ],
          if (leading != null) ...<Widget>[
            leading!,
            const SizedBox(width: Insets.sm),
          ],
          Text(
            label,
            style: AtlasTypography.label.copyWith(
              color: foreground,
              fontSize: dense ? 12.5 : 13.5,
            ),
          ),
          if (onRemove != null) ...<Widget>[
            const SizedBox(width: Insets.sm),
            GestureDetector(
              onTap: onRemove,
              behavior: HitTestBehavior.opaque,
              child: Semantics(
                button: true,
                label: 'Remove $label',
                child: Icon(
                  Icons.close_rounded,
                  size: 15,
                  color: foreground.withValues(alpha: 0.8),
                ),
              ),
            ),
          ],
        ],
      ),
    );

    if (onTap == null) return content;
    return Semantics(
      button: true,
      selected: selected,
      label: label,
      child: GestureDetector(
        onTap: onTap,
        behavior: HitTestBehavior.opaque,
        child: content,
      ),
    );
  }
}
