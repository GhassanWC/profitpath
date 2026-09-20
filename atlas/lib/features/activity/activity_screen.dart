import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/routing/app_routes.dart';
import '../../core/theme/atlas_colors.dart';
import '../../core/theme/atlas_tokens.dart';
import '../../core/theme/atlas_typography.dart';
import '../../core/utils/formatters.dart';
import '../../core/widgets/country_flag.dart';
import '../../core/widgets/state_views.dart';
import '../../models/app_notification.dart';
import '../../providers/app_providers.dart';
import '../../providers/session_providers.dart';

final notificationsProvider =
    FutureProvider.family<List<AppNotification>, String>(
      (Ref ref, String userId) =>
          ref.watch(notificationRepositoryProvider).forUser(userId),
    );

final unreadCountProvider = FutureProvider.family<int, String>(
  (Ref ref, String userId) =>
      ref.watch(notificationRepositoryProvider).unreadCount(userId),
);

/// What happened.
///
/// The kinds are ordered by what this product thinks is worth telling someone:
/// a post reaching a new country comes first, then someone watching it to the
/// end, and likes are near the bottom. On a network about distribution, "your
/// post reached Japan" is the news.
class ActivityScreen extends ConsumerWidget {
  const ActivityScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final String userId = ref.watch(viewerIdProvider);
    final AsyncValue<List<AppNotification>> notifications = ref.watch(
      notificationsProvider(userId),
    );

    return SafeArea(
      bottom: false,
      child: Column(
        children: <Widget>[
          Padding(
            padding: const EdgeInsets.fromLTRB(
              Insets.gutter,
              Insets.md,
              Insets.gutter,
              Insets.sm,
            ),
            child: Row(
              children: <Widget>[
                Expanded(
                  child: Text(
                    'Activity',
                    style: AtlasTypography.headline.copyWith(fontSize: 26),
                  ),
                ),
                TextButton(
                  onPressed: () async {
                    await ref
                        .read(notificationRepositoryProvider)
                        .markAllRead(userId);
                    ref
                      ..invalidate(notificationsProvider(userId))
                      ..invalidate(unreadCountProvider(userId));
                  },
                  child: Text('Mark all read', style: AtlasTypography.caption),
                ),
              ],
            ),
          ),
          Expanded(
            child: switch (notifications) {
              AsyncData<List<AppNotification>>(
                value: final List<AppNotification> items,
              ) =>
                items.isEmpty
                    ? const AtlasEmpty(
                        title: 'Nothing yet',
                        body:
                            'When someone watches, saves or replies to a post of yours — '
                            'or when it reaches somewhere new — it shows up here.',
                        icon: Icons.notifications_none_rounded,
                      )
                    : ListView.separated(
                        itemCount: items.length,
                        separatorBuilder: (BuildContext context, int index) =>
                            const Divider(
                              color: AtlasColors.hairline,
                              height: 1,
                            ),
                        itemBuilder: (BuildContext context, int index) =>
                            _NotificationTile(
                              notification: items[index],
                              onTap: () async {
                                await ref
                                    .read(notificationRepositoryProvider)
                                    .markRead(items[index].id);
                                ref
                                  ..invalidate(notificationsProvider(userId))
                                  ..invalidate(unreadCountProvider(userId));
                                if (!context.mounted) return;
                                final String? postId = items[index].postId;
                                final String? country =
                                    items[index].countryCode;
                                if (postId != null) {
                                  unawaited(context.push(Routes.post(postId)));
                                } else if (country != null) {
                                  unawaited(
                                    context.push(Routes.country(country)),
                                  );
                                }
                              },
                            ),
                      ),
              AsyncError<List<AppNotification>>(error: final Object error) =>
                AtlasErrorView(
                  error: error,
                  onRetry: () => ref.invalidate(notificationsProvider(userId)),
                ),
              _ => const AtlasLoading(),
            },
          ),
        ],
      ),
    );
  }
}

class _NotificationTile extends StatelessWidget {
  const _NotificationTile({required this.notification, required this.onTap});

  final AppNotification notification;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final (IconData icon, Color colour) = switch (notification.kind) {
      NotificationKind.reach => (Icons.public_rounded, AtlasColors.accent),
      NotificationKind.watched => (
        Icons.play_circle_outline_rounded,
        AtlasColors.accent,
      ),
      NotificationKind.saved => (
        Icons.bookmark_outline_rounded,
        AtlasColors.ink,
      ),
      NotificationKind.commented => (
        Icons.mode_comment_outlined,
        AtlasColors.ink,
      ),
      NotificationKind.followed => (
        Icons.person_add_alt_rounded,
        AtlasColors.ink,
      ),
      NotificationKind.shared => (Icons.ios_share_rounded, AtlasColors.ink),
      NotificationKind.liked => (
        Icons.favorite_border_rounded,
        AtlasColors.inkMuted,
      ),
      NotificationKind.analysisReady => (
        Icons.auto_awesome_outlined,
        AtlasColors.accent,
      ),
      NotificationKind.moderation => (
        Icons.shield_outlined,
        AtlasColors.inkMuted,
      ),
    };

    return Material(
      color: notification.read ? Colors.transparent : AtlasColors.accentSoft,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(
            horizontal: Insets.gutter,
            vertical: Insets.lg,
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Icon(icon, size: 20, color: colour),
              const SizedBox(width: Insets.lg),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Row(
                      children: <Widget>[
                        Expanded(
                          child: Text(
                            notification.title,
                            style: AtlasTypography.titleSmall,
                          ),
                        ),
                        if (notification.countryCode != null) ...<Widget>[
                          const SizedBox(width: Insets.sm),
                          CountryFlag(notification.countryCode!, size: 14),
                        ],
                        const SizedBox(width: Insets.sm),
                        Text(
                          Format.relative(notification.createdAt),
                          style: AtlasTypography.overline,
                        ),
                      ],
                    ),
                    if (notification.body.isNotEmpty) ...<Widget>[
                      const SizedBox(height: 3),
                      Text(notification.body, style: AtlasTypography.caption),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
