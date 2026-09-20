import 'package:flutter/material.dart';

import '../theme/atlas_colors.dart';
import '../theme/atlas_typography.dart';

/// A person's picture, or their initials.
///
/// The initials path is the normal one, not the error one: most accounts in a
/// young network have no photo, and a grey silhouette everywhere makes a
/// product look dead.
class UserAvatar extends StatelessWidget {
  const UserAvatar({
    required this.initials,
    super.key,
    this.imageUrl,
    this.size = 40,
    this.ring = false,
  });

  final String initials;
  final String? imageUrl;
  final double size;

  /// An amber ring, for the creator of whatever is on screen.
  final bool ring;

  @override
  Widget build(BuildContext context) {
    final String? url = imageUrl;
    return Semantics(
      label: initials,
      excludeSemantics: true,
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: AtlasColors.surfaceHigh,
          border: Border.all(
            color: ring ? AtlasColors.accent : AtlasColors.hairline,
            width: ring ? 1.5 : 1,
          ),
        ),
        clipBehavior: Clip.antiAlias,
        child: url == null || url.isEmpty
            ? _Initials(initials: initials, size: size)
            : Image.network(
                url,
                fit: BoxFit.cover,
                // A slow image should not leave a hole: the initials stay until
                // the photo is actually there, and stay for good if it fails.
                loadingBuilder:
                    (
                      BuildContext context,
                      Widget child,
                      ImageChunkEvent? progress,
                    ) => progress == null
                    ? child
                    : _Initials(initials: initials, size: size),
                errorBuilder: (
                  BuildContext context,
                  Object error,
                  StackTrace? stack,
                ) => _Initials(initials: initials, size: size),
              ),
      ),
    );
  }
}

class _Initials extends StatelessWidget {
  const _Initials({required this.initials, required this.size});

  final String initials;
  final double size;

  @override
  Widget build(BuildContext context) => Center(
    child: Text(
      initials,
      style: AtlasTypography.titleSmall.copyWith(
        fontSize: size * 0.36,
        color: AtlasColors.inkMuted,
        letterSpacing: 0.3,
      ),
    ),
  );
}
