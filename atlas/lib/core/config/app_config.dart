/// Where the app points, and what it is allowed to do without a backend.
///
/// Nothing secret lives here. The client never holds an AI provider key: every
/// model call goes to [apiBaseUrl], which signs the upstream request server
/// side. See `docs/architecture.md`.
///
/// Values come from `--dart-define`, so one binary can be pointed at local,
/// staging or production without a code change:
///
/// ```
/// flutter run --dart-define=ATLAS_API_BASE_URL=https://api.atlas.example \
///             --dart-define=ATLAS_BACKEND=remote
/// ```
enum AtlasBackend {
  /// In-memory repositories seeded with realistic content. No network at all.
  mock,

  /// The HTTP repositories in `lib/data/remote`.
  remote,
}

final class AppConfig {
  const AppConfig({
    required this.backend,
    required this.apiBaseUrl,
    required this.requestTimeout,
  });

  /// Reads the configuration baked in at build time. Defaults to [AtlasBackend.mock]
  /// so a fresh clone runs, fully navigable, with no backend to stand up.
  factory AppConfig.fromEnvironment() {
    const String raw = String.fromEnvironment(
      'ATLAS_BACKEND',
      defaultValue: 'mock',
    );
    const String url = String.fromEnvironment('ATLAS_API_BASE_URL');
    final AtlasBackend backend = raw == 'remote' && url.isNotEmpty
        ? AtlasBackend.remote
        : AtlasBackend.mock;
    return AppConfig(
      backend: backend,
      apiBaseUrl: url,
      requestTimeout: const Duration(seconds: 20),
    );
  }

  final AtlasBackend backend;
  final String apiBaseUrl;
  final Duration requestTimeout;

  bool get isMock => backend == AtlasBackend.mock;
}
