import 'package:flutter/material.dart';

import '../../../core/theme/atlas_colors.dart';
import '../../../core/theme/atlas_tokens.dart';
import '../../../core/theme/atlas_typography.dart';
import '../../../core/widgets/atlas_chip.dart';

/// A list of short strings the creator can add to and remove from.
///
/// Used for topics, subcategories and audience. Every one of these fields is
/// something the AI proposed, and every one of them has to be removable —
/// otherwise the model's guess becomes the creator's statement by default.
class TagEditor extends StatefulWidget {
  const TagEditor({
    required this.label,
    required this.tags,
    required this.onChanged,
    super.key,
    this.hint = 'Add',
    this.max = 8,
  });

  final String label;
  final List<String> tags;
  final ValueChanged<List<String>> onChanged;
  final String hint;
  final int max;

  @override
  State<TagEditor> createState() => _TagEditorState();
}

class _TagEditorState extends State<TagEditor> {
  final TextEditingController _input = TextEditingController();
  bool _adding = false;

  @override
  void dispose() {
    _input.dispose();
    super.dispose();
  }

  void _add() {
    final String value = _input.text.trim();
    if (value.isEmpty) {
      setState(() => _adding = false);
      return;
    }
    if (!widget.tags.contains(value) && widget.tags.length < widget.max) {
      widget.onChanged(<String>[...widget.tags, value]);
    }
    _input.clear();
    setState(() => _adding = false);
  }

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: <Widget>[
      Text(widget.label.toUpperCase(), style: AtlasTypography.overline),
      const SizedBox(height: Insets.sm),
      if (_adding)
        TextField(
          controller: _input,
          autofocus: true,
          onSubmitted: (_) => _add(),
          onTapOutside: (_) => _add(),
          decoration: InputDecoration(
            hintText: widget.hint,
            isDense: true,
            contentPadding: const EdgeInsets.symmetric(
              horizontal: Insets.md,
              vertical: Insets.md,
            ),
          ),
        )
      else
        Wrap(
          spacing: Insets.sm,
          runSpacing: Insets.sm,
          children: <Widget>[
            for (final String tag in widget.tags)
              AtlasChip(
                label: tag,
                dense: true,
                onRemove: () => widget.onChanged(
                  widget.tags
                      .where((String t) => t != tag)
                      .toList(growable: false),
                ),
              ),
            if (widget.tags.length < widget.max)
              Semantics(
                button: true,
                label: 'Add to ${widget.label}',
                child: GestureDetector(
                  onTap: () => setState(() => _adding = true),
                  behavior: HitTestBehavior.opaque,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: Insets.md,
                      vertical: Insets.sm,
                    ),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(Radii.pill),
                      border: Border.all(color: AtlasColors.hairlineStrong),
                    ),
                    child: const Icon(
                      Icons.add_rounded,
                      size: 15,
                      color: AtlasColors.inkMuted,
                    ),
                  ),
                ),
              ),
          ],
        ),
    ],
  );
}

/// A one-of-many picker rendered as a sheet. Used for category, content type
/// and intent, which all come from extensible vocabularies.
Future<T?> showOptionPicker<T>({
  required BuildContext context,
  required String title,
  required List<T> options,
  required String Function(T option) labelOf,
  T? selected,
  Color? Function(T option)? dotOf,
}) => showModalBottomSheet<T>(
  context: context,
  backgroundColor: AtlasColors.surface,
  isScrollControlled: true,
  builder: (BuildContext context) => SafeArea(
    child: Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Padding(
          padding: const EdgeInsets.fromLTRB(
            Insets.gutter,
            Insets.sm,
            Insets.gutter,
            Insets.md,
          ),
          child: Text(title, style: AtlasTypography.title),
        ),
        Flexible(
          child: ListView(
            shrinkWrap: true,
            children: <Widget>[
              for (final T option in options)
                ListTile(
                  onTap: () => Navigator.of(context).pop(option),
                  leading: dotOf == null
                      ? null
                      : Container(
                          width: 10,
                          height: 10,
                          margin: const EdgeInsets.only(top: 6),
                          decoration: BoxDecoration(
                            color: dotOf(option),
                            shape: BoxShape.circle,
                          ),
                        ),
                  title: Text(labelOf(option), style: AtlasTypography.body),
                  trailing: option == selected
                      ? const Icon(
                          Icons.check_rounded,
                          color: AtlasColors.accent,
                          size: 20,
                        )
                      : null,
                ),
            ],
          ),
        ),
        const SizedBox(height: Insets.md),
      ],
    ),
  ),
);
