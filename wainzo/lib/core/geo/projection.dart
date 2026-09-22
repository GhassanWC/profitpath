import 'dart:math' as math;
import 'dart:ui' show Offset;

/// The Equal Earth pseudocylindrical projection (Šavrič, Patterson & Jenny, 2018).
///
/// Chosen over Mercator on purpose. Mercator would make Greenland the largest
/// thing on a map whose entire point is "content from here, aimed there" —
/// inflating the north and shrinking most of the countries people in this app
/// are actually posting from and to. Equal Earth keeps areas true, and unlike
/// Mollweide or Sinusoidal it keeps continents looking like themselves.
///
/// Projects into **map space**: y runs 0..1 top to bottom, and x runs
/// 0..[aspectRatio] left to right. One unit is the same distance on both axes,
/// which is what lets the map be drawn with a single uniform scale — so a
/// hairline border is the same weight running east-west as north-south, at any
/// zoom. Everything downstream — painting, hit-testing, the camera — works in
/// map space and multiplies by whatever size it is drawing at, so nothing is
/// tied to a screen size.
abstract final class EqualEarth {
  static const double _a1 = 1.340264;
  static const double _a2 = -0.081106;
  static const double _a3 = 0.000893;
  static const double _a4 = 0.003796;
  static final double _m = math.sqrt(3) / 2;

  /// Half-width and half-height of the projected world, in projection units.
  static final double _halfWidth = math.pi / (_m * _a1);
  static final double _halfHeight = _projectY(math.pi / 2);

  /// Width / height of the whole map, and therefore the right edge of map
  /// space. Every map surface uses this so the world never stretches.
  static final double aspectRatio = _halfWidth / _halfHeight;

  /// The centre of the world in map space.
  static final Offset mapCentre = Offset(aspectRatio / 2, 0.5);

  static double _projectY(double phi) {
    final double theta = math.asin(_m * math.sin(phi));
    final double t2 = theta * theta;
    final double t6 = t2 * t2 * t2;
    return theta * (_a1 + _a2 * t2 + t6 * (_a3 + _a4 * t2));
  }

  /// Longitude/latitude in degrees to map space.
  static Offset project(double lonDeg, double latDeg) {
    final double lambda = lonDeg * math.pi / 180;
    final double phi = (latDeg.clamp(-90.0, 90.0)) * math.pi / 180;

    final double theta = math.asin(_m * math.sin(phi));
    final double t2 = theta * theta;
    final double t6 = t2 * t2 * t2;

    final double x =
        lambda *
        math.cos(theta) /
        (_m * (_a1 + 3 * _a2 * t2 + t6 * (7 * _a3 + 9 * _a4 * t2)));
    final double y = theta * (_a1 + _a2 * t2 + t6 * (_a3 + _a4 * t2));

    return Offset(
      (x + _halfWidth) / (2 * _halfHeight),
      (_halfHeight - y) / (2 * _halfHeight),
    );
  }

  /// Map space back to longitude/latitude in degrees.
  ///
  /// The projection has no closed-form inverse for latitude, so this Newton-
  /// iterates on theta. Six rounds is well past convergence at any zoom a phone
  /// can show; it is only used for reporting where a tap landed, never per
  /// frame.
  static ({double lon, double lat}) unproject(Offset mapPoint) {
    final double y = _halfHeight - mapPoint.dy * 2 * _halfHeight;
    final double x = mapPoint.dx * 2 * _halfHeight - _halfWidth;

    double theta = y;
    for (int i = 0; i < 6; i++) {
      final double t2 = theta * theta;
      final double t6 = t2 * t2 * t2;
      final double fy = theta * (_a1 + _a2 * t2 + t6 * (_a3 + _a4 * t2)) - y;
      final double dy = _a1 + 3 * _a2 * t2 + t6 * (7 * _a3 + 9 * _a4 * t2);
      if (dy.abs() < 1e-12) break;
      theta -= fy / dy;
    }

    final double t2 = theta * theta;
    final double t6 = t2 * t2 * t2;
    final double sinTheta = math.sin(theta).clamp(-1.0, 1.0);
    final double phi = math.asin((sinTheta / _m).clamp(-1.0, 1.0));
    final double lambda =
        x *
        _m *
        (_a1 + 3 * _a2 * t2 + t6 * (7 * _a3 + 9 * _a4 * t2)) /
        math.cos(theta);

    return (lon: lambda * 180 / math.pi, lat: phi * 180 / math.pi);
  }
}
