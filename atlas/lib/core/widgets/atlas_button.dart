import 'package:flutter/material.dart';

import '../theme/atlas_colors.dart';
import '../theme/atlas_tokens.dart';
import '../theme/atlas_typography.dart';

enum AtlasButtonKind {
  /// The one decision on the screen. Amber fill.
  primary,

  /// The alternative to the primary. Outlined.
  secondary,

  /// Tertiary, sits inside dense rows.
  ghost,

  /// Destructive, and styled to be noticed before it is pressed.
  danger,
}

enum AtlasButtonSize { small, medium, large }

/// The app's button.
///
/// One widget rather than four Material variants, because the product needs the
/// same press feel everywhere — a quick scale-down under the finger, which on a
/// dark screen reads better than a ripple.
class AtlasButton extends StatefulWidget {
  const AtlasButton({
    required this.label,
    required this.onPressed,
    super.key,
    this.kind = AtlasButtonKind.primary,
    this.size = AtlasButtonSize.medium,
    this.icon,
    this.trailingIcon,
    this.busy = false,
    this.expand = false,
    this.semanticLabel,
  });

  final String label;

  /// Null disables the button. A disabled button still announces itself.
  final VoidCallback? onPressed;

  final AtlasButtonKind kind;
  final AtlasButtonSize size;
  final IconData? icon;
  final IconData? trailingIcon;

  /// Shows a spinner in place of the label and blocks presses.
  final bool busy;
  final bool expand;
  final String? semanticLabel;

  @override
  State<AtlasButton> createState() => _AtlasButtonState();
}

class _AtlasButtonState extends State<AtlasButton> {
  bool _pressed = false;

  bool get _enabled => widget.onPressed != null && !widget.busy;

  @override
  Widget build(BuildContext context) {
    final (
      Color background,
      Color foreground,
      Color? border,
    ) = switch (widget.kind) {
      AtlasButtonKind.primary => (
        AtlasColors.accent,
        AtlasColors.onAccent,
        null,
      ),
      AtlasButtonKind.secondary => (
        Colors.transparent,
        AtlasColors.ink,
        AtlasColors.hairlineStrong,
      ),
      AtlasButtonKind.ghost => (Colors.transparent, AtlasColors.inkMuted, null),
      AtlasButtonKind.danger => (
        Colors.transparent,
        AtlasColors.danger,
        AtlasColors.danger,
      ),
    };

    final (
      double height,
      double padding,
      double fontSize,
    ) = switch (widget.size) {
      // 44 is the smallest a control gets, which is the platform minimum for a
      // comfortable tap target.
      AtlasButtonSize.small => (44.0, Insets.lg, 14.0),
      AtlasButtonSize.medium => (52.0, Insets.xl, 15.0),
      AtlasButtonSize.large => (58.0, Insets.xl, 16.0),
    };

    final double opacity = _enabled ? 1 : 0.38;

    return Semantics(
      button: true,
      enabled: _enabled,
      label: widget.semanticLabel ?? widget.label,
      child: GestureDetector(
        onTapDown: _enabled ? (_) => setState(() => _pressed = true) : null,
        onTapUp: _enabled ? (_) => setState(() => _pressed = false) : null,
        onTapCancel: _enabled ? () => setState(() => _pressed = false) : null,
        onTap: _enabled ? widget.onPressed : null,
        child: AnimatedScale(
          scale: _pressed ? 0.97 : 1,
          duration: Motion.fast,
          curve: Motion.enter,
          child: AnimatedOpacity(
            opacity: opacity,
            duration: Motion.fast,
            child: Container(
              height: height,
              width: widget.expand ? double.infinity : null,
              padding: EdgeInsets.symmetric(horizontal: padding),
              decoration: BoxDecoration(
                color: background,
                borderRadius: BorderRadius.circular(Radii.md),
                border: border == null ? null : Border.all(color: border),
              ),
              child: Row(
                mainAxisSize: widget.expand
                    ? MainAxisSize.max
                    : MainAxisSize.min,
                mainAxisAlignment: MainAxisAlignment.center,
                children: <Widget>[
                  if (widget.busy)
                    SizedBox(
                      width: fontSize + 2,
                      height: fontSize + 2,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: foreground,
                      ),
                    )
                  else ...<Widget>[
                    if (widget.icon != null) ...<Widget>[
                      Icon(widget.icon, size: fontSize + 4, color: foreground),
                      const SizedBox(width: Insets.sm),
                    ],
                    Flexible(
                      child: Text(
                        widget.label,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: AtlasTypography.button.copyWith(
                          color: foreground,
                          fontSize: fontSize,
                        ),
                      ),
                    ),
                    if (widget.trailingIcon != null) ...<Widget>[
                      const SizedBox(width: Insets.sm),
                      Icon(
                        widget.trailingIcon,
                        size: fontSize + 4,
                        color: foreground,
                      ),
                    ],
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// A round icon button for chrome — the player's controls, a sheet's close.
class AtlasIconButton extends StatelessWidget {
  const AtlasIconButton({
    required this.icon,
    required this.onPressed,
    required this.tooltip,
    super.key,
    this.size = 44,
    this.filled = true,
    this.color,
  });

  final IconData icon;
  final VoidCallback? onPressed;

  /// Doubles as the accessibility label, so it is required rather than optional.
  final String tooltip;
  final double size;
  final bool filled;
  final Color? color;

  @override
  Widget build(BuildContext context) => Semantics(
    button: true,
    label: tooltip,
    child: Tooltip(
      message: tooltip,
      child: InkResponse(
        onTap: onPressed,
        radius: size / 2,
        child: Container(
          width: size,
          height: size,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: filled
                ? AtlasColors.surfaceRaised.withValues(alpha: 0.86)
                : null,
            border: filled ? Border.all(color: AtlasColors.hairline) : null,
          ),
          child: Icon(icon, size: size * 0.44, color: color ?? AtlasColors.ink),
        ),
      ),
    ),
  );
}
