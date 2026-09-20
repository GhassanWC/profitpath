import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/config/app_config.dart';
import '../data/geo/country_registry.dart';
import '../data/geo/world_outlines.dart';
import '../core/network/api_client.dart';
import '../data/mock/mock_backend.dart';
import '../data/mock/mock_data.dart';
import '../data/mock/mock_repositories.dart';
import '../data/remote/remote_repositories.dart';
import '../data/repositories/repositories.dart';
import '../models/user.dart';
import '../services/ai/ai_service.dart';
import '../services/ai/mock_ai_service.dart';
import '../services/ai/remote_ai_service.dart';
import '../services/auth/auth_service.dart';
import '../services/auth/mock_auth_service.dart';
import '../services/media/media_service.dart';
import '../services/moderation/mock_moderation_service.dart';
import '../services/moderation/moderation_service.dart';
import '../services/ranking/recommendation_service.dart';

/// Composition root.
///
/// Every dependency the app has is constructed here and nowhere else, chosen by
/// [AppConfig]. A screen asks for `postRepositoryProvider` and gets whichever
/// implementation this build is configured for — which is what makes the mock
/// backend a development convenience rather than a fork of the app.
final Provider<AppConfig> appConfigProvider = Provider<AppConfig>(
  (Ref ref) => AppConfig.fromEnvironment(),
);

final Provider<AuthService> authServiceProvider = Provider<AuthService>((
  Ref ref,
) {
  final AppConfig config = ref.watch(appConfigProvider);
  if (config.isMock) {
    // Seeded with the mock viewer so the prototype opens on a populated
    // profile rather than an empty one.
    final MockAuthService service = MockAuthService(seedUser: MockData.viewer);
    ref.onDispose(service.dispose);
    return service;
  }
  // A remote AuthService implementation belongs here. It is the one seam that
  // has to be written against a real identity provider — see
  // docs/architecture.md for the Google and Apple requirements.
  final MockAuthService service = MockAuthService();
  ref.onDispose(service.dispose);
  return service;
});

final Provider<ApiClient> apiClientProvider = Provider<ApiClient>((Ref ref) {
  final AuthService auth = ref.watch(authServiceProvider);
  final ApiClient client = ApiClient(
    config: ref.watch(appConfigProvider),
    tokenProvider: auth.token,
  );
  ref.onDispose(client.close);
  return client;
});

final Provider<ModerationService> moderationServiceProvider =
    Provider<ModerationService>((Ref ref) => MockModerationService());

final Provider<AiService> aiServiceProvider = Provider<AiService>((Ref ref) {
  final AppConfig config = ref.watch(appConfigProvider);
  return config.isMock
      ? MockAiService()
      : RemoteAiService(ref.watch(apiClientProvider));
});

final Provider<MediaService> mediaServiceProvider = Provider<MediaService>(
  (Ref ref) => ImagePickerMediaService(),
);

final Provider<RecommendationService> recommendationServiceProvider =
    Provider<RecommendationService>((Ref ref) => const RecommendationService());

/// The mock store. Only ever read when the app is configured for it.
final Provider<MockBackend> mockBackendProvider = Provider<MockBackend>(
  (Ref ref) => MockBackend(),
);

final Provider<PostRepository> postRepositoryProvider =
    Provider<PostRepository>((Ref ref) {
      final AppConfig config = ref.watch(appConfigProvider);
      return config.isMock
          ? MockPostRepository(
              backend: ref.watch(mockBackendProvider),
              moderation: ref.watch(moderationServiceProvider),
              ranking: ref.watch(recommendationServiceProvider),
            )
          : RemotePostRepository(ref.watch(apiClientProvider));
    });

final Provider<UserRepository> userRepositoryProvider =
    Provider<UserRepository>((Ref ref) {
      final AppConfig config = ref.watch(appConfigProvider);
      return config.isMock
          ? MockUserRepository(ref.watch(mockBackendProvider))
          : RemoteUserRepository(ref.watch(apiClientProvider));
    });

final Provider<CommentRepository> commentRepositoryProvider =
    Provider<CommentRepository>((Ref ref) {
      final AppConfig config = ref.watch(appConfigProvider);
      return config.isMock
          ? MockCommentRepository(
              backend: ref.watch(mockBackendProvider),
              moderation: ref.watch(moderationServiceProvider),
            )
          : RemoteCommentRepository(ref.watch(apiClientProvider));
    });

final Provider<NotificationRepository> notificationRepositoryProvider =
    Provider<NotificationRepository>((Ref ref) {
      final AppConfig config = ref.watch(appConfigProvider);
      return config.isMock
          ? MockNotificationRepository(ref.watch(mockBackendProvider))
          : RemoteNotificationRepository(ref.watch(apiClientProvider));
    });

final Provider<FeedbackRepository> feedbackRepositoryProvider =
    Provider<FeedbackRepository>((Ref ref) {
      final AppConfig config = ref.watch(appConfigProvider);
      return config.isMock
          ? MockFeedbackRepository(ref.watch(mockBackendProvider))
          : RemoteFeedbackRepository(ref.watch(apiClientProvider));
    });

final Provider<CountryRepository> countryRepositoryProvider =
    Provider<CountryRepository>(
      (Ref ref) =>
          LocalCountryRepository(posts: ref.watch(postRepositoryProvider)),
    );

/// The country list and the map's outlines, loaded once and shared. Both are
/// bundled assets, so neither needs a network or a backend.
final FutureProvider<CountryRegistry> countryRegistryProvider =
    FutureProvider<CountryRegistry>((Ref ref) => CountryRegistry.load());

final FutureProvider<WorldOutlines> worldOutlinesProvider =
    FutureProvider<WorldOutlines>((Ref ref) => WorldOutlines.load());

/// One account, by id. Used wherever a post needs to name its creator.
final userByIdProvider = FutureProvider.family<AtlasUser, String>(
  (Ref ref, String id) => ref.watch(userRepositoryProvider).byId(id),
);
