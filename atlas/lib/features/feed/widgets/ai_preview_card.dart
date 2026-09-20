import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/atlas_colors.dart';
import '../../../core/theme/atlas_tokens.dart';
import '../../../core/theme/atlas_typography.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/atlas_button.dart';
import '../../../core/widgets/country_flag.dart';
import '../../../core/widgets/user_avatar.dart';
import '../../../data/geo/country_registry.dart';
import '../../../models/ai_profile.dart';
import '../../../models/post.dart';
import '../../../models/user.dart';
import '../../../providers/app_providers.dart';
import '../../../providers/session_providers.dart';
import '../../map/widgets/country_poster.dart';

/// The card the whole product turns on.
///
/// A viewer reads this *instead of* being shown the content, and then decides.
/// So it has to do three things and not a fourth: say what the thing is, say
/// why this particular person might care, and make both answers cheap to act
/// on. There is no like count on it, no view count and no follower count —
/// nothing that answers "is this popular" in place of "is this for me".
class AiPreviewCard extends ConsumerWidget {
  const AiPreviewCard({
    required this.post,
    required this.onWatch,
    required this.onSkip,
    super.key,
    this.onExplainPreview,
  });

  final Post post;
  final VoidCallback onWatch;
  final VoidCallback onSkip;

  /// Opens the explanation of what an AI preview is. Offered on every card:
  /// someone should never have to guess who wrote the words they are reading.
  final VoidCallback? onExplainPreview;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AiPreview? preview = post.preview;
    final AiContentProfile? profile = post.profile;
    final CountryRegistry? registry = ref.watch(countryRegistryProvider).value;
    final String? viewerCountry = ref.watch(viewerCountryProvider);

