import 'package:flutter/material.dart';

import '../theme/wainzo_colors.dart';
import '../theme/wainzo_tokens.dart';
import '../theme/wainzo_typography.dart';
import '../utils/error_message.dart';
import 'wainzo_button.dart';

/// Loading, empty and error, written once.
///
/// Every screen in the app has all three. They are here rather than improvised
/// per screen so that "we are fetching", "there is nothing" and "it broke" are
/// visibly different states, and so an empty state always says what would fill
/// it rather than just announcing that it is empty.
class WainzoLoading extends StatelessWidget {
  const WainzoLoading({super.key, this.label, this.compact = false});

  final String? label;
  final bool compact;

  @override
  Widget build(BuildContext context) => Semantics(
    liveRegion: true,
    label: label ?? 'Loading',
    child: Center(
      child: Padding(
        padding: EdgeInsets.symmetric(
          vertical: compact ? Insets.xl : Insets.xxxl,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            const SizedBox(
              width: 22,
              height: 22,
              child: CircularProgressIndicator(strokeWidth: 2),
            ),
            if (label != null) ...<Widget>[
              const SizedBox(height: Insets.lg),
              Text(label!, style: WainzoTypography.caption),
            ],
          ],
        ),
      ),
    ),
  );
}

class WainzoEmpty extends StatelessWidget {
  const WainzoEmpty({
    required this.title,
    required this.body,
    super.key,
    this.icon = Icons.explore_outlined,
    this.actionLabel,
    this.onAction,
  });

  final String title;

  /// What would put something here. An empty state that only says "nothing
  /// here" wastes the one moment someone is looking for a next step.
  final String body;
  final IconData icon;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(Insets.xxl),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          Container(
            width: 56,
            height: 56,
            decoration: const BoxDecoration(
              color: WainzoColors.surfaceRaised,
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: WainzoColors.inkFaint, size: 24),
          ),
          const SizedBox(height: Insets.xl),
          Text(
            title,
            style: WainzoTypography.headlineSmall,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: Insets.sm),
          Text(
            body,
            style: WainzoTypography.bodyMuted,
            textAlign: TextAlign.center,
          ),
          if (actionLabel != null && onAction != null) ...<Widget>[
            const SizedBox(height: Insets.xl),
            WainzoButton(
              label: actionLabel!,
              onPressed: onAction,
              kind: WainzoButtonKind.secondary,
            ),
          ],
        ],
      ),
    ),
  );
}

class WainzoErrorView extends StatelessWidget {
  const WainzoErrorView({
    required this.error,
    super.key,
    this.onRetry,
    this.compact = false,
  });

  final Object error;
  final VoidCallback? onRetry;
  final bool compact;

  /// See [humanMessageFor]. Kept as a static here because most call sites
  /// already have this widget in scope.
  static String messageFor(Object error) => humanMessageFor(error);

  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: EdgeInsets.all(compact ? Insets.lg : Insets.xxl),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          const Icon(
            Icons.cloud_off_rounded,
            color: WainzoColors.inkFaint,
            size: 28,
          ),
          const SizedBox(height: Insets.lg),
          Text(
            messageFor(error),
            style: WainzoTypography.bodyMuted,
            textAlign: TextAlign.center,
          ),
          if (onRetry != null) ...<Widget>[
            const SizedBox(height: Insets.lg),
            WainzoButton(
              label: 'Try again',
              onPressed: onRetry,
              kind: WainzoButtonKind.secondary,
              size: WainzoButtonSize.small,
            ),
          ],
        ],
      ),
    ),
  );
}

/// A section marker: small, wide, quiet.
class SectionHeader extends StatelessWidget {
  const SectionHeader(this.label, {super.key, this.trailing, this.padding});

  final String label;
  final Widget? trailing;
  final EdgeInsetsGeometry? padding;

  @override
  Widget build(BuildContext context) => Padding(
    padding:
        padding ??
        const EdgeInsets.fromLTRB(
          Insets.gutter,
          Insets.xl,
          Insets.gutter,
          Insets.md,
        ),
    child: Row(
      children: <Widget>[
        Expanded(
          child: Text(label.toUpperCase(), style: WainzoTypography.overline),
        ),
        ?trailing,
      ],
    ),
  );
}
