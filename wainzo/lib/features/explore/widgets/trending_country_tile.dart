import 'package:flutter/material.dart';

import '../../../core/theme/wainzo_colors.dart';
import '../../../core/theme/wainzo_tokens.dart';
import '../../../core/theme/wainzo_typography.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/country_flag.dart';
import '../../../models/country.dart';

/// One row of the trending list.
class TrendingCountryTile extends StatelessWidget {
  const TrendingCountryTile({
    required this.activity,
    required this.onTap,
    super.key,
    this.rank,
    this.selected = false,
  });

  final CountryActivity activity;
  final VoidCallback onTap;
  final int? rank;
  final bool selected;

  @override
  Widget build(BuildContext context) => Semantics(
    button: true,
    selected: selected,
    label:
        '${activity.country.name}, '
        '${Format.compact(activity.newPostsToday)} new posts',
    child: Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        child: AnimatedContainer(
          duration: Motion.fast,
          padding: const EdgeInsets.symmetric(
            horizontal: Insets.gutter,
            vertical: Insets.md,
          ),
          color: selected ? WainzoColors.accentSoft : Colors.transparent,
          child: Row(
            children: <Widget>[
              if (rank != null) ...<Widget>[
                SizedBox(
                  width: 22,
                  child: Text('$rank', style: WainzoTypography.overline),
                ),
                const SizedBox(width: Insets.sm),
              ],
              CountryFlag(activity.code, size: 24),
              const SizedBox(width: Insets.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(
                      activity.country.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: WainzoTypography.titleSmall,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      activity.trendingTopics.isEmpty
                          ? '${Format.compact(activity.postCount)} posts here'
                          : activity.trendingTopics.take(3).join(' · '),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: WainzoTypography.caption,
                    ),
                  ],
                ),
              ),
              const SizedBox(width: Insets.md),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: <Widget>[
                  Text(
                    Format.compact(activity.newPostsToday),
                    style: WainzoTypography.titleSmall.copyWith(
                      fontFamily: WainzoTypography.serif,
                      fontSize: 18,
                      color: WainzoColors.accent,
                    ),
                  ),
                  Text(
                    'new today',
                    style: WainzoTypography.overline.copyWith(fontSize: 9.5),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    ),
  );
}
