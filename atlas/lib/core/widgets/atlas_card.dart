import 'package:flutter/material.dart';

import '../theme/atlas_colors.dart';
import '../theme/atlas_tokens.dart';

/// A sheet on the ground.
///
/// Told apart from what is behind it by a hairline and a tint — never a shadow,
/// which on a near-black ground reads as a smudge rather than as height.
class AtlasCard extends StatelessWidget {
  const AtlasCard({
    required this.child,
    super.key,
    this.padding = const EdgeInsets.all(Insets.lg),
    this.radius = Radii.lg,
    this.color = AtlasColors.surface,
    this.border = AtlasColors.hairline,
    this.onTap,
    this.clip = false,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final double radius;
  final Color color;
  final Color? border;
  final VoidCallback? onTap;

  /// Set when the card holds media that must be cut to its corners.
  final bool clip;

  @override
  Widget build(BuildContext context) {
    final Widget body = Container(
      padding: padding,
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(radius),
        border: border == null ? null : Border.all(color: border!),
      ),
      clipBehavior: clip ? Clip.antiAlias : Clip.none,
      child: child,
    );

    if (onTap == null) return body;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(radius),
        splashColor: AtlasColors.accentSoft,
        highlightColor: AtlasColors.accentSoft,
        child: body,
      ),
    );
  }
}
