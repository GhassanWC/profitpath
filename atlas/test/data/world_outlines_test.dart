import 'package:atlas/core/geo/projection.dart';
import 'package:atlas/data/geo/country_registry.dart';
import 'package:atlas/data/geo/world_outlines.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

/// Tests against the real bundled assets, not a fixture: the asset and the
/// parser are generated and written separately, and this is the seam where a
/// mismatch between them would otherwise only show up as a blank map.
void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late WorldOutlines outlines;
  late CountryRegistry registry;

  setUpAll(() async {
    final ByteData data = await rootBundle.load(WorldOutlines.assetPath);
    outlines = WorldOutlines.parse(data);
    registry = CountryRegistry.parse(
      await rootBundle.loadString(CountryRegistry.assetPath),
    );
  });

  test('the packed asset parses and carries the world', () {
    expect(outlines.byCode.length, greaterThan(200));
    for (final String code in <String>[
      'OM',
      'JP',
      'GB',
      'US',
      'BR',
      'IN',
      'KE',
      'AU',
    ]) {
      expect(outlines[code], isNotNull, reason: '$code should have an outline');
    }
  });

  test('refuses something that is not an Atlas map asset', () {
    expect(
      () => WorldOutlines.parse(
        ByteData.view(Uint8List.fromList(List<int>.filled(64, 0)).buffer),
      ),
      throwsA(isA<FormatException>()),
    );
  });

  test('outlines sit inside map space', () {
    for (final CountryOutline outline in outlines.all) {
      expect(outline.bounds.left, greaterThanOrEqualTo(-0.001));
      expect(
        outline.bounds.right,
        lessThanOrEqualTo(EqualEarth.aspectRatio + 0.001),
      );
      expect(outline.bounds.top, greaterThanOrEqualTo(-0.001));
      expect(outline.bounds.bottom, lessThanOrEqualTo(1.001));
    }
  });

  group('hit-testing finds the country a tap actually landed on', () {
    test('a point inside a country resolves to that country', () {
      // Muscat, Tokyo, Nairobi, Sao Paulo.
      const Map<String, (double, double)> places = <String, (double, double)>{
        'OM': (58.5, 23.6),
        'JP': (139.7, 35.7),
        'KE': (36.8, -1.3),
        'BR': (-46.6, -23.5),
        'FR': (2.35, 48.85),
      };
      places.forEach((String code, (double, double) lonLat) {
        final String? found = outlines.countryAt(
          EqualEarth.project(lonLat.$1, lonLat.$2),
        );
        expect(found, code, reason: 'a tap on ${registry.resolve(code).name}');
      });
    });

    test('a point in open water resolves to nothing', () {
      // Middle of the South Pacific.
      expect(outlines.countryAt(EqualEarth.project(-140, -35)), isNull);
    });

    test('a small country inside another country wins its own tap', () {
      // Lesotho sits entirely inside South Africa's bounding box.
      final String? found = outlines.countryAt(EqualEarth.project(28.2, -29.5));
      expect(found, 'LS');
    });
  });

  test('every country with an outline is in the registry', () {
    for (final CountryOutline outline in outlines.all) {
      expect(
        registry[outline.code],
        isNotNull,
        reason: '${outline.code} is drawn but cannot be named',
      );
    }
  });
}
