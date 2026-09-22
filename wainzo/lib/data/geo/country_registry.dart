import 'dart:convert';

import 'package:flutter/services.dart' show AssetBundle, rootBundle;

import '../../models/country.dart';

/// Every country the app knows about, keyed by ISO 3166-1 alpha-2.
///
/// Ships as an asset rather than a hard-coded Dart list: the set of countries
/// and their names change, and a data file can be regenerated or replaced by a
/// localised one without recompiling anything.
final class CountryRegistry {
  CountryRegistry._(this._byCode, this.all);

  final Map<String, Country> _byCode;

  /// Alphabetical by name — the order the picker shows.
  final List<Country> all;

  static const String assetPath = 'assets/data/countries.json';
  static CountryRegistry? _cached;

  static Future<CountryRegistry> load({AssetBundle? bundle}) async {
    final CountryRegistry? cached = _cached;
    if (cached != null) return cached;
    final String raw = await (bundle ?? rootBundle).loadString(assetPath);
    return _cached = parse(raw);
  }

  /// Visible for testing.
  static CountryRegistry parse(String rawJson) {
    final List<dynamic> decoded = jsonDecode(rawJson) as List<dynamic>;
    final List<Country> countries = decoded
        .map((dynamic e) => Country.fromJson(e as Map<String, dynamic>))
        .toList(growable: false);
    return CountryRegistry._(<String, Country>{
      for (final Country c in countries) c.code: c,
    }, List<Country>.unmodifiable(countries));
  }

  Country? operator [](String code) => _byCode[code.trim().toUpperCase()];

  /// For display where a missing country should degrade rather than throw —
  /// a post targeted at a code this build's registry does not carry.
  Country resolve(String code) {
    final String normalised = code.trim().toUpperCase();
    return _byCode[normalised] ??
        Country(code: normalised, name: normalised, latitude: 0, longitude: 0);
  }

  List<Country> resolveAll(Iterable<String> codes) =>
      codes.map(resolve).toList(growable: false);

  /// Prefix-first search across name, official name and code, so typing "om"
  /// offers Oman before Dominica.
  List<Country> search(String query, {int limit = 40}) {
    final String q = query.trim().toLowerCase();
    if (q.isEmpty) return all.take(limit).toList(growable: false);

    final List<Country> starts = <Country>[];
    final List<Country> contains = <Country>[];
    for (final Country c in all) {
      final String name = c.name.toLowerCase();
      if (name.startsWith(q) || c.code.toLowerCase() == q) {
        starts.add(c);
      } else if (name.contains(q) || c.officialName.toLowerCase().contains(q)) {
        contains.add(c);
      }
    }
    return <Country>[
      ...starts,
      ...contains,
    ].take(limit).toList(growable: false);
  }

  /// Countries grouped by continental region, for the picker's section list.
  Map<String, List<Country>> byRegion() {
    final Map<String, List<Country>> grouped = <String, List<Country>>{};
    for (final Country c in all) {
      grouped.putIfAbsent(c.region, () => <Country>[]).add(c);
    }
    return grouped;
  }
}
