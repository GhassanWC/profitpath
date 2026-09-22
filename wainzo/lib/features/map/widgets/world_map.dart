import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../core/theme/wainzo_tokens.dart';
import '../../../data/geo/world_outlines.dart';
import '../map_camera.dart';
import 'world_map_painter.dart';

/// The interactive world map.
///
/// Pan and pinch are handled together by one scale gesture, with the focal
/// point anchored so the world does not slide out from under the fingers. A tap
/// hit-tests against the same paths that are drawn, so what looks tappable is
/// tappable — including countries small enough to sit inside another's bounding
/// box.
class WorldMap extends StatefulWidget {
  const WorldMap({
    required this.outlines,
    required this.controller,
    super.key,
    this.activity = const <String, int>{},
    this.selected,
    this.highlighted = const <String>{},
    this.onSelected,
    this.labelFor,
    this.interactive = true,
    this.showGraticule = true,
    this.showMarkers = true,
  });

  final WorldOutlines outlines;
  final MapCameraController controller;

  /// Posts per country. An empty map draws a world with nothing happening in
  /// it, which is the honest thing to draw before the data arrives.
  final Map<String, int> activity;

  final String? selected;
  final Set<String> highlighted;

  /// Fires with a country code, or null when open water is tapped.
  final ValueChanged<String?>? onSelected;

  final String Function(String code)? labelFor;

  /// False for the decorative maps — the profile's reach map, for instance,
  /// which should not steal a scroll gesture.
  final bool interactive;

  final bool showGraticule;
  final bool showMarkers;

  @override
  State<WorldMap> createState() => _WorldMapState();
}

class _WorldMapState extends State<WorldMap>
    with SingleTickerProviderStateMixin {
  // Only runs while a country is lit. An idle map is a still image, which
  // keeps the phone cool and stops the whole screen repainting sixty times a
  // second for nothing.
  late final AnimationController _pulse = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 2400),
  );

  void _syncPulse() {
    final bool shouldRun = widget.selected != null;
    if (shouldRun && !_pulse.isAnimating) {
      _pulse.repeat(reverse: true);
    } else if (!shouldRun && _pulse.isAnimating) {
      _pulse
        ..stop()
        ..value = 0;
    }
  }

  @override
  void initState() {
    super.initState();
    _syncPulse();
  }

  @override
  void didUpdateWidget(WorldMap oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.selected != widget.selected) _syncPulse();
  }

  MapCamera _gestureStart = MapCamera();
  Offset _gestureFocal = Offset.zero;
  Size _size = Size.zero;

  @override
  void dispose() {
    _pulse.dispose();
    super.dispose();
  }

  void _onScaleStart(ScaleStartDetails details) {
    _gestureStart = widget.controller.camera;
    _gestureFocal = details.localFocalPoint;
  }

  void _onScaleUpdate(ScaleUpdateDetails details) {
    if (_size.isEmpty) return;
    final double zoom = (_gestureStart.zoom * details.scale).clamp(
      MapCamera.minZoom,
      MapCamera.maxZoom,
    );

    // Keep the point the fingers started on underneath the fingers.
    final Offset anchor = _gestureStart.toMap(_gestureFocal, _size);
    final double scale = MapCamera.scaleFor(_size, zoom);
    final Offset centre =
        anchor -
        Offset(
          (details.localFocalPoint.dx - _size.width / 2) / scale,
          (details.localFocalPoint.dy - _size.height / 2) / scale,
        );

    widget.controller.nudge(center: centre, zoom: zoom, viewport: _size);
  }

  void _onTapUp(TapUpDetails details) {
    if (_size.isEmpty) return;
    final Offset point = widget.controller.camera.toMap(
      details.localPosition,
      _size,
    );
    final String? code = widget.outlines.countryAt(point);
    if (code != null) HapticFeedback.selectionClick();
    widget.onSelected?.call(code);
  }

  @override
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (BuildContext context, BoxConstraints constraints) {
      _size = constraints.biggest;
      final int maxActivity = widget.activity.isEmpty
          ? 0
          : widget.activity.values.reduce((int a, int b) => a > b ? a : b);

      final Widget map = AnimatedBuilder(
        animation: Listenable.merge(<Listenable>[widget.controller, _pulse]),
        builder: (BuildContext context, _) => CustomPaint(
          size: constraints.biggest,
          isComplex: true,
          willChange: true,
          painter: WorldMapPainter(
            outlines: widget.outlines,
            camera: widget.controller.camera,
            activity: widget.activity,
            maxActivity: maxActivity,
            pulse: Motion.enter.transform(_pulse.value),
            selected: widget.selected,
            highlighted: widget.highlighted,
            labelFor: widget.labelFor,
            showGraticule: widget.showGraticule,
            showMarkers: widget.showMarkers,
          ),
        ),
      );

      if (!widget.interactive) return map;

      return Semantics(
        label: 'World map. Double tap a country to see its content.',
        child: GestureDetector(
          behavior: HitTestBehavior.opaque,
          onScaleStart: _onScaleStart,
          onScaleUpdate: _onScaleUpdate,
          onTapUp: _onTapUp,
          child: map,
        ),
      );
    },
  );
}
