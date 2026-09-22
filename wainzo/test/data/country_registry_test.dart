import 'package:wainzo/core/utils/flag_emoji.dart';
import 'package:wainzo/data/geo/country_registry.dart';
import 'package:wainzo/models/country.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late CountryRegistry registry;

  setUpAll(() async {
    registry = CountryRegistry.parse(
      await rootBundle.loadString(CountryRegistry.assetPath),
    );
  });

  test('carries every country, keyed by ISO 3166-1 alpha-2', () {
    expect(registry.all.length, greaterThan(240));
    expect(registry['om']!.name, 'Oman');
    expect(registry['JP']!.name, 'Japan');
    expect(registry['GB']!.code, 'GB');
  });

  test('is sorted by name, which is the order the picker shows', () {
    final List<String> names = registry.all.map((Country c) => c.name).toList();
    final List<String> sorted = List<String>.of(names)..sort();
    expect(names, sorted);
  });

  test(
    'search prefers a prefix match, so "om" offers Oman before Dominica',
    () {
      final List<Country> results = registry.search('om');
      expect(results.first.code, 'OM');
      expect(results.map((Country c) => c.code), contains('DM'));
    },
  );

  test('search finds a country by its code', () {
    expect(registry.search('kr').first.code, 'KR');
  });

  test(
    'an unknown code degrades to something displayable instead of throwing',
    () {
      final Country resolved = registry.resolve('zz');
      expect(resolved.code, 'ZZ');
      expect(resolved.name, 'ZZ');
    },
  );

  group('flags are derived from the code', () {
    test('a real code becomes regional indicator symbols', () {
      expect(flagEmojiFor('OM'), '\u{1F1F4}\u{1F1F2}');
      expect(flagEmojiFor('jp'), '\u{1F1EF}\u{1F1F5}');
      expect(registry['GB']!.flag, '\u{1F1EC}\u{1F1E7}');
    });

    test('nonsense returns nothing rather than a broken glyph', () {
      expect(flagEmojiFor(''), '');
      expect(flagEmojiFor('X'), '');
      expect(flagEmojiFor('12'), '');
      expect(flagEmojiFor('LONG'), '');
    });
  });

  test('countries group by region for the picker', () {
    final Map<String, List<Country>> grouped = registry.byRegion();
    expect(grouped.keys, contains('Asia'));
    expect(grouped['Asia']!.map((Country c) => c.code), contains('JP'));
  });
}
