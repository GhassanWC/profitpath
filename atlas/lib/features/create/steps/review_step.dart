import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/atlas_colors.dart';
import '../../../core/theme/atlas_tokens.dart';
import '../../../core/theme/atlas_typography.dart';
import '../../../core/widgets/atlas_button.dart';
import '../../../core/widgets/atlas_card.dart';
import '../../../core/widgets/state_views.dart';
import '../../../models/ai_profile.dart';
import '../../../models/post.dart';
import '../../../models/taxonomy.dart';
import '../../../providers/session_providers.dart';
import '../../feed/widgets/ai_preview_card.dart';
import '../composer_providers.dart';
import '../widgets/tag_editor.dart';

/// Step four: what the AI made of the post, and what viewers will read.
///
/// Everything on this screen is editable, and the preview shown is the real
/// card rather than a mock-up of one — the creator approves the exact thing a
/// viewer will meet. If the preview trips the honesty check, publishing is
/// blocked here and the reason is named.
class ReviewStep extends ConsumerWidget {
  const ReviewStep({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ComposerState state = ref.watch(composerProvider);
    final ComposerController controller = ref.read(composerProvider.notifier);

    if (state.analyzing) return const _Analyzing();

    if (!state.hasAnalysis) {
      return AtlasErrorView(
        error: state.error ?? 'Analysis did not finish.',
        onRetry: controller.analyze,
      );
    }

    final AiContentProfile profile = state.profile!;
    final AiPreview preview = state.preview!;
    final Post previewPost = state.toPreviewPost(
      creatorId: ref.watch(viewerIdProvider),
      originCountry: ref.watch(viewerCountryProvider),
    );

    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: Insets.gutter),
      children: <Widget>[
        if (!state.previewIsHonest)
          _HonestyWarning(flags: preview.clickbaitFlags),
        Text(
          'The AI read your description and your caption. Change anything that is '
          'wrong — what you publish is what people will see.',
          style: AtlasTypography.bodyMuted,
        ),
        const SizedBox(height: Insets.xl),
        _ProfileCard(profile: profile, controller: controller),
        const SizedBox(height: Insets.xl),
        Row(
          children: <Widget>[
            Expanded(
              child: Text(
                'THE PREVIEW PEOPLE WILL READ',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: AtlasTypography.overline,
              ),
            ),
            const SizedBox(width: Insets.md),
            GestureDetector(
              onTap: () => _editPreview(context, ref, preview),
              behavior: HitTestBehavior.opaque,
              child: Row(
                children: <Widget>[
                  const Icon(
                    Icons.edit_outlined,
                    size: 14,
                    color: AtlasColors.accent,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    'EDIT WORDING',
                    style: AtlasTypography.overline.copyWith(
                      color: AtlasColors.accent,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: Insets.md),
        SizedBox(
          height: (MediaQuery.sizeOf(context).height * 0.62).clamp(
            440.0,
            580.0,
          ),
          child: IgnorePointer(
            child: AiPreviewCard(
              post: previewPost,
              onWatch: () {},
              onSkip: () {},
            ),
          ),
        ),
        const SizedBox(height: Insets.xxxl),
      ],
    );
  }

  Future<void> _editPreview(
    BuildContext context,
    WidgetRef ref,
    AiPreview preview,
  ) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AtlasColors.surface,
      builder: (BuildContext context) => _PreviewEditor(preview: preview),
    );
  }
}

/// The waiting state.
///
/// It names the three things happening rather than spinning, because the
/// creator is about to be shown a model's opinion of their work and should know
/// what it was asked to do.
class _Analyzing extends StatefulWidget {
  const _Analyzing();

  @override
  State<_Analyzing> createState() => _AnalyzingState();
}

class _AnalyzingState extends State<_Analyzing>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 2600),
  )..repeat();

