import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/utils/error_message.dart';
import '../../data/repositories/repositories.dart';
import '../../models/ai_profile.dart';
import '../../models/post.dart';
import '../../models/taxonomy.dart';
import '../../providers/app_providers.dart';
import '../../providers/session_providers.dart';
import '../../services/ai/ai_service.dart';
import '../../services/media/media_service.dart';

/// Which part of the composer someone is in.
enum ComposerStep {
  media,
  intent,
  countries,
  review;

  String get title => switch (this) {
    ComposerStep.media => 'What are you posting?',
    ComposerStep.intent => 'What do you want this to achieve?',
    ComposerStep.countries => 'Where should people see it?',
    ComposerStep.review => 'What the AI made of it',
  };
}

final class ComposerState {
  const ComposerState({
    this.step = ComposerStep.media,
    this.media,
    this.mediaType = MediaType.text,
    this.caption = '',
    this.intent = '',
    this.targetCountries = const <String>[],
    this.profile,
    this.preview,
    this.analyzing = false,
    this.publishing = false,
    this.error,
    this.publishedId,
    this.draftId,
  });

  final ComposerStep step;
  final PickedMedia? media;
  final MediaType mediaType;
  final String caption;

  /// The creator's own statement of purpose. The most important field in the
  /// composer: it is what the model reasons from, and what stops the preview
  /// being a guess.
  final String intent;

  /// ISO alpha-2 codes. Empty means global, which is a choice rather than an
  /// omission — see [isGlobal].
  final List<String> targetCountries;

  final AiContentProfile? profile;
  final AiPreview? preview;

  final bool analyzing;
  final bool publishing;
  final String? error;

  final String? publishedId;
  final String? draftId;

  bool get isGlobal => targetCountries.isEmpty;

  bool get hasAnalysis => profile != null && preview != null;

  /// A preview that fails the honesty check does not go out. The creator is
  /// shown exactly what tripped it and can rewrite the wording themselves.
  bool get previewIsHonest => preview?.isHonest ?? true;

  bool get canContinue => switch (step) {
    ComposerStep.media =>
      mediaType == MediaType.text ? caption.trim().length > 3 : media != null,
    ComposerStep.intent => intent.trim().length > 8,
    ComposerStep.countries => true,
    ComposerStep.review => hasAnalysis && previewIsHonest && !analyzing,
  };

  /// The post exactly as a viewer would meet it, for the review step's
  /// preview. Building the real thing rather than a mock-up is the point: a
  /// creator should approve the card people will actually see, not an
  /// approximation of it.
  Post toPreviewPost({required String creatorId, String? originCountry}) {
    final DateTime now = DateTime.now();
    return Post(
      id: draftId ?? 'preview',
      creatorId: creatorId,
      mediaType: mediaType,
      mediaUrl: media?.path,
      mediaDuration: media?.duration,
      caption: caption.trim(),
      creatorIntent: intent.trim(),
      originCountry: originCountry,
      targetCountries: targetCountries,
      profile: profile,
      preview: preview,
      createdAt: now,
      updatedAt: now,
    );
  }

  ComposerState copyWith({
    ComposerStep? step,
    PickedMedia? media,
    MediaType? mediaType,
    String? caption,
    String? intent,
    List<String>? targetCountries,
    AiContentProfile? profile,
    AiPreview? preview,
    bool? analyzing,
    bool? publishing,
    String? error,
    String? publishedId,
    String? draftId,
    bool clearError = false,
    bool clearMedia = false,
  }) => ComposerState(
    step: step ?? this.step,
    media: clearMedia ? null : media ?? this.media,
    mediaType: mediaType ?? this.mediaType,
    caption: caption ?? this.caption,
    intent: intent ?? this.intent,
    targetCountries: targetCountries ?? this.targetCountries,
    profile: profile ?? this.profile,
    preview: preview ?? this.preview,
    analyzing: analyzing ?? this.analyzing,
    publishing: publishing ?? this.publishing,
    error: clearError ? null : error ?? this.error,
    publishedId: publishedId ?? this.publishedId,
    draftId: draftId ?? this.draftId,
  );
}

