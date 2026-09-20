import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/routing/app_routes.dart';
import '../../core/theme/atlas_colors.dart';
import '../../core/theme/atlas_tokens.dart';
import '../../core/theme/atlas_typography.dart';
import '../../core/widgets/atlas_button.dart';
import '../../core/widgets/country_flag.dart';
import '../../core/widgets/state_views.dart';
import '../../core/widgets/user_avatar.dart';
import '../../models/feedback_signal.dart';
import '../../models/post.dart';
import '../../models/user.dart';
import '../../providers/app_providers.dart';
import '../../providers/session_providers.dart';
import '../feed/feed_providers.dart';
import '../map/widgets/country_poster.dart';
import '../post/post_actions_sheet.dart';
import 'watch_providers.dart';
import 'widgets/action_rail.dart';
import 'widgets/ai_summary_panel.dart';
import 'widgets/comments_sheet.dart';
import 'widgets/video_surface.dart';

/// What happens after someone chooses to watch.
///
/// The content is the screen. Everything else — who made it, where it came
/// from, what the AI said about it — is chrome that gets out of the way, and
/// the AI's reading is collapsed because the viewer has already read the
/// preview and does not need it repeated over the video.
class WatchScreen extends ConsumerStatefulWidget {
  const WatchScreen({required this.postId, super.key});

  final String postId;

  @override
  ConsumerState<WatchScreen> createState() => _WatchScreenState();
}

class _WatchScreenState extends ConsumerState<WatchScreen> {
  double _watchedFraction = 0;
  bool _completed = false;
  bool _opened = false;

  /// Records the watch once the post is known, and loads what this viewer has
  /// already done with it.
  void _onPostReady(Post post) {
    if (_opened) return;
    _opened = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      ref.read(postInteractionsProvider.notifier).load(post);
      ref.recordSignal(
        post: post,
        kind: FeedbackKind.watch,
        surface: FeedbackSurface.watch,
      );
    });
  }

  /// Leaving counts, and how much was watched is the interesting part: a video
  /// left at 90% is nearly a completion, one left at 5% is close to a skip.
  void _recordExit(Post post) {
    if (_completed || _watchedFraction <= 0.02) return;
    ref.recordSignal(
      post: post,
      kind: FeedbackKind.abandon,
      surface: FeedbackSurface.watch,
      watchedFraction: _watchedFraction,
    );
  }

  @override
  Widget build(BuildContext context) {
    final AsyncValue<Post> fetched = ref.watch(postProvider(widget.postId));
    final PostInteraction? interaction = ref.watch(
      postInteractionsProvider,
    )[widget.postId];
    final Post? post = interaction?.post ?? fetched.value;

    if (post != null) _onPostReady(post);

    return Scaffold(
      backgroundColor: AtlasColors.ground,
      body: switch ((post, fetched)) {
        (final Post p, _) => PopScope<Object?>(
          onPopInvokedWithResult: (bool didPop, Object? result) {
            if (didPop) _recordExit(p);
          },
          child: _WatchBody(
            post: p,
            liked: interaction?.liked ?? false,
            saved: interaction?.saved ?? false,
            following: interaction?.following ?? false,
            onProgress: (double fraction) => _watchedFraction = fraction,
            onCompleted: () {
              if (_completed) return;
              _completed = true;
              ref.recordSignal(
                post: p,
                kind: FeedbackKind.complete,
                surface: FeedbackSurface.watch,
                watchedFraction: 1,
              );
            },
          ),
        ),
        (null, AsyncError<Post>(error: final Object error)) => SafeArea(
          child: Stack(
            children: <Widget>[
              AtlasErrorView(
                error: error,
                onRetry: () => ref.invalidate(postProvider(widget.postId)),
              ),
              const _BackButton(),
            ],
          ),
        ),
        _ => const AtlasLoading(),
      },
    );
  }
}

class _WatchBody extends ConsumerWidget {
  const _WatchBody({
    required this.post,
    required this.liked,
    required this.saved,
    required this.following,
    required this.onProgress,
    required this.onCompleted,
  });

  final Post post;
  final bool liked;
  final bool saved;
  final bool following;
  final ValueChanged<double> onProgress;
  final VoidCallback onCompleted;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final PostInteractions actions = ref.read(
      postInteractionsProvider.notifier,
    );

    return Stack(
      fit: StackFit.expand,
      children: <Widget>[
        _Media(post: post, onProgress: onProgress, onCompleted: onCompleted),
        Positioned(
          top: 0,
          left: 0,
          right: 0,
          child: SafeArea(
            child: _TopBar(post: post, following: following),
          ),
        ),
        Positioned(
          right: Insets.md,
          bottom: 190,
          child: ActionRail(
            post: post,
            liked: liked,
            saved: saved,
            onLike: () => _guard(context, () => actions.toggleLike(post)),
            onSave: () => _guard(context, () => actions.toggleSave(post)),
            onShare: () => _share(context, actions),
            onComment: () => showComments(context, post),
          ),
        ),
        Positioned(
          left: 0,
          right: 0,
          bottom: 0,
          child: SafeArea(top: false, child: _Caption(post: post)),
        ),
      ],
    );
  }

  Future<void> _share(BuildContext context, PostInteractions actions) async {
    await actions.share(post);
    if (!context.mounted) return;
    // A real share sheet belongs here; until the backend can mint a public link
    // there is nothing honest to put in it, so the action is recorded and the
    // person is told what happened rather than handed a dead URL.
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Shared. Public links arrive with the backend.'),
      ),
    );
  }

  Future<void> _guard(
    BuildContext context,
    Future<void> Function() action,
  ) async {
    try {
      await action();
    } on Object catch (error) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(AtlasErrorView.messageFor(error))),
        );
      }
    }
  }
}

