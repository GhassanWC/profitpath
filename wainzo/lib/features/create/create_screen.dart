import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/routing/app_routes.dart';
import '../../core/theme/wainzo_colors.dart';
import '../../core/theme/wainzo_tokens.dart';
import '../../core/theme/wainzo_typography.dart';
import '../../core/utils/formatters.dart';
import '../../core/widgets/wainzo_button.dart';
import '../../core/widgets/country_flag.dart';
import '../../data/geo/country_registry.dart';
import '../../providers/app_providers.dart';
import '../feed/feed_providers.dart';
import 'composer_providers.dart';
import 'steps/countries_step.dart';
import 'steps/intent_step.dart';
import 'steps/media_step.dart';
import 'steps/review_step.dart';

/// The composer.
///
/// Four steps, in the order the product's loop runs: what you made, what you
/// want it to do, where it should go, and what the AI made of it. Each step
/// does one thing, because a creator deciding where their work is seen is
/// making a real decision and should not be doing it in a corner of a form.
class CreateScreen extends ConsumerWidget {
  const CreateScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ComposerState state = ref.watch(composerProvider);
    final ComposerController controller = ref.read(composerProvider.notifier);

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          onPressed: () => _confirmDiscard(context, ref),
          icon: const Icon(Icons.close_rounded),
          tooltip: 'Close',
        ),
        title: Text(state.step.title, style: WainzoTypography.title),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(4),
          child: _StepProgress(step: state.step),
        ),
      ),
      body: SafeArea(
        top: false,
        child: Column(
          children: <Widget>[
            Expanded(
              child: AnimatedSwitcher(
                duration: Motion.base,
                switchInCurve: Motion.enter,
                child: switch (state.step) {
                  ComposerStep.media => const MediaStep(
                    key: ValueKey<String>('media'),
                  ),
                  ComposerStep.intent => const IntentStep(
                    key: ValueKey<String>('intent'),
                  ),
                  ComposerStep.countries => const CountriesStep(
                    key: ValueKey<String>('countries'),
                  ),
                  ComposerStep.review => const ReviewStep(
                    key: ValueKey<String>('review'),
                  ),
                },
              ),
            ),
            _Footer(state: state, controller: controller),
          ],
        ),
      ),
    );
  }

  Future<void> _confirmDiscard(BuildContext context, WidgetRef ref) async {
    final ComposerState state = ref.read(composerProvider);
    final bool hasWork =
        state.caption.isNotEmpty ||
        state.intent.isNotEmpty ||
        state.media != null;
    if (!hasWork) {
      ref.read(composerProvider.notifier).reset();
      if (context.mounted) context.pop();
      return;
    }

    final String? choice = await showModalBottomSheet<String>(
      context: context,
      backgroundColor: WainzoColors.surface,
      builder: (BuildContext context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            ListTile(
              leading: const Icon(Icons.save_outlined),
              title: const Text('Save as a draft'),
              subtitle: const Text('Come back to it from your profile'),
              onTap: () => Navigator.of(context).pop('draft'),
            ),
            ListTile(
              leading: const Icon(
                Icons.delete_outline_rounded,
                color: WainzoColors.danger,
              ),
              title: const Text(
                'Discard it',
                style: TextStyle(color: WainzoColors.danger),
              ),
              onTap: () => Navigator.of(context).pop('discard'),
            ),
            const SizedBox(height: Insets.md),
          ],
        ),
      ),
    );

    if (choice == 'draft') {
      await ref.read(composerProvider.notifier).saveDraft();
    } else if (choice != 'discard') {
      return;
    }
    ref.read(composerProvider.notifier).reset();
    if (context.mounted) context.pop();
  }
}

class _StepProgress extends StatelessWidget {
  const _StepProgress({required this.step});

  final ComposerStep step;

