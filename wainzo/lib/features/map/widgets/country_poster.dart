import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/material.dart';

import '../../../core/theme/wainzo_colors.dart';
import '../../../data/geo/world_outlines.dart';

/// Cover art for a post, drawn from the country it came from.
///
/// Why this exists: a preview-led feed still has to *look* like something, and
/// a grey box with a play triangle is the fastest way to make a product feel
/// unfinished. Rather than ship stock photography the app has no rights to, or
/// a gradient that says nothing, each post's cover is its own country's
/// coastline drawn as contour rings. It is unique per country, free, weightless,
/// resolution-independent, and it says the one thing the product is about.
///
/// A post with real media draws the media instead; this is what stands behind
/// it while it loads, and what a text post gets.
class CountryPoster extends StatelessWidget {
  const CountryPoster({
    required this.countryCode,
    required this.outlines,
    super.key,
    this.tint,
    this.seed = 0,
    this.dim = false,
  });

  final String countryCode;

  /// Null until the map asset has loaded; the painter degrades to its ground.
  final WorldOutlines? outlines;

  /// Usually the post's category swatch, at low weight.
  final Color? tint;

  /// Varies the composition between posts from the same country.
  final int seed;

  /// True behind text and controls, where the art must not compete.
  final bool dim;

  @override
  Widget build(BuildContext context) => RepaintBoundary(
    child: CustomPaint(
      painter: _CountryPosterPainter(
        outline: outlines?[countryCode],
        tint: tint ?? WainzoColors.accent,
        seed: seed == 0 ? countryCode.hashCode : seed,
        dim: dim,
      ),
      size: Size.infinite,
    ),
  );
}

class _CountryPosterPainter extends CustomPainter {
  const _CountryPosterPainter({
    required this.outline,
    required this.tint,
    required this.seed,
    required this.dim,
  });

  final CountryOutline? outline;
  final Color tint;
  final int seed;
  final bool dim;

  @override
  void paint(Canvas canvas, Size size) {
    final double alpha = dim ? 0.45 : 1.0;

    canvas.drawRect(
      Offset.zero & size,
      Paint()
        ..shader = ui.Gradient.linear(
          Offset(size.width * 0.1, 0),
          Offset(size.width * 0.9, size.height),
          <Color>[
            Color.lerp(WainzoColors.ocean, tint, 0.06)!,
            WainzoColors.ground,
          ],
        ),
    );

    _paintRule(canvas, size, alpha);

    final CountryOutline? shape = outline;
    if (shape == null) return;

    // Fit the country into the frame with room for the rings to breathe.
    final Rect bounds = shape.bounds;
    final double fit = math.min(
      size.width * 0.62 / bounds.width,
      size.height * 0.52 / bounds.height,
    );
    // The composition is offset from centre, and the direction alternates by
    // seed, so a column of posters does not read as a grid of centred blobs.
    final Offset drift = Offset(
      (seed.isEven ? -1 : 1) * size.width * 0.06,
      size.height * (seed % 3 == 0 ? -0.04 : 0.05),
    );
    final Offset centre = size.center(drift);

    canvas.save();
    canvas.translate(centre.dx, centre.dy);
    canvas.scale(fit);
    canvas.translate(-bounds.center.dx, -bounds.center.dy);

    final Path path = shape.path;
    final double hairline = 1 / fit;

    // Contour rings: the same coastline, scaled out from its own centre, each
    // ring fainter than the last.
    for (int ring = 5; ring >= 1; ring--) {
      final double factor = 1 + ring * 0.115;
      canvas.save();
      canvas.translate(bounds.center.dx, bounds.center.dy);
      canvas.scale(factor);
      canvas.translate(-bounds.center.dx, -bounds.center.dy);
      canvas.drawPath(
        path,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = hairline * 1.1 / factor
          ..color = tint.withValues(alpha: (0.30 - ring * 0.05) * alpha),
      );
      canvas.restore();
    }

    canvas.drawPath(
      path,
      Paint()
        ..color = Color.lerp(
          WainzoColors.land,
          tint,
          0.18,
        )!.withValues(alpha: alpha),
    );
    canvas.drawPath(
      path,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = hairline * 1.4
        ..color = tint.withValues(alpha: 0.85 * alpha),
    );

    canvas.restore();
  }

  /// A few quiet horizontal rules, like a chart's grid seen through the art.
  void _paintRule(Canvas canvas, Size size, double alpha) {
    final Paint paint = Paint()
      ..color = WainzoColors.graticule.withValues(alpha: 0.06 * alpha)
      ..strokeWidth = 1;
    for (int i = 1; i < 8; i++) {
      final double y = size.height * i / 8;
      canvas.drawLine(Offset(0, y), Offset(size.width, y), paint);
    }
  }

  @override
  bool shouldRepaint(_CountryPosterPainter old) =>
      old.outline != outline ||
      old.tint != tint ||
      old.seed != seed ||
      old.dim != dim;
}
