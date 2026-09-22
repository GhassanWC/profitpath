import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/wainzo_colors.dart';
import '../../../core/theme/wainzo_tokens.dart';
import '../../../core/theme/wainzo_typography.dart';
import '../../../core/widgets/wainzo_card.dart';
import '../../../core/widgets/wainzo_chip.dart';
import '../../../core/widgets/country_flag.dart';
import '../../../core/widgets/state_views.dart';
import '../../../data/geo/country_registry.dart';
import '../../../models/country.dart';
import '../../../providers/app_providers.dart';
import '../../../providers/session_providers.dart';
import '../composer_providers.dart';

/// Step three: where the post should be seen.
///
/// The product's central claim made into a control. Creators pick countries by
/// hand; "everywhere" is a deliberate choice that shows as the empty selection,
/// not a default someone falls into by not deciding.
class CountriesStep extends ConsumerStatefulWidget {
  const CountriesStep({super.key});

  @override
  ConsumerState<CountriesStep> createState() => _CountriesStepState();
}

class _CountriesStepState extends ConsumerState<CountriesStep> {
  final TextEditingController _query = TextEditingController();

  @override
  void dispose() {
    _query.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final ComposerState state = ref.watch(composerProvider);
    final ComposerController controller = ref.read(composerProvider.notifier);
    final AsyncValue<CountryRegistry> registry = ref.watch(
      countryRegistryProvider,
    );
    final String? home = ref.watch(viewerCountryProvider);

    return Column(
      children: <Widget>[
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: Insets.gutter),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              _GlobalToggle(
                isGlobal: state.isGlobal,
                onGlobal: controller.goGlobal,
              ),
              if (state.targetCountries.isNotEmpty) ...<Widget>[
                const SizedBox(height: Insets.lg),
                Text(
                  'TARGET COUNTRIES · ${state.targetCountries.length}',
                  style: WainzoTypography.overline,
                ),
                const SizedBox(height: Insets.sm),
                Wrap(
                  spacing: Insets.sm,
                  runSpacing: Insets.sm,
                  children: <Widget>[
                    for (final String code in state.targetCountries)
                      WainzoChip(
                        label: registry.value?.resolve(code).name ?? code,
                        leading: CountryFlag(code, size: 14),
                        onRemove: () => controller.removeCountry(code),
                        dense: true,
                      ),
                  ],
                ),
              ],
              const SizedBox(height: Insets.lg),
              TextField(
                controller: _query,
                onChanged: (_) => setState(() {}),
                decoration: const InputDecoration(
                  hintText: 'Search countries',
                  prefixIcon: Icon(
                    Icons.search_rounded,
                    color: WainzoColors.inkFaint,
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: Insets.md),
        Expanded(
          child: switch (registry) {
            AsyncData<CountryRegistry>(value: final CountryRegistry data) =>
              _CountryList(
                countries: data.search(_query.text, limit: 300),
                selected: state.targetCountries.toSet(),
                home: home,
                onToggle: controller.toggleCountry,
              ),
            AsyncError<CountryRegistry>(error: final Object error) =>
              WainzoErrorView(
                error: error,
                onRetry: () => ref.invalidate(countryRegistryProvider),
              ),
            _ => const WainzoLoading(),
          },
        ),
      ],
    );
  }
}

class _GlobalToggle extends StatelessWidget {
  const _GlobalToggle({required this.isGlobal, required this.onGlobal});

  final bool isGlobal;
  final VoidCallback onGlobal;

  @override
  Widget build(BuildContext context) => WainzoCard(
    onTap: isGlobal ? null : onGlobal,
    color: isGlobal ? WainzoColors.surfaceHigh : WainzoColors.surface,
    border: isGlobal ? WainzoColors.accentEdge : WainzoColors.hairline,
    child: Row(
      children: <Widget>[
        Icon(
          Icons.public_rounded,
          color: isGlobal ? WainzoColors.accent : WainzoColors.inkMuted,
          size: 22,
        ),
        const SizedBox(width: Insets.lg),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text('Everywhere', style: WainzoTypography.titleSmall),
              Text(
                isGlobal
                    ? 'Anyone, anywhere, can be shown this'
                    : 'Tap to clear your selection and go global',
                style: WainzoTypography.caption,
              ),
            ],
          ),
        ),
        if (isGlobal)
          const Icon(
            Icons.check_circle_rounded,
            color: WainzoColors.accent,
            size: 20,
          ),
      ],
    ),
  );
}

class _CountryList extends StatelessWidget {
  const _CountryList({
    required this.countries,
    required this.selected,
    required this.home,
    required this.onToggle,
  });

  final List<Country> countries;
  final Set<String> selected;
  final String? home;
  final void Function(String code) onToggle;

  @override
  Widget build(BuildContext context) {
    if (countries.isEmpty) {
      return const WainzoEmpty(
        title: 'No country by that name',
        body: 'Try the English name, or the two-letter code.',
        icon: Icons.travel_explore_outlined,
      );
    }
    return ListView.builder(
      padding: const EdgeInsets.only(bottom: Insets.xxxl),
      itemCount: countries.length,
      itemBuilder: (BuildContext context, int index) {
        final Country country = countries[index];
        final bool isSelected = selected.contains(country.code);
        return ListTile(
          onTap: () => onToggle(country.code),
          leading: CountryFlag(country.code, size: 22),
          title: Text(country.name, style: WainzoTypography.body),
          subtitle: Text(
            country.code == home ? 'Where you are' : country.subregion,
            style: WainzoTypography.caption,
          ),
          trailing: Icon(
            isSelected ? Icons.check_circle_rounded : Icons.circle_outlined,
            color: isSelected
                ? WainzoColors.accent
                : WainzoColors.hairlineStrong,
            size: 22,
          ),
        );
      },
    );
  }
}
