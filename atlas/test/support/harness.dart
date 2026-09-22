import 'package:atlas/core/theme/atlas_theme.dart';
import 'package:atlas/data/mock/mock_backend.dart';
import 'package:atlas/data/mock/mock_data.dart';
import 'package:atlas/providers/app_providers.dart';
import 'package:atlas/providers/session_providers.dart';
import 'package:atlas/services/ai/ai_service.dart';
import 'package:atlas/services/ai/mock_ai_service.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences_platform_interface/in_memory_shared_preferences_async.dart';
import 'package:shared_preferences_platform_interface/shared_preferences_async_platform_interface.dart';

/// Test wiring.
///
/// Swaps the device key/value store for an in-memory one and strips the mock
/// backend's artificial latency, so tests exercise the real widgets and the
/// real repositories without waiting on either.
void useInMemoryPreferences() {
  SharedPreferencesAsyncPlatform.instance =
      InMemorySharedPreferencesAsync.empty();
}

List<Override> testOverrides({String? viewerCountry = 'OM'}) => <Override>[
  mockBackendProvider.overrideWith(
    (Ref ref) => MockBackend(latency: Duration.zero),
  ),
  aiServiceProvider.overrideWith(
    (Ref ref) => MockAiService(latency: Duration.zero) as AiService,
  ),
  viewerIdProvider.overrideWith((Ref ref) => MockData.viewer.id),
  viewerCountryProvider.overrideWith((Ref ref) => viewerCountry),
];

/// Sizes the test screen.
///
/// `setSurfaceSize` alone is not enough: it changes the constraints widgets are
/// laid out against but leaves `MediaQuery` reporting the default 800x600, so
/// anything that sizes itself from `MediaQuery.sizeOf` — the country page's
/// cards, the composer's preview — lays out for a screen that is not the one
/// under test. Setting the view sizes both.
void useScreen(WidgetTester tester, Size size, {double pixelRatio = 3}) {
  tester.view
    ..physicalSize = size * pixelRatio
    ..devicePixelRatio = pixelRatio;
  addTearDown(tester.view.reset);
}

/// Pumps a widget inside the app's theme and a configured provider scope.
Future<void> pumpAtlas(
  WidgetTester tester,
  Widget child, {
  List<Override> overrides = const <Override>[],
  Size surface = const Size(430, 932),
}) async {
  useInMemoryPreferences();
  useScreen(tester, surface);

  await tester.pumpWidget(
    ProviderScope(
      overrides: <Override>[...testOverrides(), ...overrides],
      child: MaterialApp(
        theme: AtlasTheme.build(),
        home: Scaffold(body: child),
      ),
    ),
  );
}
