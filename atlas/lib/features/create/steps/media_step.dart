import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/atlas_colors.dart';
import '../../../core/theme/atlas_tokens.dart';
import '../../../core/theme/atlas_typography.dart';
import '../../../core/widgets/atlas_card.dart';
import '../../../models/post.dart';
import '../../../services/media/media_service.dart';
import '../composer_providers.dart';

/// Step one: what is being posted.
///
/// The permission story lives here. Nothing is requested at launch — the
/// camera is asked for at the moment someone taps "record", and the library at
/// the moment they tap "choose". A refusal is shown next to the button they
/// pressed rather than as a modal that gives them nowhere to go.
class MediaStep extends ConsumerStatefulWidget {
  const MediaStep({super.key});

  @override
  ConsumerState<MediaStep> createState() => _MediaStepState();
}

class _MediaStepState extends ConsumerState<MediaStep> {
  late final TextEditingController _caption = TextEditingController(
    text: ref.read(composerProvider).caption,
  );

  @override
  void dispose() {
    _caption.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final ComposerState state = ref.watch(composerProvider);
    final ComposerController controller = ref.read(composerProvider.notifier);
    final bool textOnly =
        state.media == null && state.mediaType == MediaType.text;

    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: Insets.gutter),
      children: <Widget>[
        if (state.media != null)
          _SelectedMedia(media: state.media!, onClear: controller.useTextOnly)
        else ...<Widget>[
          Row(
            children: <Widget>[
              Expanded(
                child: _MediaOption(
                  icon: Icons.videocam_outlined,
                  label: 'Record a video',
                  onTap: () => controller.pick(
                    type: MediaType.video,
                    source: MediaSource.camera,
                  ),
                ),
              ),
              const SizedBox(width: Insets.md),
              Expanded(
                child: _MediaOption(
                  icon: Icons.photo_camera_outlined,
                  label: 'Take a photo',
                  onTap: () => controller.pick(
                    type: MediaType.image,
                    source: MediaSource.camera,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: Insets.md),
          _MediaOption(
            icon: Icons.perm_media_outlined,
            label: 'Choose from your library',
            detail: 'A video or a photo you already have',
            wide: true,
            onTap: () => controller.pick(
              type: MediaType.video,
              source: MediaSource.gallery,
            ),
          ),
          const SizedBox(height: Insets.md),
          _MediaOption(
            icon: Icons.notes_rounded,
            label: 'Write instead',
            detail: 'A question, or something you want opinions on',
            wide: true,
            selected: textOnly,
            onTap: controller.useTextOnly,
          ),
        ],
        if (state.error != null) ...<Widget>[
          const SizedBox(height: Insets.lg),
          Text(
            state.error!,
            style: AtlasTypography.caption.copyWith(color: AtlasColors.danger),
          ),
        ],
        const SizedBox(height: Insets.xl),
        Text(
          textOnly ? 'YOUR POST' : 'CAPTION',
          style: AtlasTypography.overline,
        ),
        const SizedBox(height: Insets.sm),
        TextField(
          controller: _caption,
          onChanged: controller.setCaption,
          minLines: textOnly ? 5 : 2,
          maxLines: 8,
          maxLength: 600,
          textCapitalization: TextCapitalization.sentences,
          decoration: InputDecoration(
            hintText: textOnly
                ? 'Has anyone here done the Oman visa on arrival recently?'
                : 'How Omani halwa is made, start to finish',
          ),
        ),
        const SizedBox(height: Insets.xxl),
      ],
    );
  }
}

class _MediaOption extends StatelessWidget {
  const _MediaOption({
    required this.icon,
    required this.label,
    required this.onTap,
    this.detail,
    this.wide = false,
    this.selected = false,
  });

  final IconData icon;
  final String label;
  final String? detail;
  final VoidCallback onTap;
  final bool wide;
  final bool selected;

  @override
  Widget build(BuildContext context) => AtlasCard(
    onTap: onTap,
    color: selected ? AtlasColors.surfaceHigh : AtlasColors.surface,
    border: selected ? AtlasColors.accentEdge : AtlasColors.hairline,
    child: wide
        ? Row(
            children: <Widget>[
              Icon(icon, color: AtlasColors.accent, size: 22),
              const SizedBox(width: Insets.lg),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(label, style: AtlasTypography.titleSmall),
                    if (detail != null)
                      Text(detail!, style: AtlasTypography.caption),
                  ],
                ),
              ),
            ],
          )
        : Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Icon(icon, color: AtlasColors.accent, size: 22),
              const SizedBox(height: Insets.xl),
              Text(label, style: AtlasTypography.titleSmall),
            ],
          ),
  );
}

class _SelectedMedia extends StatelessWidget {
  const _SelectedMedia({required this.media, required this.onClear});

  final PickedMedia media;
  final VoidCallback onClear;

  @override
  Widget build(BuildContext context) => AtlasCard(
    child: Row(
      children: <Widget>[
        Container(
          width: 52,
          height: 52,
          decoration: BoxDecoration(
            color: AtlasColors.surfaceHigh,
            borderRadius: BorderRadius.circular(Radii.sm),
          ),
          child: Icon(
            media.type == MediaType.video
                ? Icons.play_arrow_rounded
                : Icons.image_outlined,
            color: AtlasColors.accent,
          ),
        ),
        const SizedBox(width: Insets.lg),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text(
                media.type == MediaType.video
                    ? 'Video selected'
                    : 'Photo selected',
                style: AtlasTypography.titleSmall,
              ),
              Text(
                media.path.split('/').last,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: AtlasTypography.caption,
              ),
            ],
          ),
        ),
        IconButton(
          onPressed: onClear,
          icon: const Icon(Icons.close_rounded),
          tooltip: 'Remove',
          color: AtlasColors.inkMuted,
        ),
      ],
    ),
  );
}
