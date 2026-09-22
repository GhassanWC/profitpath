import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../models/country.dart';
import '../../providers/app_providers.dart';
import '../../providers/session_providers.dart';

/// Live activity per country, for the map and the trending list.
///
/// Real counts over whatever the repository is backed by. Nothing in the UI
/// invents a number: an empty result draws an unlit map rather than a
/// decorative one.
final FutureProvider<List<CountryActivity>> countryActivityProvider =
    FutureProvider<List<CountryActivity>>((Ref ref) async {
      final String? viewerCountry = ref.watch(viewerCountryProvider);
      return ref
          .watch(postRepositoryProvider)
          .activity(viewerCountry: viewerCountry);
    });

/// The same data reduced to what the painter needs: code to weight.
final Provider<Map<String, int>> activityHeatProvider =
    Provider<Map<String, int>>((Ref ref) {
      final List<CountryActivity>? activity = ref
          .watch(countryActivityProvider)
          .value;
      if (activity == null) return const <String, int>{};
      return <String, int>{
        for (final CountryActivity entry in activity)
          entry.code: entry.newPostsToday > 0
              ? entry.newPostsToday
              : entry.postCount,
      };
    });

/// The country the map is looking at, if any.
final NotifierProvider<SelectedCountry, String?> selectedCountryProvider =
    NotifierProvider<SelectedCountry, String?>(SelectedCountry.new);

final class SelectedCountry extends Notifier<String?> {
  @override
  String? build() => null;

  void select(String? code) => state = code?.toUpperCase();

  void clear() => state = null;
}

/// The activity record for the selected country, if the app has one.
final Provider<CountryActivity?> selectedCountryActivityProvider =
    Provider<CountryActivity?>((Ref ref) {
      final String? code = ref.watch(selectedCountryProvider);
      if (code == null) return null;
      final List<CountryActivity>? activity = ref
          .watch(countryActivityProvider)
          .value;
      if (activity == null) return null;
      for (final CountryActivity entry in activity) {
        if (entry.code == code) return entry;
      }
      return null;
    });