  static const List<String> _stages = <String>[
    'Reading what you wrote',
    'Working out what this is about',
    'Choosing categories and audience',
    'Writing the preview',
  ];

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(Insets.xxl),
      child: AnimatedBuilder(
        animation: _controller,
        builder: (BuildContext context, _) {
          final int active = (_controller.value * _stages.length).floor();
          return Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text('Analysing your post', style: AtlasTypography.headline),
              const SizedBox(height: Insets.xl),
              for (int i = 0; i < _stages.length; i++)
                Padding(
                  padding: const EdgeInsets.only(bottom: Insets.md),
                  child: Row(
                    children: <Widget>[
                      AnimatedContainer(
                        duration: Motion.base,
                        width: 7,
                        height: 7,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: i <= active
                              ? AtlasColors.accent
                              : AtlasColors.hairlineStrong,
                        ),
                      ),
                      const SizedBox(width: Insets.md),
                      AnimatedDefaultTextStyle(
                        duration: Motion.base,
                        style: AtlasTypography.body.copyWith(
                          color: i <= active
                              ? AtlasColors.ink
                              : AtlasColors.inkFaint,
                        ),
                        child: Text(_stages[i]),
                      ),
                    ],
                  ),
                ),
            ],
          );
        },
      ),
    ),
  );
}

class _HonestyWarning extends StatelessWidget {
  const _HonestyWarning({required this.flags});

  final List<String> flags;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: Insets.lg),
    child: AtlasCard(
      color: AtlasColors.surfaceRaised,
      border: AtlasColors.danger,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            children: <Widget>[
              const Icon(
                Icons.report_gmailerrorred_rounded,
                color: AtlasColors.danger,
                size: 18,
              ),
              const SizedBox(width: Insets.sm),
              Text(
                'This preview cannot go out yet',
                style: AtlasTypography.titleSmall.copyWith(
                  color: AtlasColors.danger,
                ),
              ),
            ],
          ),
          const SizedBox(height: Insets.sm),
          Text(
            'Previews on Atlas explain what a post is. These need rewording:',
            style: AtlasTypography.caption,
          ),
          const SizedBox(height: Insets.sm),
          for (final String flag in flags)
            Text(
              '· $flag',
              style: AtlasTypography.caption.copyWith(color: AtlasColors.ink),
            ),
        ],
      ),
    ),
  );
}

class _ProfileCard extends StatelessWidget {
  const _ProfileCard({required this.profile, required this.controller});

  final AiContentProfile profile;
  final ComposerController controller;

  @override
  Widget build(BuildContext context) => AtlasCard(
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Row(
          children: <Widget>[
            Expanded(
              child: Text(
                'AI CONTENT PROFILE',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: AtlasTypography.overline,
              ),
            ),
            const SizedBox(width: Insets.sm),
            if (profile.editedByCreator)
              Text(
                'EDITED BY YOU',
                style: AtlasTypography.overline.copyWith(
                  color: AtlasColors.accent,
                ),
              ),
          ],
        ),
        const SizedBox(height: Insets.lg),
        _Field(
          label: 'Category',
          value: profile.category.label,
          dot: profile.category.swatch,
          onTap: () async {
            final ContentCategory? picked =
                await showOptionPicker<ContentCategory>(
                  context: context,
                  title: 'What is this about?',
                  options: ContentCategory.initial,
                  labelOf: (ContentCategory c) => c.label,
                  dotOf: (ContentCategory c) => c.swatch,
                  selected: profile.category,
                );
            if (picked != null) controller.setCategory(picked);
          },
        ),
        _Field(
          label: 'Type',
          value: profile.contentType.label,
          onTap: () async {
            final ContentType? picked = await showOptionPicker<ContentType>(
              context: context,
              title: 'What kind of post is it?',
              options: ContentType.initial,
              labelOf: (ContentType t) => t.label,
              selected: profile.contentType,
            );
            if (picked != null) controller.setContentType(picked);
          },
        ),
        _Field(
          label: 'Purpose',
          value: profile.intent.label,
          onTap: () async {
            final ContentType? picked = await showOptionPicker<ContentType>(
              context: context,
              title: 'What is it for?',
              options: ContentType.initial,
              labelOf: (ContentType t) => t.label,
              selected: profile.intent,
            );
            if (picked != null) controller.setPostIntent(picked);
          },
        ),
        _Field(label: 'Language', value: profile.language.toUpperCase()),
        const SizedBox(height: Insets.lg),
        TagEditor(
          label: 'Topics',
          tags: profile.topics,
          onChanged: controller.setTopics,
          hint: 'A topic this covers',
        ),
        const SizedBox(height: Insets.lg),
        TagEditor(
          label: 'Subcategories',
          tags: profile.subcategories,
          onChanged: controller.setSubcategories,
          hint: 'Something more specific',
        ),
        const SizedBox(height: Insets.lg),
        TagEditor(
          label: 'Who it is for',
          tags: profile.audience,
          onChanged: controller.setAudience,
          hint: 'An audience',
        ),
      ],
    ),
  );
}

