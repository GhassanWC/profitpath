import 'package:flutter/material.dart';

import '../theme/atlas_colors.dart';
import '../theme/atlas_tokens.dart';
import '../theme/atlas_typography.dart';
import '../utils/flag_emoji.dart';

/// A country's flag, with the code as the fallback.
///
/// Flag emoji do not render on every platform — notably not on stock Windows,
/// and not in every test environment — so the code is always available as a
/// legible substitute rather than an empty box.
class CountryFlag extends StatelessWidget {
  const CountryFlag(this.code, {super.key, this.size = 18});

  final String code;
  final double size;

  @override
  Widget build(BuildContext context) {
    final String emoji = flagEmojiFor(code);
    return Semantics(
      label: code.toUpperCase(),
      excludeSemantics: true,
      child: emoji.isEmpty
          ? Container(
              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
              decoration: BoxDecoration(
                color: AtlasColors.surfaceHigh,
                borderRadius: BorderRadius.circular(Radii.xs),
              ),
              child: Text(
                code.toUpperCase(),
                style: AtlasTypography.overline.copyWith(fontSize: size * 0.55),
              ),
            )
          : Text(
              emoji,
              style: TextStyle(
                fontSize: size,
                height: 1.1,
                // Inter carries no emoji, so the platform's emoji font has to
                // be named for the flag to resolve. These are the real family
                // names on iOS, Android and Windows; the ones that do not
                // exist on a given platform are skipped.
                fontFamilyFallback: const <String>[
                  'Apple Color Emoji',
                  'Noto Color Emoji',
                  'Segoe UI Emoji',
                ],
              ),
            ),
    );
  }
}

/// Flag, then name. The standard way a place is written in this app.
class CountryLabel extends StatelessWidget {
  const CountryLabel({
    required this.code,
    required this.name,
    super.key,
    this.style,
    this.flagSize = 16,
    this.prefix,
  });

  final String code;
  final String name;
  final TextStyle? style;
  final double flagSize;

  /// e.g. "From" in "From Oman".
  final String? prefix;

  @override
  Widget build(BuildContext context) => Row(
    mainAxisSize: MainAxisSize.min,
    children: <Widget>[
      CountryFlag(code, size: flagSize),
      const SizedBox(width: Insets.sm),
      Flexible(
        child: Text(
          prefix == null ? name : '$prefix $name',
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: style ?? AtlasTypography.label,
        ),
      ),
    ],
  );
}
