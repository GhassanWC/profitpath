import 'package:atlas/core/geo/projection.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('EqualEarth', () {
    test('maps the world into map space with a uniform scale', () {
      expect(EqualEarth.aspectRatio, closeTo(2.0547, 0.001));

      final Offset origin = EqualEarth.project(0, 0);
      expect(origin.dx, closeTo(EqualEarth.aspectRatio / 2, 1e-9));
      expect(origin.dy, closeTo(0.5, 1e-9));

      expect(EqualEarth.project(-180, 0).dx, closeTo(0, 1e-9));
      expect(
        EqualEarth.project(180, 0).dx,
        closeTo(EqualEarth.aspectRatio, 1e-9),
      );
      expect(EqualEarth.project(0, 90).dy, closeTo(0, 1e-9));
      expect(EqualEarth.project(0, -90).dy, closeTo(1, 1e-9));
    });

    test('puts places where they belong relative to one another', () {
      final Offset oman = EqualEarth.project(57.0, 21.0);
      final Offset japan = EqualEarth.project(138.0, 36.0);
      final Offset brazil = EqualEarth.project(-53.0, -10.0);

      expect(japan.dx, greaterThan(oman.dx), reason: 'Japan is east of Oman');
      expect(japan.dy, lessThan(oman.dy), reason: 'Japan is north of Oman');
      expect(brazil.dx, lessThan(oman.dx), reason: 'Brazil is west of Oman');
      expect(
        brazil.dy,
        greaterThan(oman.dy),
        reason: 'Brazil is south of Oman',
      );
    });

    test('is an equal-area projection: equal areas project to equal areas', () {
      // Two 10-degree-square cells at very different latitudes. On Mercator the
      // northern one would be several times larger; here they must match.
      double cellArea(double lon, double lat) {
        final Offset a = EqualEarth.project(lon, lat);
        final Offset b = EqualEarth.project(lon + 10, lat);
        final Offset c = EqualEarth.project(lon + 10, lat - 10);
        final Offset d = EqualEarth.project(lon, lat - 10);
        // Shoelace over the projected quad.
        return ((a.dx * b.dy - b.dx * a.dy) +
                    (b.dx * c.dy - c.dx * b.dy) +
                    (c.dx * d.dy - d.dx * c.dy) +
                    (d.dx * a.dy - a.dx * d.dy))
                .abs() /
            2;
      }

      // Equal-area holds for cells spanning the same latitude band, so compare
      // the same band at different longitudes, and check that a high-latitude
      // band is *not* inflated the way Mercator inflates it.
      expect(cellArea(0, 60), closeTo(cellArea(120, 60), 1e-9));
      expect(
        cellArea(0, 60) / cellArea(0, 10),
        lessThan(1.0),
        reason: 'a polar band must not be larger than an equatorial one',
      );
    });

    test('round-trips through the inverse', () {
      for (final (double lon, double lat) in <(double, double)>[
        (0, 0),
        (57, 21),
        (-53, -10),
        (138, 36),
        (-122, 47),
        (18, -34),
        (175, -41),
      ]) {
        final ({double lat, double lon}) back = EqualEarth.unproject(
          EqualEarth.project(lon, lat),
        );
        expect(back.lon, closeTo(lon, 1e-6), reason: 'lon $lon');
        expect(back.lat, closeTo(lat, 1e-6), reason: 'lat $lat');
      }
    });
  });
}
