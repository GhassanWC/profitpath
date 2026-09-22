import '../../models/ai_profile.dart';
import '../../models/post.dart';
import '../../models/taxonomy.dart';

/// Everything the model is given about a post.
///
/// Note what is *not* here: no user identifiers, no viewer history, no
/// location beyond what the creator chose. Analysis is about the content.
final class PostAnalysisRequest {
  const PostAnalysisRequest({
    required this.mediaType,
    required this.caption,
    required this.creatorIntent,
    required this.targetCountries,
    this.originCountry,
    this.mediaDuration,
    this.creatorLanguages = const <String>['en'],
  });

  factory PostAnalysisRequest.fromPost(
    Post post, {
    List<String> creatorLanguages = const <String>['en'],
  }) => PostAnalysisRequest(
    mediaType: post.mediaType,
    caption: post.caption,
    creatorIntent: post.creatorIntent,
    targetCountries: post.targetCountries,
    originCountry: post.originCountry,
    mediaDuration: post.mediaDuration,
    creatorLanguages: creatorLanguages,
  );

  final MediaType mediaType;
  final String caption;

  /// The creator's own statement of what they want the post to achieve. The
  /// single most important input: it is what lets the model explain a post
  /// rather than guess at it.
  final String creatorIntent;

  final List<String> targetCountries;
  final String? originCountry;
  final Duration? mediaDuration;
  final List<String> creatorLanguages;

  Map<String, dynamic> toJson() => <String, dynamic>{
    'mediaType': mediaType.name,
    'caption': caption,
    'creatorIntent': creatorIntent,
    'targetCountries': targetCountries,
    if (originCountry != null) 'originCountry': originCountry,
    if (mediaDuration != null) 'mediaDurationMs': mediaDuration!.inMilliseconds,
    'creatorLanguages': creatorLanguages,
  };
}

/// What comes back: a content profile and the preview built from it.
final class PostAnalysis {
  const PostAnalysis({required this.profile, required this.preview});

  final AiContentProfile profile;
  final AiPreview preview;
}

/// The AI boundary.
///
/// Wainzo is not tied to a model vendor. Everything the product needs from a
/// model is expressed here, so a provider can be replaced — or run behind a
/// different backend, or A/B tested against another — without touching a
/// screen. Two rules hold for every implementation:
///
/// 1. **No credentials in the client.** A remote implementation calls the
///    Wainzo backend, which holds the provider key and signs the upstream call.
///    There is no code path in this app that puts a model key on a device.
/// 2. **The model proposes, the creator disposes.** Everything returned here
///    is shown to the creator and is editable before it is published.
abstract interface class AiService {
  /// The whole job, in one call: understand the content and write the preview.
  Future<PostAnalysis> analyze(PostAnalysisRequest request);

  /// Understand the content: category, subcategories, topics, language.
  Future<AiContentProfile> analyzePost(PostAnalysisRequest request);

  /// Write the viewer-facing preview for an already-understood post.
  Future<AiPreview> generatePreview(
    PostAnalysisRequest request,
    AiContentProfile profile,
  );

  /// Just the category and subcategories — used when a creator edits a caption
  /// and only wants the labels refreshed.
  Future<(ContentCategory, List<String>)> generateCategories(
    PostAnalysisRequest request,
  );

  /// Who this looks like it is for, in plain words.
  Future<List<String>> generateAudience(
    PostAnalysisRequest request,
    AiContentProfile profile,
  );

  /// What the post is for, from the shared content-type vocabulary.
  Future<ContentType> generateIntent(PostAnalysisRequest request);
}
