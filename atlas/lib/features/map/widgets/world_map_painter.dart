import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/material.dart';

import '../../../core/geo/projection.dart';
import '../../../core/theme/atlas_colors.dart';
import '../../../core/theme/atlas_typography.dart';
import '../../../data/geo/world_outlines.dart';
import '../map_camera.dart';

/// Draws the world.
///
/// Everything here is vector, from a 111 KB asset: no tile server, no API key,
/// no network, and no third-party map SDK whose styling the product would have
/// to negotiate with. That is what makes the map ownable — it is lit the way
/// the rest of the app is lit, and a country can glow because it has content
/// in it rather than because a tile provider allows an overlay.
class WorldMapPainter extends CustomPainter {
  WorldMapPainter({
    required this.outlines,
    required this.camera,
    required this.activity,
    required this.maxActivity,
    required this.pulse,
    this.selected,
    this.highlighted = const <String>{},
    this.labelFor,
    this.showGraticule = true,
    this.showMarkers = true,
  });

  final WorldOutlines outlines;
  final MapCamera camera;

  /// Posts available per country. Drives how lit a country is.
  final Map<String, int> activity;
  final int maxActivity;

  /// 0..1, repeating. Animates the selected country's ring.
  final double pulse;

  final String? selected;

  /// Countries to mark regardless of activity — a creator's reach, for example.
  final Set<String> highlighted;

  final String Function(String code)? labelFor;
  final bool showGraticule;
  final bool showMarkers;

  static final Map<String, TextPainter> _labelCache = <String, TextPainter>{};

  @override
  void paint(Canvas canvas, Size size) {
    final double scale = camera.scale(size);
    final Offset origin = camera.toCanvas(Offset.zero, size);

    canvas.save();
    canvas.clipRect(Offset.zero & size);

    _paintOcean(canvas, size);

    canvas.save();
    canvas.translate(origin.dx, origin.dy);
    canvas.scale(scale);

    // Stroke widths are divided by the scale so a hairline stays a hairline at
    // every zoom, instead of thickening into a cartoon outline.
    final double hairline = 1 / scale;

    if (showGraticule) _paintGraticule(canvas, hairline);
    _paintLand(canvas, size, scale, hairline);

    canvas.restore();

    if (showMarkers) _paintMarkers(canvas, size, scale);
    _paintLabels(canvas, size, scale);

    canvas.restore();
  }

  void _paintOcean(Canvas canvas, Size size) {
    canvas.drawRect(Offset.zero & size, Paint()..color = AtlasColors.ocean);
    // A very quiet vignette, so the edges of the viewport fall away and the
    // middle of the map is where the eye lands.
    canvas.drawRect(
      Offset.zero & size,
      Paint()
        ..shader = ui.Gradient.radial(
          size.center(Offset.zero),
          size.longestSide * 0.62,
          <Color>[const Color(0x00000000), const Color(0x59000000)],
          <double>[0.55, 1.0],
        ),
    );
  }

  void _paintGraticule(Canvas canvas, double hairline) {
    final Paint paint = Paint()
      ..color = AtlasColors.graticule
      ..strokeWidth = hairline
      ..style = PaintingStyle.stroke;

    for (double lon = -180; lon <= 180; lon += 30) {
      final Path path = Path();
      for (double lat = -90; lat <= 90; lat += 5) {
        final Offset p = EqualEarth.project(lon, lat);
        lat == -90 ? path.moveTo(p.dx, p.dy) : path.lineTo(p.dx, p.dy);
      }
      canvas.drawPath(path, paint);
    }
    for (double lat = -60; lat <= 60; lat += 30) {
      final Path path = Path();
      for (double lon = -180; lon <= 180; lon += 5) {
        final Offset p = EqualEarth.project(lon, lat);
        lon == -180 ? path.moveTo(p.dx, p.dy) : path.lineTo(p.dx, p.dy);
      }
      canvas.drawPath(path, paint);
    }
  }

  void _paintLand(Canvas canvas, Size size, double scale, double hairline) {
    final Paint fill = Paint()..style = PaintingStyle.fill;
    final Paint stroke = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = hairline * 0.9
      ..color = AtlasColors.landStroke;

    // Only what is on screen. At high zoom this is most of the drawing saved.
    final Rect visible = Rect.fromPoints(
      camera.toMap(Offset.zero, size),
      camera.toMap(Offset(size.width, size.height), size),
    ).inflate(0.02);

    Path? selectedPath;

    for (final CountryOutline outline in outlines.all) {
      if (!outline.bounds.overlaps(visible)) continue;

      final int count = activity[outline.code] ?? 0;
      final bool isSelected = outline.code == selected;
      final bool isHighlighted = highlighted.contains(outline.code);

      if (isSelected) {
        selectedPath = outline.path;
        continue; // drawn last, on top of its neighbours
      }

      fill.color = isHighlighted
          ? Color.lerp(AtlasColors.land, AtlasColors.accent, 0.55)!
          : _activityColour(count);
      canvas.drawPath(outline.path, fill);
      canvas.drawPath(outline.path, stroke);
    }

    if (selectedPath != null) {
      // The glow is a wide, blurred stroke under the shape — cheaper and
      // steadier than a shadow, and it keeps the country legible against the
      // ocean while it is lit.
      canvas.drawPath(
        selectedPath,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = hairline * (10 + 6 * pulse)
          ..color = AtlasColors.accent.withValues(
            alpha: 0.10 + 0.10 * (1 - pulse),
          )
          ..maskFilter = MaskFilter.blur(BlurStyle.normal, hairline * 8),
      );
      canvas.drawPath(selectedPath, Paint()..color = AtlasColors.accent);
      canvas.drawPath(
        selectedPath,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = hairline * 1.6
          ..color = AtlasColors.accent,
      );
    }
  }

