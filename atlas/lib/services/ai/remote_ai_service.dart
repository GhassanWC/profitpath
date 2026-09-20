import '../../core/network/api_client.dart';
import '../../models/ai_profile.dart';
import '../../models/taxonomy.dart';
import 'ai_service.dart';

/// The production path: every model call goes to the Atlas backend.
///
/// The backend holds the provider credential, applies the preview contract
/// (explain, do not sell) as a system prompt, re-runs the clickbait check
/// server side, and is the only place that can be rate-limited or swapped to a
/// different vendor. The app never sees a model key, which is why there is no
/// configuration slot for one anywhere in this project.
final class RemoteAiService implements AiService {
  const RemoteAiService(this._api);

  final ApiClient _api;

  @override
  Future<PostAnalysis> analyze(PostAnalysisRequest request) async {
    final Map<String, dynamic> json = await _api.postJson(
      '/v1/ai/analyze',
      body: request.toJson(),
    );
    return PostAnalysis(
      profile: AiContentProfile.fromJson(
        json['profile'] as Map<String, dynamic>,
      ),
      preview: AiPreview.fromJson(json['preview'] as Map<String, dynamic>),
    );
  }

  @override
  Future<AiContentProfile> analyzePost(PostAnalysisRequest request) async =>
      AiContentProfile.fromJson(
        await _api.postJson('/v1/ai/profile', body: request.toJson()),
      );

  @override
  Future<AiPreview> generatePreview(
    PostAnalysisRequest request,
    AiContentProfile profile,
  ) async => AiPreview.fromJson(
    await _api.postJson(
      '/v1/ai/preview',
      body: <String, dynamic>{
        'request': request.toJson(),
        'profile': profile.toJson(),
      },
    ),
  );

  @override
  Future<(ContentCategory, List<String>)> generateCategories(
    PostAnalysisRequest request,
  ) async {
    final Map<String, dynamic> json = await _api.postJson(
      '/v1/ai/categories',
      body: request.toJson(),
    );
    return (
      ContentCategory.fromSlug(json['category'] as String? ?? 'other'),
      (json['subcategories'] as List<dynamic>? ?? const <dynamic>[])
          .cast<String>()
          .toList(growable: false),
    );
  }

  @override
  Future<List<String>> generateAudience(
    PostAnalysisRequest request,
    AiContentProfile profile,
  ) async {
    final Map<String, dynamic> json = await _api.postJson(
      '/v1/ai/audience',
      body: <String, dynamic>{
        'request': request.toJson(),
        'profile': profile.toJson(),
      },
    );
    return (json['audience'] as List<dynamic>? ?? const <dynamic>[])
        .cast<String>()
        .toList(growable: false);
  }

  @override
  Future<ContentType> generateIntent(PostAnalysisRequest request) async {
    final Map<String, dynamic> json = await _api.postJson(
      '/v1/ai/intent',
      body: request.toJson(),
    );
    return ContentType.fromSlug(json['intent'] as String? ?? 'discovery');
  }
}
