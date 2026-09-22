import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/services.dart' show AssetBundle, rootBundle;

import '../../core/geo/projection.dart';

/// One country's shape, in map space (see [EqualEarth]).
final class CountryOutline {
  CountryOutline._(this.code, this.rings, this.bounds, this.centroid);

  /// ISO 3166-1 alpha-2.
  final String code;

  /// Projected rings. Held as flat x,y pairs rather than `List<Offset>` because
  /// there are ~27k points and allocating an object per point costs more than
  /// the drawing does.
  final List<Float32List> rings;

  /// Map-space bounding box, used to frame the country when the map flies to it.
  final ui.Rect bounds;

  /// Area-weighted centre of the largest ring — where a marker or a label sits.
  final ui.Offset centroid;

  ui.Path? _path;

  /// The filled shape, built once and reused for painting *and* hit-testing, so
  /// what you can tap is exactly what you can see.
  ui.Path get path {
    final ui.Path? cached = _path;
    if (cached != null) return cached;
    final ui.Path path = ui.Path()..fillType = ui.PathFillType.nonZero;
    for (final Float32List ring in rings) {
      if (ring.length < 6) continue;
      path.moveTo(ring[0], ring[1]);
      for (int i = 2; i < ring.length; i += 2) {
        path.lineTo(ring[i], ring[i + 1]);
      }
      path.close();
    }
    return _path = path;
  }

  bool contains(ui.Offset mapPoint) =>
      bounds.contains(mapPoint) && path.contains(mapPoint);
}

/// The country outlines that make up the map.
///
/// Loaded from `assets/data/world_outlines.bin`, a packed format generated from
/// Natural Earth 1:50m (via world-atlas) by `tool/build_map_assets.py`. It is a
/// purpose-built binary rather than GeoJSON because the app has to parse it on
/// a cold start: 111 KB and one pass over a byte buffer, against roughly 3 MB
/// of JSON and an object per coordinate.
///
/// Layout, little-endian:
///
/// ```text
/// magic      8 bytes   'WAINZOM1'
/// count      uint16    number of countries
/// per country:
///   code     2 bytes   ISO 3166-1 alpha-2, ASCII
///   rings    uint16
///   per ring:
///     points uint16
///     coords points x (int16 lon, int16 lat), degrees x 100
/// ```
final class WorldOutlines {
  WorldOutlines._(this.byCode);

  final Map<String, CountryOutline> byCode;

  static const String assetPath = 'assets/data/world_outlines.bin';
  static const String _magic = 'WAINZOM1';

  static WorldOutlines? _cached;

  /// Parses the packed asset. Cached, because the map, the profile reach map
  /// and the country picker all want the same shapes.
  static Future<WorldOutlines> load({AssetBundle? bundle}) async {
    final WorldOutlines? cached = _cached;
    if (cached != null) return cached;
    final ByteData data = await (bundle ?? rootBundle).load(assetPath);
    return _cached = parse(data);
  }

  /// Visible for testing, and for anyone swapping in a different resolution.
  static WorldOutlines parse(ByteData data) {
    for (int i = 0; i < _magic.length; i++) {
      if (data.getUint8(i) != _magic.codeUnitAt(i)) {
        throw const FormatException('Not an Wainzo map asset');
      }
    }

    int offset = _magic.length;
    final int countryCount = data.getUint16(offset, Endian.little);
    offset += 2;

    final Map<String, CountryOutline> byCode = <String, CountryOutline>{};
    for (int c = 0; c < countryCount; c++) {
      final String code = String.fromCharCodes(<int>[
        data.getUint8(offset),
        data.getUint8(offset + 1),
      ]);
      offset += 2;
      final int ringCount = data.getUint16(offset, Endian.little);
      offset += 2;

      final List<Float32List> rings = <Float32List>[];
      double minX = double.infinity, minY = double.infinity;
      double maxX = double.negativeInfinity, maxY = double.negativeInfinity;
      double bestArea = -1;
      ui.Offset centroid = ui.Offset.zero;

      for (int r = 0; r < ringCount; r++) {
        final int pointCount = data.getUint16(offset, Endian.little);
        offset += 2;
        final Float32List ring = Float32List(pointCount * 2);
        double sumX = 0, sumY = 0;
        for (int p = 0; p < pointCount; p++) {
          final double lon = data.getInt16(offset, Endian.little) / 100;
          final double lat = data.getInt16(offset + 2, Endian.little) / 100;
          offset += 4;
          final ui.Offset point = EqualEarth.project(lon, lat);
          ring[p * 2] = point.dx;
          ring[p * 2 + 1] = point.dy;
          sumX += point.dx;
          sumY += point.dy;
          if (point.dx < minX) minX = point.dx;
          if (point.dx > maxX) maxX = point.dx;
          if (point.dy < minY) minY = point.dy;
          if (point.dy > maxY) maxY = point.dy;
        }
        rings.add(ring);

        final double area = _ringArea(ring);
        if (area > bestArea) {
          bestArea = area;
          centroid = ui.Offset(sumX / pointCount, sumY / pointCount);
        }
      }

      if (rings.isEmpty) continue;
      byCode[code] = CountryOutline._(
        code,
        rings,
        ui.Rect.fromLTRB(minX, minY, maxX, maxY),
        centroid,
      );
    }

    return WorldOutlines._(Map<String, CountryOutline>.unmodifiable(byCode));
  }

  CountryOutline? operator [](String code) => byCode[code.toUpperCase()];

  Iterable<CountryOutline> get all => byCode.values;

  /// The country under a map-space point, or null for open water.
  ///
  /// Walks smallest-first so a country sitting inside another's bounding box —
  /// Lesotho, Vatican City, San Marino — wins the tap it deserves.
  String? countryAt(ui.Offset mapPoint) {
    CountryOutline? best;
    double bestArea = double.infinity;
    for (final CountryOutline outline in byCode.values) {
      if (!outline.bounds.contains(mapPoint)) continue;
      final double area = outline.bounds.width * outline.bounds.height;
      if (area < bestArea && outline.path.contains(mapPoint)) {
        best = outline;
        bestArea = area;
      }
    }
    return best?.code;
  }

  static double _ringArea(Float32List ring) {
    double area = 0;
    final int n = ring.length ~/ 2;
    for (int i = 0; i < n; i++) {
      final int j = (i + 1) % n;
      area += ring[i * 2] * ring[j * 2 + 1] - ring[j * 2] * ring[i * 2 + 1];
    }
    return area.abs() / 2;
  }
}
