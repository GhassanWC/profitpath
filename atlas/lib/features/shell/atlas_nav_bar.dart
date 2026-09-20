import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/atlas_colors.dart';
import '../../core/theme/atlas_tokens.dart';
import '../../core/theme/atlas_typography.dart';
import '../../providers/session_providers.dart';
import '../activity/activity_screen.dart';

/// The bottom bar.
///
/// Five places, one of which is not a place: Create is an action, so it is
/// drawn as a button rather than a tab and opens over whatever you were doing
/// instead of replacing it. Everything else is a destination you can come back
/// to with its scroll position intact.
class AtlasNavBar extends ConsumerWidget {
  const AtlasNavBar({
    required this.index,
    required this.onSelect,
    required this.onCreate,
    super.key,
  });

  /// 0 explore · 1 feed · 2 activity · 3 profile. Create is not an index.
  final int index;
  final ValueChanged<int> onSelect;
  final VoidCallback onCreate;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final int unread =
        ref.watch(unreadCountProvider(ref.watch(viewerIdProvider))).value ?? 0;

    return Container(
      decoration: const BoxDecoration(
        color: AtlasColors.surface,
        border: Border(top: BorderSide(color: AtlasColors.hairline)),
      ),
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: 62,
          child: Row(
            children: <Widget>[
              _NavItem(
                icon: Icons.public_outlined,
                activeIcon: Icons.public_rounded,
                label: 'Explore',
                selected: index == 0,
                onTap: () => onSelect(0),
              ),
              _NavItem(
                icon: Icons.layers_outlined,
                activeIcon: Icons.layers_rounded,
                label: 'Feed',
                selected: index == 1,
                onTap: () => onSelect(1),
              ),
              Expanded(child: _CreateButton(onTap: onCreate)),
              _NavItem(
                icon: Icons.notifications_none_rounded,
                activeIcon: Icons.notifications_rounded,
                label: 'Activity',
                selected: index == 2,
                badge: unread,
                onTap: () => onSelect(2),
              ),
              _NavItem(
                icon: Icons.person_outline_rounded,
                activeIcon: Icons.person_rounded,
                label: 'You',
                selected: index == 3,
                onTap: () => onSelect(3),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  const _NavItem({
    required this.icon,
    required this.activeIcon,
    required this.label,
    required this.selected,
    required this.onTap,
    this.badge = 0,
  });

  final IconData icon;
  final IconData activeIcon;
  final String label;
  final bool selected;
  final VoidCallback onTap;
  final int badge;

  @override
  Widget build(BuildContext context) => Expanded(
    child: Semantics(
      button: true,
      selected: selected,
      label: badge > 0 ? '$label, $badge unread' : label,
      child: InkResponse(
        onTap: onTap,
        radius: 36,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: <Widget>[
            Stack(
              clipBehavior: Clip.none,
              children: <Widget>[
                AnimatedSwitcher(
                  duration: Motion.fast,
                  child: Icon(
                    selected ? activeIcon : icon,
                    key: ValueKey<bool>(selected),
                    size: 22,
                    color: selected ? AtlasColors.accent : AtlasColors.inkFaint,
                  ),
                ),
                if (badge > 0)
                  Positioned(
                    right: -5,
                    top: -2,
                    child: Container(
                      width: 7,
                      height: 7,
                      decoration: const BoxDecoration(
                        color: AtlasColors.accent,
                        shape: BoxShape.circle,
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 3),
            Text(
              label,
              style: AtlasTypography.overline.copyWith(
                fontSize: 9.5,
                letterSpacing: 0.5,
                color: selected ? AtlasColors.accent : AtlasColors.inkFaint,
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

class _CreateButton extends StatelessWidget {
  const _CreateButton({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Semantics(
    button: true,
    label: 'Create a post',
    child: Center(
      child: GestureDetector(
        onTap: onTap,
        behavior: HitTestBehavior.opaque,
        child: Container(
          width: 46,
          height: 38,
          decoration: BoxDecoration(
            color: AtlasColors.accent,
            borderRadius: BorderRadius.circular(Radii.md),
          ),
          child: const Icon(
            Icons.add_rounded,
            color: AtlasColors.onAccent,
            size: 22,
          ),
        ),
      ),
    ),
  );
}
