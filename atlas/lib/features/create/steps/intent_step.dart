import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/atlas_colors.dart';
import '../../../core/theme/atlas_tokens.dart';
import '../../../core/theme/atlas_typography.dart';
import '../../../core/widgets/atlas_card.dart';
import '../composer_providers.dart';

/// Step two: what the creator wants the post to achieve.
///
/// This field is the product's hinge. It is what the model reasons from, which
/// is why it is a paragraph rather than a dropdown: "I want tourists coming to
/// Oman to know what this actually involves" carries an audience, a purpose and
/// a tone that no set of tags would.
class IntentStep extends ConsumerStatefulWidget {
  const IntentStep({super.key});

  @override
  ConsumerState<IntentStep> createState() => _IntentStepState();
}

class _IntentStepState extends ConsumerState<IntentStep> {
  late final TextEditingController _intent = TextEditingController(
    text: ref.read(composerProvider).intent,
  );

  static const List<String> _examples = <String>[
    'I want people in Japan to discover traditional Omani food.',
    'I want people in the UK to give me their opinion about this product.',
    'I want tourists visiting Oman to know what this actually involves.',
    'I want students who find this subject abstract to see it happen.',
  ];

  @override
  void dispose() {
    _intent.dispose();
    super.dispose();
  }

  void _use(String example) {
    _intent.text = example;
    ref.read(composerProvider.notifier).setIntent(example);
  }

  @override
  Widget build(BuildContext context) {
    final ComposerController controller = ref.read(composerProvider.notifier);

    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: Insets.gutter),
      children: <Widget>[
        Text(
          'Say it the way you would say it to a person. The AI works from this, '
          'and so does the preview people will read before they decide to watch.',
          style: AtlasTypography.bodyMuted,
        ),
        const SizedBox(height: Insets.xl),
        TextField(
          controller: _intent,
          onChanged: controller.setIntent,
          minLines: 4,
          maxLines: 8,
          maxLength: 300,
          autofocus: true,
          textCapitalization: TextCapitalization.sentences,
          decoration: const InputDecoration(
            hintText: 'Describe what you want this post to achieve...',
          ),
        ),
        const SizedBox(height: Insets.lg),
        Text('OR START FROM ONE OF THESE', style: AtlasTypography.overline),
        const SizedBox(height: Insets.md),
        for (final String example in _examples)
          Padding(
            padding: const EdgeInsets.only(bottom: Insets.sm),
            child: AtlasCard(
              onTap: () => _use(example),
              padding: const EdgeInsets.symmetric(
                horizontal: Insets.lg,
                vertical: Insets.md,
              ),
              radius: Radii.md,
              color: AtlasColors.surfaceRaised,
              child: Row(
                children: <Widget>[
                  const Icon(
                    Icons.north_east_rounded,
                    size: 15,
                    color: AtlasColors.inkFaint,
                  ),
                  const SizedBox(width: Insets.md),
                  Expanded(
                    child: Text(
                      example,
                      style: AtlasTypography.caption.copyWith(fontSize: 13),
                    ),
                  ),
                ],
              ),
            ),
          ),
        const SizedBox(height: Insets.xxl),
      ],
    );
  }
}
