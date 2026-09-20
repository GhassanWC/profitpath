import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/config/app_config.dart';
import '../../core/theme/atlas_colors.dart';
import '../../core/theme/atlas_tokens.dart';
import '../../core/theme/atlas_typography.dart';
import '../../core/widgets/atlas_card.dart';
import '../../core/widgets/atlas_chip.dart';
import '../../core/widgets/country_flag.dart';
import '../../core/widgets/state_views.dart';
import '../../models/interest_profile.dart';
import '../../models/user.dart';
import '../../providers/app_providers.dart';
import '../../providers/session_providers.dart';
import '../explore/widgets/country_search_sheet.dart';

final interestProfileProvider = FutureProvider.family<InterestProfile, String>(
  (Ref ref, String userId) =>
      ref.watch(feedbackRepositoryProvider).profileFor(userId),
);

/// Settings.
///
/// Two things here are not boilerplate. The country field is a *product*
/// control, not a preference: it is what decides which posts can reach this
/// person, which is why it sits at the top with an explanation. And the
/// discovery section shows what the system has actually learned, in the same
/// words the ranking uses, with a button to delete it — a recommender a person
/// cannot see or clear is one they have to take on trust.
class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AtlasUser? user = ref.watch(currentUserProvider);
    final AppConfig config = ref.watch(appConfigProvider);

    if (user == null) {
      return const Scaffold(body: AtlasLoading());
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: ListView(
        padding: const EdgeInsets.only(bottom: Insets.xxxl),
        children: <Widget>[
          const SectionHeader('Where you are'),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: Insets.gutter),
            child: AtlasCard(
              onTap: () async {
                final String? code = await showCountrySearch(context);
                if (code == null) return;
                await ref
                    .read(authControllerProvider.notifier)
                    .updateProfile(user.copyWith(country: code));
              },
              child: Row(
                children: <Widget>[
                  if (user.country != null) ...<Widget>[
                    CountryFlag(user.country!, size: 24),
                    const SizedBox(width: Insets.md),
                  ],
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Text(
                          user.country == null
                              ? 'No country set'
                              : ref
                                        .watch(countryRegistryProvider)
                                        .value
                                        ?.resolve(user.country!)
                                        .name ??
                                    user.country!,
                          style: AtlasTypography.titleSmall,
                        ),
                        Text(
                          'Creators aim posts at countries. This is the one you '
                          'will be reached in. Atlas never asks for your location.',
                          style: AtlasTypography.caption,
                        ),
                      ],
                    ),
                  ),
                  const Icon(
                    Icons.chevron_right_rounded,
                    color: AtlasColors.inkFaint,
                  ),
                ],
              ),
            ),
          ),
          const SectionHeader('What discovery has learned'),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: Insets.gutter),
            child: _LearnedCard(userId: user.id),
          ),
          const SectionHeader('Account'),
          ListTile(
            leading: const Icon(Icons.logout_rounded),
            title: const Text('Sign out'),
            onTap: () async {
              await ref.read(authControllerProvider.notifier).signOut();
              if (context.mounted) context.pop();
            },
          ),
          ListTile(
            leading: const Icon(
              Icons.delete_forever_rounded,
              color: AtlasColors.danger,
            ),
            title: const Text(
              'Delete account',
              style: TextStyle(color: AtlasColors.danger),
            ),
            subtitle: const Text(
              'Your posts, comments and history go with it.',
            ),
            onTap: () => _deleteAccount(context, ref),
          ),
          const SectionHeader('About'),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: Insets.gutter),
            child: Text(
              config.isMock
                  ? 'Running on the bundled sample content. No network calls are made, '
                        'and no AI credentials exist in this app — every model call goes '
                        'through the Atlas backend when one is configured.'
                  : 'Connected to ${config.apiBaseUrl}.',
              style: AtlasTypography.caption,
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _deleteAccount(BuildContext context, WidgetRef ref) async {
    final bool confirmed =
        await showDialog<bool>(
          context: context,
          builder: (BuildContext context) => AlertDialog(
            title: const Text('Delete your account?'),
            content: const Text(
              'This removes your posts from every country you sent them to, along '
              'with your comments and everything discovery has learned. It cannot '
              'be undone.',
            ),
            actions: <Widget>[
              TextButton(
                onPressed: () => Navigator.of(context).pop(false),
                child: const Text('Keep my account'),
              ),
              TextButton(
                onPressed: () => Navigator.of(context).pop(true),
                child: const Text(
                  'Delete',
                  style: TextStyle(color: AtlasColors.danger),
                ),
              ),
            ],
          ),
        ) ??
        false;
    if (!confirmed) return;
    await ref.read(authControllerProvider.notifier).deleteAccount();
    if (context.mounted) context.pop();
  }
}

class _LearnedCard extends ConsumerWidget {
  const _LearnedCard({required this.userId});

  final String userId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AsyncValue<InterestProfile> profile = ref.watch(
      interestProfileProvider(userId),
    );

    return AtlasCard(
      child: switch (profile) {
        AsyncData<InterestProfile>(value: final InterestProfile data) =>
          _Learned(
            profile: data,
            onReset: () async {
              await ref.read(feedbackRepositoryProvider).reset(userId);
              ref.invalidate(interestProfileProvider(userId));
            },
          ),
        AsyncError<InterestProfile>(error: final Object error) =>
          AtlasErrorView(error: error, compact: true),
        _ => const AtlasLoading(compact: true),
      },
    );
  }
}

class _Learned extends StatelessWidget {
  const _Learned({required this.profile, required this.onReset});

  final InterestProfile profile;
  final VoidCallback onReset;

  @override
  Widget build(BuildContext context) {
    final List<MapEntry<String, double>> top = profile.topFacets(limit: 10);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Text(
          top.isEmpty
              ? 'Nothing yet. Watching and skipping teaches it what you are after — '
                    'and a skip only counts against the specific thing you skipped, '
                    'not the whole category.'
              : 'Built from what you watched, saved and skipped. A skip is a weak '
                    'signal on purpose.',
          style: AtlasTypography.caption,
        ),
        if (top.isNotEmpty) ...<Widget>[
          const SizedBox(height: Insets.lg),
          Wrap(
            spacing: Insets.sm,
            runSpacing: Insets.sm,
            children: <Widget>[
              for (final MapEntry<String, double> entry in top)
                AtlasChip(
                  label: _readable(entry.key),
                  dense: true,
                  dotColor: entry.value >= 0
                      ? AtlasColors.positive
                      : AtlasColors.danger,
                ),
            ],
          ),
          const SizedBox(height: Insets.lg),
          TextButton(
            onPressed: onReset,
            child: Text(
              'Forget all of this',
              style: AtlasTypography.caption.copyWith(
                color: AtlasColors.danger,
              ),
            ),
          ),
        ],
      ],
    );
  }

  /// `sub:travel/luxury-hotels` reads as `Travel · Luxury hotels`.
  static String _readable(String facet) {
    final List<String> parts = facet.split(':');
    if (parts.length < 2) return facet;
    final String value = parts[1].replaceAll('/', ' · ').replaceAll('-', ' ');
    return value.isEmpty
        ? facet
        : '${value[0].toUpperCase()}${value.substring(1)}';
  }
}