    return Container(
      decoration: BoxDecoration(
        color: AtlasColors.surface,
        borderRadius: BorderRadius.circular(Radii.xl),
        border: Border.all(color: AtlasColors.hairlineStrong),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          Expanded(
            flex: 42,
            child: _Backdrop(post: post, registry: registry),
          ),
          Expanded(
            flex: 58,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(
                Insets.xl,
                Insets.lg,
                Insets.xl,
                Insets.lg,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  _MetaRow(profile: profile, onExplain: onExplainPreview),
                  const SizedBox(height: Insets.md),
                  Text(
                    preview?.headline ?? post.caption,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: AtlasTypography.headline,
                  ),
                  const SizedBox(height: Insets.md),
                  Flexible(
                    child: Text(
                      preview?.summary ?? post.caption,
                      maxLines: 4,
                      overflow: TextOverflow.ellipsis,
                      style: AtlasTypography.bodyMuted,
                    ),
                  ),
                  if (preview != null) ...<Widget>[
                    const SizedBox(height: Insets.lg),
                    const Divider(color: AtlasColors.hairline, height: 1),
                    const SizedBox(height: Insets.lg),
                    Text(
                      'WHY YOU MIGHT WATCH',
                      style: AtlasTypography.overline,
                    ),
                    const SizedBox(height: Insets.sm),
                    Flexible(
                      child: Text(
                        preview.reasonToWatch,
                        maxLines: 3,
                        overflow: TextOverflow.ellipsis,
                        style: AtlasTypography.body.copyWith(height: 1.45),
                      ),
                    ),
                  ],
                  const Spacer(),
                  _TargetingLine(
                    post: post,
                    viewerCountry: viewerCountry,
                    registry: registry,
                  ),
                  const SizedBox(height: Insets.lg),
                  Row(
                    children: <Widget>[
                      Expanded(
                        flex: 3,
                        child: AtlasButton(
                          label: 'Watch',
                          onPressed: onWatch,
                          icon: Icons.play_arrow_rounded,
                          size: AtlasButtonSize.large,
                          expand: true,
                          semanticLabel:
                              'Watch: ${post.preview?.headline ?? post.caption}',
                        ),
                      ),
                      const SizedBox(width: Insets.md),
                      Expanded(
                        flex: 2,
                        child: AtlasButton(
                          label: 'Skip',
                          onPressed: onSkip,
                          kind: AtlasButtonKind.secondary,
                          size: AtlasButtonSize.large,
                          trailingIcon: Icons.arrow_forward_rounded,
                          expand: true,
                          semanticLabel: 'Skip this post',
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Backdrop extends ConsumerWidget {
  const _Backdrop({required this.post, required this.registry});

  final Post post;
  final CountryRegistry? registry;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final String origin = post.originCountry ?? '';
    final String originName = origin.isEmpty
        ? ''
        : registry?.resolve(origin).name ?? origin;
    final AsyncValue<AtlasUser> creator = ref.watch(
      userByIdProvider(post.creatorId),
    );

    return Stack(
      fit: StackFit.expand,
      children: <Widget>[
        if (post.thumbnailUrl != null && post.thumbnailUrl!.startsWith('http'))
          Image.network(
            post.thumbnailUrl!,
            fit: BoxFit.cover,
            errorBuilder: (
              BuildContext context,
              Object error,
              StackTrace? stack,
            ) => _poster(ref),
          )
        else
          _poster(ref),
        // Enough of a wash at the bottom that the card's body never looks
        // pasted onto the art.
        const DecoratedBox(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: <Color>[
                Color(0x00000000),
                Color(0x660D1117),
                Color(0xFF0D1117),
              ],
              stops: <double>[0.45, 0.82, 1.0],
            ),
          ),
        ),
        Positioned(
          top: Insets.lg,
          left: Insets.lg,
          right: Insets.lg,
          child: Row(
            children: <Widget>[
              if (origin.isNotEmpty)
                _GlassPill(
                  child: CountryLabel(
                    code: origin,
                    name: originName,
                    prefix: 'From',
                    flagSize: 14,
                    style: AtlasTypography.label.copyWith(fontSize: 12.5),
                  ),
                ),
              const Spacer(),
              _GlassPill(
                child: Text(switch (post.mediaType) {
                  MediaType.video =>
                    post.mediaDuration == null
                        ? 'Video'
                        : Format.clock(post.mediaDuration!),
                  MediaType.image => 'Photo',
                  MediaType.text => 'Text',
                }, style: AtlasTypography.label.copyWith(fontSize: 12.5)),
              ),
            ],
          ),
        ),
        Positioned(
          left: Insets.lg,
          right: Insets.lg,
          bottom: Insets.sm,
          child: Row(
            children: <Widget>[
              UserAvatar(
                initials: creator.value?.initials ?? '·',
                imageUrl: creator.value?.profileImageUrl,
                size: 26,
              ),
              const SizedBox(width: Insets.sm),
              Flexible(
                child: Text(
                  creator.value?.displayName ?? '',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: AtlasTypography.caption.copyWith(
                    color: AtlasColors.ink,
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _poster(WidgetRef ref) => CountryPoster(
    countryCode: post.originCountry ?? 'OM',
    outlines: ref.watch(worldOutlinesProvider).value,
    tint: post.category.swatch,
    seed: post.id.hashCode,
  );
}

class _GlassPill extends StatelessWidget {
  const _GlassPill({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: Insets.md, vertical: 6),
    decoration: BoxDecoration(
      color: AtlasColors.ground.withValues(alpha: 0.62),
      borderRadius: BorderRadius.circular(Radii.pill),
      border: Border.all(color: AtlasColors.hairline),
    ),
    child: child,
  );
}

class _MetaRow extends StatelessWidget {
  const _MetaRow({required this.profile, required this.onExplain});

  final AiContentProfile? profile;
  final VoidCallback? onExplain;

  @override
  Widget build(BuildContext context) {
    final AiContentProfile? p = profile;
    return Row(
      children: <Widget>[
        if (p != null) ...<Widget>[
          Container(
            width: 6,
            height: 6,
            decoration: BoxDecoration(
              color: p.category.swatch,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: Insets.sm),
          Flexible(
            child: Text(
              '${p.category.label} · ${p.contentType.label}'.toUpperCase(),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: AtlasTypography.overline,
            ),
          ),
        ],
        const Spacer(),
        Semantics(
          button: onExplain != null,
          label: 'What is an AI preview?',
          child: GestureDetector(
            onTap: onExplain,
            behavior: HitTestBehavior.opaque,
            child: Row(
              children: <Widget>[
                Text(
                  'AI PREVIEW',
                  style: AtlasTypography.overline.copyWith(
                    color: AtlasColors.accent,
                  ),
                ),
                if (onExplain != null) ...<Widget>[
                  const SizedBox(width: 4),
                  const Icon(
                    Icons.info_outline_rounded,
                    size: 13,
                    color: AtlasColors.accent,
                  ),
                ],
              ],
            ),
          ),
        ),
      ],
    );
  }
}

/// Why this post is in front of this person.
///
/// Traditional feeds hide this. Here it is the point, so it is printed on the
/// card: a creator chose to send this here.
class _TargetingLine extends StatelessWidget {
  const _TargetingLine({
    required this.post,
    required this.viewerCountry,
    required this.registry,
  });

  final Post post;
  final String? viewerCountry;
  final CountryRegistry? registry;

  @override
  Widget build(BuildContext context) {
    final String text;
    if (post.isGlobal) {
      text = 'The creator sent this everywhere';
    } else if (viewerCountry != null &&
        post.targetCountries.contains(viewerCountry)) {
      text =
          'The creator aimed this at ${registry?.resolve(viewerCountry!).name ?? viewerCountry}';
    } else {
      final List<String> names = post.targetCountries
          .take(3)
          .map((String c) => registry?.resolve(c).name ?? c)
          .toList(growable: false);
      text = 'Aimed at ${Format.list(names)}';
    }

    return Row(
      children: <Widget>[
        const Icon(
          Icons.near_me_outlined,
          size: 14,
          color: AtlasColors.inkFaint,
        ),
        const SizedBox(width: Insets.sm),
        Flexible(
          child: Text(
            text,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: AtlasTypography.caption.copyWith(fontSize: 12.5),
          ),
        ),
      ],
    );
  }
}