  @override
  Widget build(BuildContext context) {
    final int index = ComposerStep.values.indexOf(step);
    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: Insets.gutter,
        vertical: Insets.sm,
      ),
      child: Row(
        children: <Widget>[
          for (int i = 0; i < ComposerStep.values.length; i++)
            Expanded(
              child: Padding(
                padding: const EdgeInsets.only(right: 4),
                child: AnimatedContainer(
                  duration: Motion.base,
                  height: 3,
                  decoration: BoxDecoration(
                    color: i <= index
                        ? WainzoColors.accent
                        : WainzoColors.hairlineStrong,
                    borderRadius: BorderRadius.circular(Radii.pill),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _Footer extends ConsumerWidget {
  const _Footer({required this.state, required this.controller});

  final ComposerState state;
  final ComposerController controller;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final bool isReview = state.step == ComposerStep.review;

    return Container(
      padding: const EdgeInsets.fromLTRB(
        Insets.gutter,
        Insets.md,
        Insets.gutter,
        Insets.md,
      ),
      decoration: const BoxDecoration(
        color: WainzoColors.ground,
        border: Border(top: BorderSide(color: WainzoColors.hairline)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          if (state.error != null &&
              state.step != ComposerStep.media) ...<Widget>[
            Text(
              state.error!,
              style: WainzoTypography.caption.copyWith(
                color: WainzoColors.danger,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: Insets.md),
          ],
          if (state.step == ComposerStep.countries)
            Padding(
              padding: const EdgeInsets.only(bottom: Insets.md),
              child: Text(
                state.isGlobal
                    ? 'This will go everywhere'
                    : 'Going to ${state.targetCountries.length} '
                          '${state.targetCountries.length == 1 ? 'country' : 'countries'}',
                style: WainzoTypography.caption,
              ),
            ),
          Row(
            children: <Widget>[
              if (state.step != ComposerStep.media) ...<Widget>[
                WainzoButton(
                  label: 'Back',
                  onPressed: controller.back,
                  kind: WainzoButtonKind.ghost,
                ),
                const SizedBox(width: Insets.sm),
              ],
              Expanded(
                child: isReview
                    ? WainzoButton(
                        label: 'Publish',
                        onPressed: state.canContinue
                            ? () => _publish(context, ref)
                            : null,
                        busy: state.publishing,
                        expand: true,
                        icon: Icons.send_rounded,
                      )
                    : WainzoButton(
                        label: 'Continue',
                        onPressed: state.canContinue ? controller.next : null,
                        expand: true,
                        trailingIcon: Icons.arrow_forward_rounded,
                      ),
              ),
            ],
          ),
          if (isReview)
            TextButton(
              onPressed: state.publishing
                  ? null
                  : () async {
                      await controller.saveDraft();
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Saved as a draft.')),
                        );
                      }
                    },
              child: Text('Save as a draft', style: WainzoTypography.caption),
            ),
        ],
      ),
    );
  }

  Future<void> _publish(BuildContext context, WidgetRef ref) async {
    final String? id = await controller.publish();
    if (id == null || !context.mounted) return;

    final List<String> countries = state.targetCountries;
    ref.read(composerProvider.notifier).reset();
    // The feed and the map both change the moment a post exists.
    ref
      ..invalidate(feedControllerProvider)
      ..invalidate(countryRegistryProvider);

    await showModalBottomSheet<void>(
      context: context,
      backgroundColor: WainzoColors.surface,
      isDismissible: false,
      builder: (BuildContext context) =>
          _PublishedSheet(postId: id, countries: countries),
    );
    if (context.mounted) context.pop();
  }
}

/// Where it went. The confirmation is geographic on purpose — the thing the
/// creator just decided was a place, so that is what is read back to them.
class _PublishedSheet extends ConsumerWidget {
  const _PublishedSheet({required this.postId, required this.countries});

  final String postId;
  final List<String> countries;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final CountryRegistry? registry = ref.watch(countryRegistryProvider).value;

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(
          Insets.xl,
          Insets.lg,
          Insets.xl,
          Insets.xl,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            const Icon(
              Icons.check_circle_rounded,
              color: WainzoColors.accent,
              size: 30,
            ),
            const SizedBox(height: Insets.lg),
            Text('It is on its way', style: WainzoTypography.headline),
            const SizedBox(height: Insets.sm),
            Text(
              countries.isEmpty
                  ? 'Your post is available everywhere. People will see the preview '
                        'first and decide from there.'
                  : 'People in ${Format.list(countries.take(4).map((String c) => registry?.resolve(c).name ?? c))} will be shown the preview and decide from there.',
              style: WainzoTypography.bodyMuted,
            ),
            if (countries.isNotEmpty) ...<Widget>[
              const SizedBox(height: Insets.lg),
              Wrap(
                spacing: Insets.sm,
                runSpacing: Insets.sm,
                children: <Widget>[
                  for (final String code in countries.take(8))
                    CountryFlag(code, size: 22),
                ],
              ),
            ],
            const SizedBox(height: Insets.xl),
            WainzoButton(
              label: 'See how it looks',
              expand: true,
              onPressed: () {
                Navigator.of(context).pop();
                context.push(Routes.post(postId));
              },
            ),
            const SizedBox(height: Insets.sm),
            WainzoButton(
              label: 'Done',
              kind: WainzoButtonKind.ghost,
              expand: true,
              onPressed: () => Navigator.of(context).pop(),
            ),
          ],
        ),
      ),
    );
  }
}