  /// How lit a country is. Logarithmic, because a country with ten times the
  /// posts is not ten times more interesting and should not be ten times
  /// brighter — the map is a map, not a bar chart.
  Color _activityColour(int count) {
    if (count <= 0 || maxActivity <= 0) return AtlasColors.land;
    final double t = math.log(count + 1) / math.log(maxActivity + 1);
    return Color.lerp(
      AtlasColors.land,
      AtlasColors.landActive,
      t.clamp(0.0, 1.0),
    )!;
  }

  void _paintMarkers(Canvas canvas, Size size, double scale) {
    final Paint dot = Paint()..color = AtlasColors.accent;
    final Paint halo = Paint()
      ..color = AtlasColors.accent.withValues(alpha: 0.16)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 5);

    // A highlighted country is usually a small one seen at world zoom — a tint
    // alone is not enough to find it, which defeats the point of a reach map.
    for (final String code in highlighted) {
      final CountryOutline? outline = outlines[code];
      if (outline == null) continue;
      final Offset centre = camera.toCanvas(outline.centroid, size);
      if (!size.contains(centre)) continue;
      canvas.drawCircle(centre, 9, halo);
      canvas.drawCircle(centre, 3, dot);
    }

    if (activity.isEmpty || maxActivity <= 0) return;

    for (final MapEntry<String, int> entry in activity.entries) {
      final CountryOutline? outline = outlines[entry.key];
      if (outline == null || entry.key == selected) continue;

      final double t = math.log(entry.value + 1) / math.log(maxActivity + 1);
      if (t < 0.34) continue; // below this a marker is clutter, not information

      final Offset centre = camera.toCanvas(outline.centroid, size);
      if (!size.contains(centre)) continue;

      final double radius = 1.6 + t * 2.8;
      canvas.drawCircle(centre, radius * 3.2, halo);
      canvas.drawCircle(centre, radius, dot);
    }
  }

  void _paintLabels(Canvas canvas, Size size, double scale) {
    final String Function(String)? resolve = labelFor;
    if (resolve == null) return;

    for (final CountryOutline outline in outlines.all) {
      final bool isSelected = outline.code == selected;
      // A label only earns its place once the country is big enough on screen
      // to hold one, or when it is the country being looked at.
      final double onScreenWidth = outline.bounds.width * scale;
      if (!isSelected && onScreenWidth < 96) continue;
      if (!isSelected && (activity[outline.code] ?? 0) == 0) continue;

      // The average of a ring's points can fall outside a concave country —
      // a label floating in the sea next to Norway reads as a bug. Prefer the
      // bounding box's centre when the shape actually contains it.
      final Offset anchor = outline.path.contains(outline.bounds.center)
          ? outline.bounds.center
          : outline.centroid;
      final Offset centre = camera.toCanvas(anchor, size);
      final TextPainter painter = _label(resolve(outline.code), isSelected);
      final Offset topLeft =
          centre -
          Offset(painter.width / 2, painter.height / 2 + (isSelected ? 14 : 0));

      // Whole label or none: one clipped by the edge of the viewport reads as
      // a rendering fault rather than as a label.
      final Rect viewport = Offset.zero & size;
      final Rect box = topLeft & Size(painter.width, painter.height);
      if (!viewport.contains(box.topLeft) ||
          !viewport.contains(box.bottomRight)) {
        continue;
      }

      painter.paint(canvas, topLeft);
    }
  }

  TextPainter _label(String text, bool emphasised) {
    final String key = '${emphasised ? 'e' : 'n'}:$text';
    final TextPainter? cached = _labelCache[key];
    if (cached != null) return cached;

    final TextPainter painter = TextPainter(
      text: TextSpan(
        text: text,
        style:
            (emphasised ? AtlasTypography.titleSmall : AtlasTypography.overline)
                .copyWith(
                  color: emphasised ? AtlasColors.ink : AtlasColors.inkMuted,
                  shadows: const <Shadow>[
                    Shadow(color: AtlasColors.ocean, blurRadius: 6),
                    Shadow(color: AtlasColors.ocean, blurRadius: 2),
                  ],
                ),
      ),
      textDirection: TextDirection.ltr,
    )..layout();

    // Bounded so a long session cannot grow this without limit.
    if (_labelCache.length > 400) _labelCache.clear();
    return _labelCache[key] = painter;
  }

  @override
  bool shouldRepaint(WorldMapPainter old) =>
      old.camera != camera ||
      old.selected != selected ||
      old.pulse != pulse ||
      old.activity.length != activity.length ||
      old.highlighted.length != highlighted.length ||
      !identical(old.outlines, outlines);
}
