import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/wainzo_colors.dart';
import '../../../core/theme/wainzo_tokens.dart';
import '../../../core/theme/wainzo_typography.dart';
import '../../../core/utils/formatters.dart';
import '../../../models/post.dart';
import '../../../providers/app_providers.dart';
import '../../map/widgets/country_poster.dart';

/// One post in a profile grid.
///
/// Labelled with how many people chose to watch rather than how many people
/// liked it — the number that tells a creator whether their preview did its
/// job, which is the only number this product wants them optimising.
class PostGridTile extends ConsumerWidget {
  const PostGridTile({required this.post, required this.onTap, super.key});

  final Post post;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context, WidgetRef ref) => GestureDetector(
    onTap: onTap,
    child: Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(Radii.md),
        border: Border.all(color: WainzoColors.hairline),
      ),
      clipBehavior: Clip.antiAlias,
      child: Stack(
        fit: StackFit.expand,
        children: <Widget>[
          CountryPoster(
            countryCode: post.originCountry ?? 'OM',
            outlines: ref.watch(worldOutlinesProvider).value,
            tint: post.category.swatch,
            seed: post.id.hashCode,
          ),
          const DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: <Color>[Color(0x00000000), Color(0xCC06080C)],
                stops: <double>[0.4, 1],
              ),
            ),
          ),
          if (post.status != PostStatus.published)
            Positioned(
              top: Insets.sm,
              left: Insets.sm,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: WainzoColors.ground.withValues(alpha: 0.8),
                  borderRadius: BorderRadius.circular(Radii.xs),
                ),
                child: Text(
                  post.status.name.toUpperCase(),
                  style: WainzoTypography.overline.copyWith(fontSize: 9),
                ),
              ),
            ),
          Positioned(
            left: Insets.sm,
            right: Insets.sm,
            bottom: Insets.sm,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  post.preview?.headline ?? post.caption,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: WainzoTypography.label.copyWith(fontSize: 12.5),
                ),
                const SizedBox(height: 2),
                Row(
                  children: <Widget>[
                    const Icon(
                      Icons.play_arrow_rounded,
                      size: 12,
                      color: WainzoColors.inkMuted,
                    ),
                    const SizedBox(width: 2),
                    Text(
                      Format.compact(post.metrics.watches),
                      style: WainzoTypography.overline.copyWith(fontSize: 9.5),
                    ),
                    const SizedBox(width: Insets.sm),
                    Text(
                      post.isGlobal
                          ? 'GLOBAL'
                          : '${post.targetCountries.length} COUNTRIES',
                      style: WainzoTypography.overline.copyWith(fontSize: 9.5),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    ),
  );
}
