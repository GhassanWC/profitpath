import 'dart:math' as math;

import 'package:flutter/widgets.dart';

import '../../core/geo/projection.dart';
import '../../core/theme/wainzo_tokens.dart';

/// Where the map is looking.
///
/// Immutable, and expressed entirely in map space, so it does not care what
/// size it is being drawn at: the same camera frames the same part of the world
/// on a small phone and a large one.
@immutable
final class MapCamera {
  MapCamera({Offset? center, this.zoom = 1.0})
    : center = center ?? EqualEarth.mapCentre;

  /// The point of the world at the centre of the viewport, in map space.
  final Offset center;

  /// 1 fits the whole world. The ceiling exists because the outlines come from
  /// a 1:50m source — past it you are zooming into the simplification rather
  /// than into more detail.
  final double zoom;

  static const double minZoom = 1.0;
  static const double maxZoom = 9.0;

  /// Map units to pixels. One number, because map space is uniform.
  static double scaleFor(Size viewport, double zoom) =>
      math.min(viewport.width / EqualEarth.aspectRatio, viewport.height) * zoom;

  double scale(Size viewport) => scaleFor(viewport, zoom);

  Offset toCanvas(Offset mapPoint, Size viewport) {
    final double s = scale(viewport);
    return Offset(
      (mapPoint.dx - center.dx) * s + viewport.width / 2,
      (mapPoint.dy - center.dy) * s + viewport.height / 2,
    );
  }

  /// Canvas pixels back to map space. Used for hit-testing a tap.
  Offset toMap(Offset canvas, Size viewport) {
    final double s = scale(viewport);
    return Offset(
      (canvas.dx - viewport.width / 2) / s + center.dx,
      (canvas.dy - viewport.height / 2) / s + center.dy,
    );
  }

  MapCamera copyWith({Offset? center, double? zoom}) =>
      MapCamera(center: center ?? this.center, zoom: zoom ?? this.zoom);

  /// Keeps the world from being dragged off the screen.
  ///
  /// Once zoomed in, the visible window is clamped to the world's edges. While
  /// the world is smaller than the viewport on an axis, that axis stays
  /// centred — so panning at full-world zoom does nothing rather than sliding
  /// the planet into a corner.
  MapCamera clamped(Size viewport) {
    final double z = zoom.clamp(minZoom, maxZoom);
    final double s = scaleFor(viewport, z);
    final double halfW = viewport.width / 2 / s;
    final double halfH = viewport.height / 2 / s;
    final double width = EqualEarth.aspectRatio;

    final double x = halfW * 2 >= width
        ? width / 2
        : center.dx.clamp(halfW, width - halfW);
    final double y = halfH * 2 >= 1 ? 0.5 : center.dy.clamp(halfH, 1 - halfH);

    return MapCamera(center: Offset(x, y), zoom: z);
  }

  /// A camera that frames [bounds] with air around it.
  static MapCamera framing(Rect bounds, Size viewport, {double padding = 2.4}) {
    if (bounds.isEmpty || bounds.width <= 0 || bounds.height <= 0) {
      return MapCamera();
    }
    final double base = scaleFor(viewport, 1);
    final double byWidth = viewport.width / (bounds.width * base);
    final double byHeight = viewport.height / (bounds.height * base);
    final double zoom = (math.min(byWidth, byHeight) / padding).clamp(
      minZoom,
      maxZoom,
    );
    return MapCamera(center: bounds.center, zoom: zoom);
  }

  static MapCamera lerp(MapCamera a, MapCamera b, double t) => MapCamera(
    center: Offset.lerp(a.center, b.center, t)!,
    // Zoom is interpolated in log space. Linear interpolation makes a flight
    // from world view down to one country accelerate horribly at the end.
    zoom: math.exp(a.zoom.log + (b.zoom.log - a.zoom.log) * t),
  );

  @override
  bool operator ==(Object other) =>
      other is MapCamera && other.center == center && other.zoom == zoom;

  @override
  int get hashCode => Object.hash(center, zoom);
}

extension on double {
  double get log => math.log(this);
}

/// Drives the camera, including the flight when a country is chosen.
///
/// A [ChangeNotifier] rather than app state because it changes on every frame
/// of a pan and every frame of a flight; routing that through the app's state
/// management would rebuild half the screen sixty times a second.
final class MapCameraController extends ChangeNotifier {
  MapCameraController({MapCamera? initial, required TickerProvider vsync})
    : _camera = initial ?? MapCamera() {
    _animation = AnimationController(vsync: vsync, duration: Motion.flight)
      ..addListener(_onTick);
  }

  late final AnimationController _animation;
  MapCamera _camera;
  MapCamera? _from;
  MapCamera? _to;

  MapCamera get camera => _camera;

  bool get isFlying => _animation.isAnimating;

  set camera(MapCamera value) {
    if (value == _camera) return;
    _camera = value;
    notifyListeners();
  }

  /// A drag or a pinch. Stops any flight in progress — the finger wins.
  void nudge({Offset? center, double? zoom, required Size viewport}) {
    if (_animation.isAnimating) _animation.stop();
    camera = _camera.copyWith(center: center, zoom: zoom).clamped(viewport);
  }

  /// Flies to a target, easing out so it lands rather than stops.
  void flyTo(MapCamera target, {Size? viewport, Duration? duration}) {
    _from = _camera;
    _to = viewport == null ? target : target.clamped(viewport);
    _animation
      ..duration = duration ?? Motion.flight
      ..forward(from: 0);
  }

  void _onTick() {
    final MapCamera? from = _from;
    final MapCamera? to = _to;
    if (from == null || to == null) return;
    camera = MapCamera.lerp(
      from,
      to,
      Motion.emphasis.transform(_animation.value),
    );
  }

  @override
  void dispose() {
    _animation
      ..removeListener(_onTick)
      ..dispose();
    super.dispose();
  }
}