final composerProvider = NotifierProvider<ComposerController, ComposerState>(
  ComposerController.new,
);

/// The composer.
///
/// The rule this class exists to enforce: **the AI assists, the creator
/// decides.** Analysis fills the fields in; every one of them is then editable,
/// and any edit is marked as the creator's so the data layer can tell a model's
/// guess from a person's statement. Nothing is published that the creator has
/// not seen in the form a viewer will see it.
final class ComposerController extends Notifier<ComposerState> {
  @override
  ComposerState build() => const ComposerState();

  void reset() => state = const ComposerState();

  // --- step 1: media --------------------------------------------------------

  Future<void> pick({
    required MediaType type,
    required MediaSource source,
  }) async {
    final MediaService service = ref.read(mediaServiceProvider);
    state = state.copyWith(clearError: true);
    try {
      final PickedMedia? picked = type == MediaType.video
          ? await service.pickVideo(source: source)
          : await service.pickImage(source: source);
      if (picked == null) return;
      state = state.copyWith(media: picked, mediaType: picked.type);
    } on Object catch (error) {
      state = state.copyWith(error: _message(error));
    }
  }

  void useTextOnly() =>
      state = state.copyWith(clearMedia: true, mediaType: MediaType.text);

  void setCaption(String value) => state = state.copyWith(caption: value);

  void setIntent(String value) => state = state.copyWith(intent: value);

  // --- step 3: targeting ----------------------------------------------------

  void toggleCountry(String code) {
    final String normalised = code.toUpperCase();
    final List<String> next = state.targetCountries.contains(normalised)
        ? (state.targetCountries.toList()..remove(normalised))
        : <String>[...state.targetCountries, normalised];
    state = state.copyWith(targetCountries: next);
  }

  void removeCountry(String code) => state = state.copyWith(
    targetCountries: state.targetCountries
        .where((String c) => c != code)
        .toList(growable: false),
  );

  /// Global is the empty list: the creator saying "anywhere" rather than
  /// naming 250 places.
  void goGlobal() => state = state.copyWith(targetCountries: const <String>[]);

  // --- step 4: analysis -----------------------------------------------------

  Future<void> analyze() async {
    if (state.analyzing) return;
    state = state.copyWith(analyzing: true, clearError: true);
    try {
      final PostAnalysis analysis = await ref
          .read(aiServiceProvider)
          .analyze(
            PostAnalysisRequest(
              mediaType: state.mediaType,
              caption: state.caption,
              creatorIntent: state.intent,
              targetCountries: state.targetCountries,
              originCountry: ref.read(currentUserProvider)?.country,
              mediaDuration: state.media?.duration,
              creatorLanguages:
                  ref.read(currentUserProvider)?.languages ??
                  const <String>['en'],
            ),
          );
      state = state.copyWith(
        profile: analysis.profile,
        preview: analysis.preview,
        analyzing: false,
      );
    } on Object catch (error) {
      state = state.copyWith(analyzing: false, error: _message(error));
    }
  }

  // --- creator edits --------------------------------------------------------

  void setCategory(ContentCategory category) {
    final AiContentProfile? profile = state.profile;
    if (profile == null) return;
    state = state.copyWith(profile: profile.edited(category: category));
  }

  void setContentType(ContentType type) {
    final AiContentProfile? profile = state.profile;
    if (profile == null) return;
    state = state.copyWith(profile: profile.edited(contentType: type));
  }

  void setPostIntent(ContentType intent) {
    final AiContentProfile? profile = state.profile;
    if (profile == null) return;
    state = state.copyWith(profile: profile.edited(intent: intent));
  }

  void setTopics(List<String> topics) {
    final AiContentProfile? profile = state.profile;
    if (profile == null) return;
    state = state.copyWith(profile: profile.edited(topics: topics));
  }

