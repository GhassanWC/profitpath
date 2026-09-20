import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/routing/app_routes.dart';
import '../../core/theme/atlas_colors.dart';
import '../../core/theme/atlas_tokens.dart';
import '../../core/theme/atlas_typography.dart';
import '../../core/utils/formatters.dart';
import '../../core/widgets/atlas_chip.dart';
import '../../core/widgets/country_flag.dart';
import '../../core/widgets/state_views.dart';
import '../../models/country.dart';
import '../../models/feedback_signal.dart';
import '../../models/post.dart';
import '../../models/taxonomy.dart';
import '../../providers/app_providers.dart';
import '../feed/feed_providers.dart';
import '../feed/widgets/ai_preview_card.dart';
import '../feed/widgets/preview_explainer.dart';
import 'country_providers.dart';
import 'widgets/country_map_header.dart';

/// One country, and what creators have sent to it.
///
/// The same preview cards as the feed: someone arriving here from the map is
/// making the same decision about the same kind of thing, and a different card
/// would only teach them a second interface.
class CountryScreen extends ConsumerStatefulWidget {
  const CountryScreen({required this.code, super.key});

  final String code;

  @override
  ConsumerState<CountryScreen> createState() => _CountryScreenState();
}

class _CountryScreenState extends ConsumerState<CountryScreen> {
  /// Skipped here, for this visit. A skip is not a block, so it does not
  /// survive leaving the page.
  final Set<String> _skipped = <String>{};
  ContentCategory? _category;

  String get _key =>
      _category == null ? widget.code : '${widget.code}/${_category!.slug}';

  @override
  Widget build(BuildContext context) {
    final Country? country = ref
        .watch(countryRegistryProvider)
        .value?[widget.code];
    final AsyncValue<List<Post>> posts = ref.watch(countryPostsProvider(_key));
    final AsyncValue<List<String>> topics = ref.watch(
      countryTopicsProvider(widget.code),
    );

    return Scaffold(
      body: CustomScrollView(
        slivers: <Widget>[
          SliverAppBar(
            expandedHeight: 260,
            pinned: true,
            backgroundColor: AtlasColors.ground,
            title: Row(
              mainAxisSize: MainAxisSize.min,
              children: <Widget>[
                CountryFlag(widget.code),
                const SizedBox(width: Insets.sm),
                Text(
                  country?.name ?? widget.code,
                  style: AtlasTypography.title,
                ),
              ],
            ),
            flexibleSpace: FlexibleSpaceBar(
              background: Stack(
                fit: StackFit.expand,
                children: <Widget>[
                  CountryMapHeader(countryCode: widget.code),
                  const DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: <Color>[
                          Color(0xB306080C),
                          Color(0x3306080C),
                          Color(0xFF06080C),
                        ],
                        stops: <double>[0, 0.45, 1],
                      ),
                    ),
                  ),
                  Positioned(
                    left: Insets.gutter,
                    right: Insets.gutter,
                    bottom: Insets.lg,
                    child: _Heading(
                      country: country,
                      code: widget.code,
                      posts: posts.value,
                    ),
                  ),
                ],
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: _TopicStrip(
              topics: topics.value ?? const <String>[],
              selected: _category,
              onSelect: (ContentCategory? category) =>
                  setState(() => _category = category),
            ),
          ),
          switch (posts) {
            AsyncData<List<Post>>(value: final List<Post> all) => _PostList(
              posts: all
                  .where((Post p) => !_skipped.contains(p.id))
                  .toList(growable: false),
              countryName: country?.name ?? widget.code,
              onSkip: (Post post) {
                setState(() => _skipped.add(post.id));
                ref.recordSignal(
                  post: post,
                  kind: FeedbackKind.skip,
                  surface: FeedbackSurface.country,
                );
              },
            ),
            AsyncError<List<Post>>(error: final Object error) =>
              SliverFillRemaining(
                hasScrollBody: false,
                child: AtlasErrorView(
                  error: error,
                  onRetry: () => ref.invalidate(countryPostsProvider(_key)),
                ),
              ),
            _ => const SliverFillRemaining(
              hasScrollBody: false,
              child: AtlasLoading(label: 'Looking at what is here'),
            ),
          },
        ],
      ),
    );
  }
}

