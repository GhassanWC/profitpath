import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/routing/app_routes.dart';
import '../../core/theme/atlas_colors.dart';
import '../../core/theme/atlas_tokens.dart';
import '../../core/theme/atlas_typography.dart';
import '../../core/utils/formatters.dart';
import '../../core/widgets/atlas_button.dart';
import '../../core/widgets/atlas_chip.dart';
import '../../core/widgets/country_flag.dart';
import '../../core/widgets/state_views.dart';
import '../../core/widgets/user_avatar.dart';
import '../../models/post.dart';
import '../../models/user.dart';
import '../../providers/app_providers.dart';
import '../../providers/session_providers.dart';
import 'profile_providers.dart';
import 'widgets/post_grid_tile.dart';
import 'widgets/reach_map.dart';

/// A creator, and where their work has been.
class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key, this.userId});

  /// Null means the signed-in person.
  final String? userId;

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  int _tab = 0;

  @override
  Widget build(BuildContext context) {
    final String viewerId = ref.watch(viewerIdProvider);
    final String userId = widget.userId ?? viewerId;
    final bool isMine = userId == viewerId;

    final AsyncValue<AtlasUser> user =
        isMine && ref.watch(currentUserProvider) != null
        ? AsyncValue<AtlasUser>.data(ref.watch(currentUserProvider)!)
        : ref.watch(userByIdProvider(userId));

    return Scaffold(
      body: switch (user) {
        AsyncData<AtlasUser>(value: final AtlasUser data) => _Body(
          user: data,
          isMine: isMine,
          tab: _tab,
          onTab: (int value) => setState(() => _tab = value),
        ),
        AsyncError<AtlasUser>(error: final Object error) => SafeArea(
          child: AtlasErrorView(
            error: error,
            onRetry: () => ref.invalidate(userByIdProvider(userId)),
          ),
        ),
        _ => const AtlasLoading(),
      },
    );
  }
}

class _Body extends ConsumerWidget {
  const _Body({
    required this.user,
    required this.isMine,
    required this.tab,
    required this.onTab,
  });

  final AtlasUser user;
  final bool isMine;
  final int tab;
  final ValueChanged<int> onTab;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AsyncValue<Map<String, int>> reach = ref.watch(
      contentReachProvider(user.id),
    );
    final AsyncValue<List<Post>> posts = ref.watch(
      tab == 1 ? savedPostsProvider(user.id) : profilePostsProvider(user.id),
    );

    return CustomScrollView(
      slivers: <Widget>[
        SliverAppBar(
          pinned: true,
          backgroundColor: AtlasColors.ground,
          title: Text(user.handle, style: AtlasTypography.title),
          actions: <Widget>[
            if (isMine)
              IconButton(
                onPressed: () => context.push(Routes.settings),
                icon: const Icon(Icons.settings_outlined),
                tooltip: 'Settings',
              ),
          ],
        ),
        SliverToBoxAdapter(
          child: _Header(user: user, isMine: isMine),
        ),
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: Insets.xl),
            child: switch (reach) {
              AsyncData<Map<String, int>>(value: final Map<String, int> data) =>
                ReachMap(reach: data),
              _ => const SizedBox(height: 190),
            },
          ),
        ),
        SliverToBoxAdapter(
          child: _Tabs(tab: tab, onTab: onTab, isMine: isMine),
        ),
        switch (posts) {
          AsyncData<List<Post>>(value: final List<Post> data) => _Grid(
            posts: data,
            emptyTitle: tab == 1 ? 'Nothing saved yet' : 'No posts yet',
            emptyBody: tab == 1
                ? 'Posts you save while watching are kept here.'
                : isMine
                ? 'Make something, choose where it should go, and it will appear here.'
                : 'This creator has not published anything yet.',
          ),
          AsyncError<List<Post>>(error: final Object error) =>
            SliverToBoxAdapter(
              child: AtlasErrorView(error: error, compact: true),
            ),
          _ => const SliverToBoxAdapter(child: AtlasLoading(compact: true)),
        },
        const SliverToBoxAdapter(child: SizedBox(height: Insets.xxxl)),
      ],
    );
  }
}

class _Header extends ConsumerWidget {
  const _Header({required this.user, required this.isMine});

