import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'core/routing/app_router.dart';
import 'core/theme/wainzo_theme.dart';

/// The application.
class WainzoApp extends ConsumerWidget {
  const WainzoApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final GoRouter router = ref.watch(routerProvider);
    final ThemeData theme = WainzoTheme.build();

    return MaterialApp.router(
      title: 'Wainzo',
      debugShowCheckedModeBanner: false,
      routerConfig: router,
      // One theme in both slots: the product is designed against a dark ground
      // and a device set to light mode should still get the designed product.
      theme: theme,
      darkTheme: theme,
      themeMode: ThemeMode.dark,
      builder: (BuildContext context, Widget? child) {
        // Respect the reader's text size, but stop a very large setting from
        // breaking layouts that have nowhere left to give.
        final MediaQueryData media = MediaQuery.of(context);
        return MediaQuery(
          data: media.copyWith(
            textScaler: media.textScaler.clamp(
              minScaleFactor: 0.9,
              maxScaleFactor: 1.3,
            ),
          ),
          child: child ?? const SizedBox.shrink(),
        );
      },
    );
  }
}
