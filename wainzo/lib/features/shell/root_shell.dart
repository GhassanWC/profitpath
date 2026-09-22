import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/routing/app_routes.dart';
import 'wainzo_nav_bar.dart';

/// The tabbed frame the app lives in.
///
/// Uses go_router's stateful shell so each tab keeps its own navigation stack
/// and scroll position: coming back to Explore should find the map where it was
/// left, not reset to the whole world.
class RootShell extends StatelessWidget {
  const RootShell({required this.navigationShell, super.key});

  final StatefulNavigationShell navigationShell;

  @override
  Widget build(BuildContext context) => Scaffold(
    body: navigationShell,
    bottomNavigationBar: WainzoNavBar(
      index: navigationShell.currentIndex,
      onSelect: (int index) => navigationShell.goBranch(
        index,
        // Tapping the tab you are already on returns it to its root, which is
        // what every platform's tab bar does.
        initialLocation: index == navigationShell.currentIndex,
      ),
      onCreate: () => context.push(Routes.create),
    ),
  );
}
