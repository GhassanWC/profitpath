import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/routing/app_routes.dart';
import '../../core/theme/atlas_colors.dart';
import '../../core/theme/atlas_tokens.dart';
import '../../core/theme/atlas_typography.dart';
import '../../core/widgets/country_flag.dart';
import '../../core/widgets/state_views.dart';
import '../../data/geo/country_registry.dart';
import '../../models/post.dart';
import '../../providers/app_providers.dart';
import '../../providers/session_providers.dart';
import 'feed_providers.dart';
import 'widgets/preview_deck.dart';
import 'widgets/preview_explainer.dart';

/// The feed.
///
/// Not an endless scroll. One preview at a time, and a decision. The screen is
/// mostly empty space around a single card on purpose: the product is asking
/// for a judgement, and a judgement needs somewhere to sit.
class FeedScreen extends ConsumerWidget {
  const FeedScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AsyncValue<FeedState> feed = ref.watch(feedControllerProvider);

    return SafeArea(
      bottom: false,
      child: Column(
        children: <Widget>[
          const _FeedHeader(),
          Expanded(
            child: switch (feed) {
              AsyncData<FeedState>(value: final FeedState state) => _FeedBody(
                state: state,
              ),
              AsyncError<FeedState>(error: final Object error) =>
                AtlasErrorView(
                  error: error,
                  onRetry: () => ref.invalidate(feedControllerProvider),
                ),
              _ => const AtlasLoading(label: 'Finding what was aimed at you'),
            },
          ),
        ],
      ),
    );
  }
}

class _FeedHeader extends ConsumerWidget {
  const _FeedHeader();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final String? country = ref.watch(viewerCountryProvider);
    final CountryRegistry? registry = ref.watch(countryRegistryProvider).value;

    return Padding(
      padding: const EdgeInsets.fromLTRB(
        Insets.gutter,
        Insets.md,
        Insets.gutter,
        Insets.sm,
      ),
      child: Row(
        children: <Widget>[
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  'Aimed at you',
                  style: AtlasTypography.headline.copyWith(fontSize: 26),
                ),
                if (country != null)
                  Row(
                    children: <Widget>[
                      CountryFlag(country, size: 13),
                      const SizedBox(width: 6),
                      Text(
                        'Because you are in ${registry?.resolve(country).name ?? country}',
                        style: AtlasTypography.caption.copyWith(fontSize: 12.5),
                      ),
                    ],
                  ),
              ],
            ),
          ),
          IconButton(
            onPressed: () =>
                ref.read(feedControllerProvider.notifier).refresh(),
            icon: const Icon(Icons.refresh_rounded),
            tooltip: 'Start again',
            color: AtlasColors.inkMuted,
          ),
        ],
      ),
    );
  }
}

class _FeedBody extends ConsumerStatefulWidget {
  const _FeedBody({required this.state});

  final FeedState state;

  @override
  ConsumerState<_FeedBody> createState() => _FeedBodyState();
}

class _FeedBodyState extends ConsumerState<_FeedBody> {
  String? _impressionFor;

  @override
  Widget build(BuildContext context) {
    final FeedState state = widget.state;

    if (state.isEmpty) {
      return AtlasEmpty(
        title: state.exhausted
            ? 'That is everything for now'
            : 'Nothing is aimed here yet',
        body: state.exhausted
            ? 'You have seen every post creators have sent to your country today. '
                  'New ones arrive all the time — or go and look at another country.'
            : 'Set the country on your profile so creators can reach you, or explore '
                  'the map and go to the content instead.',
        icon: Icons.done_all_rounded,
        actionLabel: 'Explore the map',
        onAction: () => context.go(Routes.explore),
      );
    }

    _recordImpression(state.current);

    return Column(
      children: <Widget>[
        Expanded(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(
              Insets.gutter,
              Insets.sm,
              Insets.gutter,
              Insets.md,
            ),
            child: PreviewDeck(
              posts: state.queue,
              onWatch: _onWatch,
              onSkip: (Post post, Duration dwell) => ref
                  .read(feedControllerProvider.notifier)
                  .skip(post, dwell: dwell),
              onExplainPreview: () => showPreviewExplainer(context),
            ),
          ),
        ),
        const _FeedFootnote(),
      ],
    );
  }

  /// Fires once per card, after the frame it appears in, so the watch rate has
  /// a denominator that means what it says.
  void _recordImpression(Post? post) {
    if (post == null || post.id == _impressionFor) return;
    _impressionFor = post.id;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) ref.read(feedControllerProvider.notifier).impression(post);
    });
  }

  void _onWatch(Post post, Duration dwell) {
    ref.read(feedControllerProvider.notifier).watched(post, dwell: dwell);
    context.push(Routes.post(post.id));
  }
}

class _FeedFootnote extends StatelessWidget {
  const _FeedFootnote();

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(
      Insets.gutter,
      0,
      Insets.gutter,
      Insets.md,
    ),
    child: Text(
      'Skipping costs nothing. It tells us this one was not for you — not that it was bad.',
      textAlign: TextAlign.center,
      style: AtlasTypography.caption.copyWith(
        fontSize: 11.5,
        color: AtlasColors.inkFaint,
      ),
    ),
  );
}
