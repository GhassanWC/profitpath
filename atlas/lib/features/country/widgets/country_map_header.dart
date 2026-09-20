import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/atlas_colors.dart';
import '../../../data/geo/world_outlines.dart';
import '../../../providers/app_providers.dart';
import '../../map/map_camera.dart';
import '../../map/widgets/world_map.dart';

/// The country, on the map, as the page's header.
///
/// Not decoration: it answers "where is this" for a reader who does not know,
/// which for a product about geography is the header's whole job. It is drawn
/// with the same painter as the explore map and is deliberately not
/// interactive, so it cannot steal the page's scroll.
class CountryMapHeader extends ConsumerStatefulWidget {
  const CountryMapHeader({required this.countryCode, super.key});

  final String countryCode;

  @override
  ConsumerState<CountryMapHeader> createState() => _CountryMapHeaderState();
}

class _CountryMapHeaderState extends ConsumerState<CountryMapHeader>
    with SingleTickerProviderStateMixin {
  late final MapCameraController _camera = MapCameraController(vsync: this);
  Size _framedFor = Size.zero;

  @override
  void dispose() {
    _camera.dispose();
    super.dispose();
  }

  void _frame(Size size, WorldOutlines outlines) {
    if (size == _framedFor || size.isEmpty) return;
    final CountryOutline? outline = outlines[widget.countryCode];
    if (outline == null) return;
    _framedFor = size;
    // Set rather than fly: the page is arriving, so there is nothing to
    // animate from.
    _camera.camera = MapCamera.framing(
      outline.bounds,
      size,
      padding: 1.7,
    ).clamped(size);
  }

  @override
  Widget build(BuildContext context) {
    final WorldOutlines? outlines = ref.watch(worldOutlinesProvider).value;
    if (outlines == null) {
      return const ColoredBox(color: AtlasColors.ocean);
    }

    return LayoutBuilder(
      builder: (BuildContext context, BoxConstraints constraints) {
        _frame(constraints.biggest, outlines);
        return WorldMap(
          outlines: outlines,
          controller: _camera,
          selected: widget.countryCode,
          interactive: false,
          showMarkers: false,
        );
      },
    );
  }
}
