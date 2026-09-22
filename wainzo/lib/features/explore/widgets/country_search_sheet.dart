import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/wainzo_colors.dart';
import '../../../core/theme/wainzo_tokens.dart';
import '../../../core/theme/wainzo_typography.dart';
import '../../../core/widgets/country_flag.dart';
import '../../../core/widgets/state_views.dart';
import '../../../data/geo/country_registry.dart';
import '../../../models/country.dart';
import '../../../providers/app_providers.dart';

/// Find a country by name.
///
/// Returns the chosen ISO code, or null when dismissed.
Future<String?> showCountrySearch(BuildContext context) =>
    showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      backgroundColor: WainzoColors.surface,
      builder: (BuildContext context) => const _CountrySearchSheet(),
    );

class _CountrySearchSheet extends ConsumerStatefulWidget {
  const _CountrySearchSheet();

  @override
  ConsumerState<_CountrySearchSheet> createState() =>
      _CountrySearchSheetState();
}

class _CountrySearchSheetState extends ConsumerState<_CountrySearchSheet> {
  final TextEditingController _query = TextEditingController();

  @override
  void dispose() {
    _query.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final AsyncValue<CountryRegistry> registry = ref.watch(
      countryRegistryProvider,
    );

    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SizedBox(
        height: MediaQuery.sizeOf(context).height * 0.8,
        child: Column(
          children: <Widget>[
            Padding(
              padding: const EdgeInsets.fromLTRB(
                Insets.gutter,
                Insets.sm,
                Insets.gutter,
                Insets.lg,
              ),
              child: TextField(
                controller: _query,
                autofocus: true,
                textInputAction: TextInputAction.search,
                onChanged: (_) => setState(() {}),
                decoration: const InputDecoration(
                  hintText: 'Search countries',
                  prefixIcon: Icon(
                    Icons.search_rounded,
                    color: WainzoColors.inkFaint,
                  ),
                ),
              ),
            ),
            Expanded(
              child: switch (registry) {
                AsyncData<CountryRegistry>(value: final CountryRegistry data) =>
                  _Results(results: data.search(_query.text)),
                AsyncError<CountryRegistry>(error: final Object error) =>
                  WainzoErrorView(error: error),
                _ => const WainzoLoading(),
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _Results extends StatelessWidget {
  const _Results({required this.results});

  final List<Country> results;

  @override
  Widget build(BuildContext context) {
    if (results.isEmpty) {
      return const WainzoEmpty(
        title: 'No country by that name',
        body: 'Try the country’s English name, or its two-letter code.',
        icon: Icons.travel_explore_outlined,
      );
    }
    return ListView.builder(
      itemCount: results.length,
      itemBuilder: (BuildContext context, int index) {
        final Country country = results[index];
        return ListTile(
          onTap: () => Navigator.of(context).pop(country.code),
          leading: CountryFlag(country.code, size: 24),
          title: Text(country.name, style: WainzoTypography.body),
          subtitle: Text(country.subregion, style: WainzoTypography.caption),
          trailing: Text(country.code, style: WainzoTypography.overline),
        );
      },
    );
  }
}