class _Field extends StatelessWidget {
  const _Field({
    required this.label,
    required this.value,
    this.dot,
    this.onTap,
  });

  final String label;
  final String value;
  final Color? dot;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) => Semantics(
    button: onTap != null,
    label: '$label: $value',
    child: InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: Insets.md),
        child: Row(
          children: <Widget>[
            SizedBox(
              width: 108,
              child: Text(label, style: AtlasTypography.caption),
            ),
            if (dot != null) ...<Widget>[
              Container(
                width: 6,
                height: 6,
                decoration: BoxDecoration(color: dot, shape: BoxShape.circle),
              ),
              const SizedBox(width: Insets.sm),
            ],
            Expanded(child: Text(value, style: AtlasTypography.body)),
            if (onTap != null)
              const Icon(
                Icons.expand_more_rounded,
                size: 18,
                color: AtlasColors.inkFaint,
              ),
          ],
        ),
      ),
    ),
  );
}

class _PreviewEditor extends ConsumerStatefulWidget {
  const _PreviewEditor({required this.preview});

  final AiPreview preview;

  @override
  ConsumerState<_PreviewEditor> createState() => _PreviewEditorState();
}

class _PreviewEditorState extends ConsumerState<_PreviewEditor> {
  late final TextEditingController _headline = TextEditingController(
    text: widget.preview.headline,
  );
  late final TextEditingController _summary = TextEditingController(
    text: widget.preview.summary,
  );
  late final TextEditingController _reason = TextEditingController(
    text: widget.preview.reasonToWatch,
  );

  @override
  void dispose() {
    _headline.dispose();
    _summary.dispose();
    _reason.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Padding(
    padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
    child: SingleChildScrollView(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(
          Insets.gutter,
          Insets.sm,
          Insets.gutter,
          Insets.xl,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Text('Edit the preview', style: AtlasTypography.headline),
            const SizedBox(height: Insets.sm),
            Text(
              'Keep it honest: say what the post is, not what it might do for someone.',
              style: AtlasTypography.caption,
            ),
            const SizedBox(height: Insets.xl),
            _LabelledField(
              label: 'Headline',
              controller: _headline,
              maxLines: 2,
              maxLength: 60,
            ),
            _LabelledField(
              label: 'What it shows',
              controller: _summary,
              maxLines: 5,
              maxLength: 320,
            ),
            _LabelledField(
              label: 'Why someone might watch',
              controller: _reason,
              maxLines: 4,
              maxLength: 200,
            ),
            const SizedBox(height: Insets.md),
            AtlasButton(
              label: 'Save wording',
              expand: true,
              onPressed: () {
                ref
                    .read(composerProvider.notifier)
                    .editPreview(
                      headline: _headline.text.trim(),
                      summary: _summary.text.trim(),
                      reasonToWatch: _reason.text.trim(),
                    );
                Navigator.of(context).pop();
              },
            ),
          ],
        ),
      ),
    ),
  );
}

class _LabelledField extends StatelessWidget {
  const _LabelledField({
    required this.label,
    required this.controller,
    required this.maxLines,
    required this.maxLength,
  });

  final String label;
  final TextEditingController controller;
  final int maxLines;
  final int maxLength;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: Insets.lg),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Text(label.toUpperCase(), style: AtlasTypography.overline),
        const SizedBox(height: Insets.sm),
        TextField(
          controller: controller,
          minLines: 1,
          maxLines: maxLines,
          maxLength: maxLength,
          textCapitalization: TextCapitalization.sentences,
        ),
      ],
    ),
  );
}
