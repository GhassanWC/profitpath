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
/// flutter run --dart-define=WAINZO_API_BASE_URL=https://api.wainzo.example \
///             --dart-define=WAINZO_BACKEND=remote
/// ```
enum WainzoBackend {
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

  /// Reads the configuration baked in at build time. Defaults to [WainzoBackend.mock]
  /// so a fresh clone runs, fully navigable, with no backend to stand up.
  factory AppConfig.fromEnvironment() {
    const String raw = String.fromEnvironment(
      'WAINZO_BACKEND',
      defaultValue: 'mock',
    );
    const String url = String.fromEnvironment('WAINZO_API_BASE_URL');
    final WainzoBackend backend = raw == 'remote' && url.isNotEmpty
        ? WainzoBackend.remote
        : WainzoBackend.mock;
    return AppConfig(
      backend: backend,
      apiBaseUrl: url,
      requestTimeout: const Duration(seconds: 20),
    );
  }

  final WainzoBackend backend;
  final String apiBaseUrl;
  final Duration requestTimeout;

  bool get isMock => backend == WainzoBackend.mock;
}
