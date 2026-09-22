import '../core/utils/flag_emoji.dart';

/// A place content can be aimed at.
///
/// The ISO 3166-1 alpha-2 [code] is the identity — names are display strings
/// and are expected to be localised later, so nothing in the app should ever
/// key off one.
final class Country {
  const Country({
    required this.code,
    required this.name,
    required this.latitude,
    required this.longitude,
    this.officialName = '',
    this.region = 'Other',
    this.subregion = '',
    this.languages = const <String>[],
  });

  factory Country.fromJson(Map<String, dynamic> json) => Country(
    code: (json['code'] as String).toUpperCase(),
    name: json['name'] as String,
    officialName: json['officialName'] as String? ?? '',
    latitude: (json['lat'] as num).toDouble(),
    longitude: (json['lng'] as num).toDouble(),
    region: json['region'] as String? ?? 'Other',
    subregion: json['subregion'] as String? ?? '',
    languages: (json['languages'] as List<dynamic>? ?? const <dynamic>[])
        .cast<String>()
        .toList(growable: false),
  );

  /// ISO 3166-1 alpha-2, upper case. The primary key everywhere in the app.
  final String code;
  final String name;
  final String officialName;
  final double latitude;
  final double longitude;

  /// Continental region, used to group the country picker.
  final String region;
  final String subregion;

  /// Primary languages, used by the AI layer as a hint when it guesses who a
  /// post is being aimed at.
  final List<String> languages;

  /// Derived, never stored. See [flagEmojiFor].
  String get flag => flagEmojiFor(code);

  Map<String, dynamic> toJson() => <String, dynamic>{
    'code': code,
    'name': name,
    'officialName': officialName,
    'lat': latitude,
    'lng': longitude,
    'region': region,
    'subregion': subregion,
    'languages': languages,
  };

  @override
  bool operator ==(Object other) => other is Country && other.code == code;

  @override
  int get hashCode => code.hashCode;

  @override
  String toString() => 'Country($code)';
}

/// A country plus how alive it is right now. Kept separate from [Country] so
/// the static registry never has to carry server state.
final class CountryActivity {
  const CountryActivity({
    required this.country,
    required this.postCount,
    this.newPostsToday = 0,
    this.trendingTopics = const <String>[],
  });

  final Country country;

  /// Posts targeted at this country that the viewer is eligible to see.
  final int postCount;
  final int newPostsToday;
  final List<String> trendingTopics;

  String get code => country.code;
}