  final AtlasUser user;
  final bool isMine;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AsyncValue<bool> following = ref.watch(isFollowingProvider(user.id));

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: Insets.gutter),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              UserAvatar(
                initials: user.initials,
                imageUrl: user.profileImageUrl,
                size: 64,
              ),
              const SizedBox(width: Insets.lg),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(
                      user.displayName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: AtlasTypography.headlineSmall,
                    ),
                    if (user.country != null) ...<Widget>[
                      const SizedBox(height: 2),
                      Row(
                        children: <Widget>[
                          CountryFlag(user.country!, size: 14),
                          const SizedBox(width: 6),
                          Text(
                            ref
                                    .watch(countryRegistryProvider)
                                    .value
                                    ?.resolve(user.country!)
                                    .name ??
                                user.country!,
                            style: AtlasTypography.caption,
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
          if (user.bio.isNotEmpty) ...<Widget>[
            const SizedBox(height: Insets.lg),
            Text(user.bio, style: AtlasTypography.bodyMuted),
          ],
          const SizedBox(height: Insets.lg),
          Row(
            children: <Widget>[
              _Stat(label: 'Posts', value: user.postsCount),
              _Stat(label: 'Followers', value: user.followersCount),
              _Stat(label: 'Following', value: user.followingCount),
            ],
          ),
          const SizedBox(height: Insets.lg),
          if (!isMine)
            AtlasButton(
              label: (following.value ?? false) ? 'Following' : 'Follow',
              kind: (following.value ?? false)
                  ? AtlasButtonKind.secondary
                  : AtlasButtonKind.primary,
              expand: true,
              onPressed: () async {
                final bool next = !(following.value ?? false);
                await ref
                    .read(userRepositoryProvider)
                    .setFollowing(
                      userId: ref.read(viewerIdProvider),
                      targetId: user.id,
                      following: next,
                    );
                ref
                  ..invalidate(isFollowingProvider(user.id))
                  ..invalidate(userByIdProvider(user.id));
              },
            )
          else if (user.interests.isNotEmpty)
            Wrap(
              spacing: Insets.sm,
              runSpacing: Insets.sm,
              children: <Widget>[
                for (final String interest in user.interests)
                  AtlasChip(label: interest, dense: true),
              ],
            ),
        ],
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.label, required this.value});

  final String label;
  final int value;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(right: Insets.xxl),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Text(
          Format.compact(value),
          style: AtlasTypography.headlineSmall.copyWith(fontSize: 20),
        ),
        Text(
          label.toUpperCase(),
          style: AtlasTypography.overline.copyWith(fontSize: 9.5),
        ),
      ],
    ),
  );
}

class _Tabs extends StatelessWidget {
  const _Tabs({required this.tab, required this.onTab, required this.isMine});

  final int tab;
  final ValueChanged<int> onTab;
  final bool isMine;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(
      Insets.gutter,
      0,
      Insets.gutter,
      Insets.lg,
    ),
    child: Row(
      children: <Widget>[
        AtlasChip(
          label: 'Posts',
          selected: tab == 0,
          onTap: () => onTab(0),
          dense: true,
        ),
        if (isMine) ...<Widget>[
          const SizedBox(width: Insets.sm),
          AtlasChip(
            label: 'Saved',
            selected: tab == 1,
            onTap: () => onTab(1),
            dense: true,
          ),
        ],
      ],
    ),
  );
}

class _Grid extends StatelessWidget {
  const _Grid({
    required this.posts,
    required this.emptyTitle,
    required this.emptyBody,
  });

  final List<Post> posts;
  final String emptyTitle;
  final String emptyBody;

  @override
  Widget build(BuildContext context) {
    if (posts.isEmpty) {
      return SliverToBoxAdapter(
        child: AtlasEmpty(
          title: emptyTitle,
          body: emptyBody,
          icon: Icons.grid_view_rounded,
        ),
      );
    }
    return SliverPadding(
      padding: const EdgeInsets.symmetric(horizontal: Insets.gutter),
      sliver: SliverGrid.builder(
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          mainAxisSpacing: Insets.md,
          crossAxisSpacing: Insets.md,
          childAspectRatio: 0.74,
        ),
        itemCount: posts.length,
        itemBuilder: (BuildContext context, int index) => PostGridTile(
          post: posts[index],
          onTap: () => context.push(Routes.post(posts[index].id)),
        ),
      ),
    );
  }
}