  void setSubcategories(List<String> subcategories) {
    final AiContentProfile? profile = state.profile;
    if (profile == null) return;
    state = state.copyWith(
      profile: profile.edited(subcategories: subcategories),
    );
  }

  void setAudience(List<String> audience) {
    final AiContentProfile? profile = state.profile;
    if (profile == null) return;
    state = state.copyWith(profile: profile.edited(audience: audience));
  }

  void editPreview({String? headline, String? summary, String? reasonToWatch}) {
    final AiPreview? preview = state.preview;
    if (preview == null) return;
    state = state.copyWith(
      preview: preview.copyWith(
        headline: headline,
        summary: summary,
        reasonToWatch: reasonToWatch,
      ),
    );
  }

  // --- navigation -----------------------------------------------------------

  void goTo(ComposerStep step) =>
      state = state.copyWith(step: step, clearError: true);

  Future<void> next() async {
    final ComposerStep current = state.step;
    if (!state.canContinue && current != ComposerStep.review) return;
    final int index = ComposerStep.values.indexOf(current);
    if (index >= ComposerStep.values.length - 1) return;
    final ComposerStep next = ComposerStep.values[index + 1];
    state = state.copyWith(step: next, clearError: true);
    // Analysis starts the moment the creator lands on the review step, so the
    // waiting happens while they are reading the heading rather than after.
    if (next == ComposerStep.review && !state.hasAnalysis) {
      await analyze();
    }
  }

  void back() {
    final int index = ComposerStep.values.indexOf(state.step);
    if (index <= 0) return;
    state = state.copyWith(
      step: ComposerStep.values[index - 1],
      clearError: true,
    );
  }

  // --- publishing -----------------------------------------------------------

  Post _buildPost({required PostStatus status}) {
    final DateTime now = DateTime.now();
    final String id = state.draftId ?? 'p_${now.microsecondsSinceEpoch}';
    return Post(
      id: id,
      creatorId: ref.read(viewerIdProvider),
      mediaType: state.mediaType,
      // A real upload puts the file behind a URL first. Until there is a
      // backend the local path stands in for one, and the data layer is the
      // only thing that has to change.
      mediaUrl: state.media?.path,
      mediaDuration: state.media?.duration,
      caption: state.caption.trim(),
      creatorIntent: state.intent.trim(),
      originCountry: ref.read(currentUserProvider)?.country,
      targetCountries: state.targetCountries,
      profile: state.profile,
      preview: state.preview,
      status: status,
      createdAt: now,
      updatedAt: now,
    );
  }

  Future<String?> saveDraft() async {
    state = state.copyWith(publishing: true, clearError: true);
    try {
      final Post saved = await ref
          .read(postRepositoryProvider)
          .saveDraft(_buildPost(status: PostStatus.draft));
      state = state.copyWith(publishing: false, draftId: saved.id);
      return saved.id;
    } on Object catch (error) {
      state = state.copyWith(publishing: false, error: _message(error));
      return null;
    }
  }

  Future<String?> publish() async {
    if (!state.previewIsHonest) {
      state = state.copyWith(
        error: 'The preview needs rewording before this can go out.',
      );
      return null;
    }
    state = state.copyWith(publishing: true, clearError: true);
    try {
      // The draft is stored before publishing so a moderation refusal or a
      // dropped connection leaves the creator's work on the server rather than
      // in a dead screen.
      final PostRepository repository = ref.read(postRepositoryProvider);
      final Post draft = await repository.saveDraft(
        _buildPost(status: PostStatus.published),
      );
      final Post published = await repository.publish(draft);
      state = state.copyWith(publishing: false, publishedId: published.id);
      return published.id;
    } on Object catch (error) {
      state = state.copyWith(publishing: false, error: _message(error));
      return null;
    }
  }

  String _message(Object error) => humanMessageFor(error);
}
