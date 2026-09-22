import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/wainzo_colors.dart';
import '../../../core/theme/wainzo_tokens.dart';
import '../../../core/theme/wainzo_typography.dart';
import '../../../core/widgets/country_flag.dart';
import '../../../data/geo/world_outlines.dart';
import '../../../providers/app_providers.dart';
import '../../map/map_camera.dart';
import '../../map/widgets/world_map.dart';

/// Where a creator's work has been sent.
///
/// The most Wainzo-specific thing on a profile: on other networks a creator's
/// identity is a follower count, and here it is a shape on a map. It reads as
/// a record of intent rather than of popularity, which is the distinction the
/// whole product rests on.
class ReachMap extends ConsumerWidget {
  const ReachMap({required this.reach, super.key, this.height = 190});

  /// Country code to how many posts were aimed there.
  final Map<String, int> reach;
  final double height;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final WorldOutlines? outlines = ref.watch(worldOutlinesProvider).value;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: Insets.gutter),
          child: Row(
            children: <Widget>[
              Expanded(
                child: Text(
                  'CONTENT REACH',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: WainzoTypography.overline,
                ),
              ),
              const SizedBox(width: Insets.sm),
              Text(
                reach.isEmpty
                    ? 'Nowhere yet'
                    : '${reach.length} ${reach.length == 1 ? 'country' : 'countries'}',
                style: WainzoTypography.overline.copyWith(
                  color: WainzoColors.accent,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: Insets.md),
        Container(
          height: height,
          margin: const EdgeInsets.symmetric(horizontal: Insets.gutter),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(Radii.lg),
            border: Border.all(color: WainzoColors.hairline),
          ),
          clipBehavior: Clip.antiAlias,
          child: outlines == null
              ? const ColoredBox(color: WainzoColors.ocean)
              : _StaticMap(outlines: outlines, highlighted: reach.keys.toSet()),
        ),
        if (reach.isNotEmpty) ...<Widget>[
          const SizedBox(height: Insets.md),
          SizedBox(
            height: 30,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: Insets.gutter),
              children: <Widget>[
                for (final MapEntry<String, int> entry
                    in (reach.entries.toList()..sort(
                      (MapEntry<String, int> a, MapEntry<String, int> b) =>
                          b.value.compareTo(a.value),
                    )))
                  Padding(
                    padding: const EdgeInsets.only(right: Insets.lg),
                    child: Row(
                      children: <Widget>[
                        CountryFlag(entry.key, size: 16),
                        const SizedBox(width: 6),
                        Text(
                          '${entry.value}',
                          style: WainzoTypography.overline,
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
        ],
      ],
    );
  }
}

class _StaticMap extends StatefulWidget {
  const _StaticMap({required this.outlines, required this.highlighted});

  final WorldOutlines outlines;
  final Set<String> highlighted;

  @override
  State<_StaticMap> createState() => _StaticMapState();
}

class _StaticMapState extends State<_StaticMap>
    with SingleTickerProviderStateMixin {
  late final MapCameraController _camera = MapCameraController(vsync: this);

  @override
  void dispose() {
    _camera.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => WorldMap(
    outlines: widget.outlines,
    controller: _camera,
    highlighted: widget.highlighted,
    interactive: false,
    showGraticule: false,
  );
}