class _Heading extends StatelessWidget {
  const _Heading({
    required this.country,
    required this.code,
    required this.posts,
  });

  final Country? country;
  final String code;
  final List<Post>? posts;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: <Widget>[
      Row(
        children: <Widget>[
          CountryFlag(code, size: 34),
          const SizedBox(width: Insets.md),
          Expanded(
            child: Text(
              country?.name ?? code,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: AtlasTypography.display.copyWith(fontSize: 32),
            ),
          ),
        ],
      ),
      const SizedBox(height: 2),
      Text(
        posts == null
            ? country?.subregion ?? ''
            : '${Format.compact(posts!.length)} posts creators sent here',
        style: AtlasTypography.caption,
      ),
    ],
  );
}

/// Trending topics, doubling as the category filter.
class _TopicStrip extends StatelessWidget {
  const _TopicStrip({
    required this.topics,
    required this.selected,
    required this.onSelect,
  });

  final List<String> topics;
  final ContentCategory? selected;
  final ValueChanged<ContentCategory?> onSelect;

  @override
  Widget build(BuildContext context) {
    // Topics that happen to name a category can filter; the rest are shown as
    // what is being talked about, which is worth knowing on its own.
    final List<ContentCategory> filters = <ContentCategory>[
      for (final String topic in topics)
        if (ContentCategory.initial.any(
          (ContentCategory c) => c.label.toLowerCase() == topic.toLowerCase(),
        ))
          ContentCategory.fromSlug(topic.toLowerCase()),
    ];

    if (topics.isEmpty) return const SizedBox(height: Insets.md);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        const SectionHeader('Trending here'),
        SizedBox(
          height: 44,
          child: ListView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: Insets.gutter),
            children: <Widget>[
              if (filters.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(right: Insets.sm),
                  child: AtlasChip(
                    label: 'Everything',
                    selected: selected == null,
                    onTap: () => onSelect(null),
                    dense: true,
                  ),
                ),
              for (final ContentCategory category in filters)
                Padding(
                  padding: const EdgeInsets.only(right: Insets.sm),
                  child: AtlasChip(
                    label: category.label,
                    selected: selected == category,
                    dotColor: category.swatch,
                    onTap: () =>
                        onSelect(selected == category ? null : category),
                    dense: true,
                  ),
                ),
              for (final String topic in topics.where(
                (String t) => !filters.any(
                  (ContentCategory c) =>
                      c.label.toLowerCase() == t.toLowerCase(),
                ),
              ))
                Padding(
                  padding: const EdgeInsets.only(right: Insets.sm),
                  child: AtlasChip(label: topic, dense: true),
                ),
            ],
          ),
        ),
      ],
    );
  }
}

class _PostList extends StatelessWidget {
  const _PostList({
    required this.posts,
    required this.countryName,
    required this.onSkip,
  });

  final List<Post> posts;
  final String countryName;
  final void Function(Post post) onSkip;

  @override
  Widget build(BuildContext context) {
    if (posts.isEmpty) {
      return SliverFillRemaining(
        hasScrollBody: false,
        child: AtlasEmpty(
          title: 'Nothing here yet',
          body:
              'No creator has aimed a post at $countryName under this filter. '
              'You could be the first.',
          icon: Icons.explore_off_outlined,
        ),
      );
    }

    // Tall enough for the card to breathe, capped so it never exceeds a screen.
    final double height = (MediaQuery.sizeOf(context).height * 0.66).clamp(
      460.0,
      620.0,
    );

    return SliverList.separated(
      itemCount: posts.length,
      separatorBuilder: (BuildContext context, int index) =>
          const SizedBox(height: Insets.lg),
      itemBuilder: (BuildContext context, int index) {
        final Post post = posts[index];
        return Padding(
          padding: EdgeInsets.fromLTRB(
            Insets.gutter,
            index == 0 ? Insets.md : 0,
            Insets.gutter,
            index == posts.length - 1 ? Insets.xxxl : 0,
          ),
          child: SizedBox(
            height: height,
            child: AiPreviewCard(
              post: post,
              onWatch: () => context.push(Routes.post(post.id)),
              onSkip: () => onSkip(post),
              onExplainPreview: () => showPreviewExplainer(context),
            ),
          ),
        );
      },
    );
  }
}
