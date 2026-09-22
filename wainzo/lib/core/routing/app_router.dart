import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/activity/activity_screen.dart';
import '../../features/auth/sign_in_screen.dart';
import '../../features/country/country_screen.dart';
import '../../features/create/create_screen.dart';
import '../../features/explore/explore_screen.dart';
import '../../features/feed/feed_screen.dart';
import '../../features/profile/profile_screen.dart';
import '../../features/settings/settings_screen.dart';
import '../../features/shell/root_shell.dart';
import '../../features/watch/watch_screen.dart';
import '../../providers/session_providers.dart';
import '../theme/wainzo_tokens.dart';
import 'app_routes.dart';

/// The app's routes.
///
/// Deep-linkable throughout — `/country/JP` and `/post/:id` are the two links
/// this product will be shared by, so they are real routes rather than states
/// inside a screen.
final Provider<GoRouter> routerProvider = Provider<GoRouter>((Ref ref) {
  // A notifier the router listens to, so a sign-in or sign-out redirects
  // without rebuilding the router and throwing away everyone's navigation.
  final ValueNotifier<int> refresh = ValueNotifier<int>(0);
  ref
    ..listen(
      authControllerProvider,
      (AsyncValue<Object?>? previous, AsyncValue<Object?> next) =>
          refresh.value++,
    )
    ..onDispose(refresh.dispose);

  final GlobalKey<NavigatorState> rootKey = GlobalKey<NavigatorState>();

  return GoRouter(
    navigatorKey: rootKey,
    initialLocation: Routes.explore,
    refreshListenable: refresh,
    redirect: (BuildContext context, GoRouterState state) {
      final AsyncValue<Object?> session = ref.read(authControllerProvider);
      // While the stored session is still being read, hold where we are rather
      // than bouncing someone to sign-in and back.
      if (session.isLoading) return null;

      final bool signedIn = session.value != null;
      final bool atSignIn = state.matchedLocation == Routes.signIn;
      if (!signedIn && !atSignIn) return Routes.signIn;
      if (signedIn && atSignIn) return Routes.explore;
      return null;
    },
    routes: <RouteBase>[
      GoRoute(
        path: Routes.signIn,
        builder: (BuildContext context, GoRouterState state) =>
            const SignInScreen(),
      ),
      StatefulShellRoute.indexedStack(
        builder: (
          BuildContext context,
          GoRouterState state,
          StatefulNavigationShell shell,
        ) => RootShell(navigationShell: shell),
        branches: <StatefulShellBranch>[
          StatefulShellBranch(
            routes: <RouteBase>[
              GoRoute(
                path: Routes.explore,
                builder: (BuildContext context, GoRouterState state) =>
                    const ExploreScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: <RouteBase>[
              GoRoute(
                path: Routes.feed,
                builder: (BuildContext context, GoRouterState state) =>
                    const FeedScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: <RouteBase>[
              GoRoute(
                path: Routes.activity,
                builder: (BuildContext context, GoRouterState state) =>
                    const ActivityScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: <RouteBase>[
              GoRoute(
                path: Routes.profile,
                builder: (BuildContext context, GoRouterState state) =>
                    const ProfileScreen(),
              ),
            ],
          ),
        ],
      ),
      GoRoute(
        path: Routes.countryPattern,
        parentNavigatorKey: rootKey,
        builder: (BuildContext context, GoRouterState state) =>
            CountryScreen(code: state.pathParameters['code']!),
      ),
      GoRoute(
        path: Routes.userPattern,
        parentNavigatorKey: rootKey,
        builder: (BuildContext context, GoRouterState state) =>
            ProfileScreen(userId: state.pathParameters['id']),
      ),
      GoRoute(
        path: Routes.settings,
        parentNavigatorKey: rootKey,
        builder: (BuildContext context, GoRouterState state) =>
            const SettingsScreen(),
      ),
      // Watch and create are full-screen and arrive from below: one is the
      // content opening, the other is a task starting. Neither belongs inside
      // a tab.
      GoRoute(
        path: Routes.postPattern,
        parentNavigatorKey: rootKey,
        pageBuilder: (BuildContext context, GoRouterState state) =>
            _verticalPage(
              state,
              WatchScreen(postId: state.pathParameters['id']!),
            ),
      ),
      GoRoute(
        path: Routes.create,
        parentNavigatorKey: rootKey,
        pageBuilder: (BuildContext context, GoRouterState state) =>
            _verticalPage(state, const CreateScreen()),
      ),
    ],
    errorBuilder: (BuildContext context, GoRouterState state) =>
        _RouteNotFound(location: state.uri.toString()),
  );
});

/// Rises from the bottom and fades in. The watch transition is the one the
/// product is judged on, so it is a little longer than a push and eases out.
CustomTransitionPage<void> _verticalPage(GoRouterState state, Widget child) =>
    CustomTransitionPage<void>(
      key: state.pageKey,
      transitionDuration: Motion.watch,
      reverseTransitionDuration: Motion.base,
      child: child,
      transitionsBuilder:
          (
            BuildContext context,
            Animation<double> animation,
            Animation<double> secondary,
            Widget child,
          ) {
            final Animation<double> eased = CurvedAnimation(
              parent: animation,
              curve: Motion.emphasis,
            );
            return FadeTransition(
              opacity: eased,
              child: SlideTransition(
                position: Tween<Offset>(
                  begin: const Offset(0, 0.06),
                  end: Offset.zero,
                ).animate(eased),
                child: child,
              ),
            );
          },
    );

class _RouteNotFound extends StatelessWidget {
  const _RouteNotFound({required this.location});

  final String location;

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(),
    body: Center(
      child: Padding(
        padding: const EdgeInsets.all(Insets.xxl),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            const Icon(Icons.explore_off_outlined, size: 28),
            const SizedBox(height: Insets.lg),
            Text('There is nothing at $location.', textAlign: TextAlign.center),
            const SizedBox(height: Insets.lg),
            TextButton(
              onPressed: () => context.go(Routes.explore),
              child: const Text('Back to the map'),
            ),
          ],
        ),
      ),
    ),
  );
}
