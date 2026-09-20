/// Every route in the app, in one place.
///
/// Paths are built here rather than interpolated at call sites so a URL shape
/// can change without a search-and-replace, and so deep links (a shared post,
/// a country) have one definition.
abstract final class Routes {
  static const String signIn = '/sign-in';

  static const String explore = '/explore';
  static const String feed = '/feed';
  static const String activity = '/activity';
  static const String profile = '/profile';

  static const String create = '/create';
  static const String settings = '/settings';

  static const String countryPattern = '/country/:code';
  static const String postPattern = '/post/:id';
  static const String userPattern = '/user/:id';

  static String country(String code) => '/country/${code.toUpperCase()}';

  static String post(String id) => '/post/$id';

  static String user(String id) => '/user/$id';
}