class _Media extends ConsumerWidget {
  const _Media({
    required this.post,
    required this.onProgress,
    required this.onCompleted,
  });

  final Post post;
  final ValueChanged<double> onProgress;
  final VoidCallback onCompleted;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final String? url = post.mediaUrl;

    return switch (post.mediaType) {
      MediaType.video when url != null && url.isNotEmpty => VideoSurface(
        source: url,
        onProgress: onProgress,
        onCompleted: onCompleted,
      ),
      MediaType.image when url != null && url.startsWith('http') => Center(
        child: Image.network(
          url,
          fit: BoxFit.contain,
          errorBuilder: (
            BuildContext context,
            Object error,
            StackTrace? stack,
          ) => _poster(ref),
        ),
      ),
      // A text post, or media this build has no file for: the country art
      // carries the screen, with the words on top of it.
      _ => Stack(
        fit: StackFit.expand,
        children: <Widget>[
          _poster(ref),
          if (post.mediaType == MediaType.text)
            Padding(
              padding: const EdgeInsets.fromLTRB(
                Insets.xxl,
                120,
                Insets.xxl,
                260,
              ),
              child: Center(
                child: SingleChildScrollView(
                  child: Text(
                    post.caption,
                    textAlign: TextAlign.center,
                    style: AtlasTypography.display.copyWith(fontSize: 30),
                  ),
                ),
              ),
            ),
        ],
      ),
    };
  }

  Widget _poster(WidgetRef ref) => CountryPoster(
    countryCode: post.originCountry ?? 'OM',
    outlines: ref.watch(worldOutlinesProvider).value,
    tint: post.category.swatch,
    seed: post.id.hashCode,
    dim: post.mediaType == MediaType.text,
  );
}

class _TopBar extends ConsumerWidget {
  const _TopBar({required this.post, required this.following});

  final Post post;
  final bool following;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AsyncValue<AtlasUser> creator = ref.watch(
      userByIdProvider(post.creatorId),
    );
    final bool isMine = post.creatorId == ref.watch(viewerIdProvider);

    return Container(
      padding: const EdgeInsets.fromLTRB(
        Insets.sm,
        Insets.sm,
        Insets.md,
        Insets.xxl,
      ),
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: <Color>[Color(0xB3000000), Color(0x00000000)],
        ),
      ),
      child: Row(
        children: <Widget>[
          AtlasIconButton(
            icon: Icons.arrow_back_rounded,
            tooltip: 'Back',
            filled: false,
            onPressed: () => Navigator.of(context).maybePop(),
          ),
          GestureDetector(
            onTap: () => context.push(Routes.user(post.creatorId)),
            behavior: HitTestBehavior.opaque,
            child: Row(
              children: <Widget>[
                UserAvatar(
                  initials: creator.value?.initials ?? '·',
                  imageUrl: creator.value?.profileImageUrl,
                  size: 32,
                  ring: true,
                ),
                const SizedBox(width: Insets.sm),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: <Widget>[
                    Text(
                      creator.value?.displayName ?? '',
                      style: AtlasTypography.titleSmall.copyWith(fontSize: 14),
                    ),
                    if (post.originCountry != null)
                      Row(
                        children: <Widget>[
                          CountryFlag(post.originCountry!, size: 11),
                          const SizedBox(width: 4),
                          Text(
                            post.category.label,
                            style: AtlasTypography.overline.copyWith(
                              fontSize: 9.5,
                            ),
                          ),
                        ],
                      ),
                  ],
                ),
              ],
            ),
          ),
          const Spacer(),
          if (!isMine)
            AtlasButton(
              label: following ? 'Following' : 'Follow',
              onPressed: () => ref
                  .read(postInteractionsProvider.notifier)
                  .toggleFollow(post),
              kind: following
                  ? AtlasButtonKind.ghost
                  : AtlasButtonKind.secondary,
              size: AtlasButtonSize.small,
            ),
          AtlasIconButton(
            icon: Icons.more_horiz_rounded,
            tooltip: 'More options',
            filled: false,
            onPressed: () async {
              final PostAction action = await showPostActions(context, post);
              if (action != PostAction.none && context.mounted) {
                Navigator.of(context).maybePop();
              }
            },
          ),
        ],
      ),
    );
  }
}

class _Caption extends StatelessWidget {
  const _Caption({required this.post});

  final Post post;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.fromLTRB(
      Insets.gutter,
      Insets.xxl,
      84,
      Insets.lg,
    ),
    decoration: const BoxDecoration(
      gradient: LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: <Color>[Color(0x00000000), Color(0xCC06080C)],
      ),
    ),
    child: Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        if (post.mediaType != MediaType.text)
          Text(
            post.caption,
            maxLines: 3,
            overflow: TextOverflow.ellipsis,
            style: AtlasTypography.body,
          ),
        const SizedBox(height: Insets.md),
        AiSummaryPanel(post: post),
      ],
    ),
  );
}

class _BackButton extends StatelessWidget {
  const _BackButton();

  @override
  Widget build(BuildContext context) => Positioned(
    top: Insets.sm,
    left: Insets.sm,
    child: AtlasIconButton(
      icon: Icons.arrow_back_rounded,
      tooltip: 'Back',
      onPressed: () => Navigator.of(context).maybePop(),
    ),
  );
}
