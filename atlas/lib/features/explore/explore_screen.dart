import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/routing/app_routes.dart';
import '../../core/theme/atlas_colors.dart';
import '../../core/theme/atlas_tokens.dart';
import '../../core/theme/atlas_typography.dart';
import '../../core/utils/formatters.dart';
import '../../core/widgets/atlas_button.dart';
import '../../core/widgets/atlas_chip.dart';
import '../../core/widgets/country_flag.dart';
import '../../core/widgets/state_views.dart';
import '../../data/geo/country_registry.dart';
import '../../data/geo/world_outlines.dart';
import '../../models/country.dart';
import '../../providers/app_providers.dart';
import '../map/map_camera.dart';
import '../map/widgets/world_map.dart';
import 'explore_providers.dart';
import 'widgets/country_search_sheet.dart';
import 'widgets/trending_country_tile.dart';

/// The home of the product: a world you can look at.
///
/// The map is the whole screen, not a widget inside a dashboard, because the
/// first thing this app has to say is "content has a where". The list of
/// countries sits over it on a sheet that can be pulled up when someone wants
/// to read rather than look.
class ExploreScreen extends ConsumerStatefulWidget {
  const ExploreScreen({super.key});

  @override
  ConsumerState<ExploreScreen> createState() => _ExploreScreenState();
}

class _ExploreScreenState extends ConsumerState<ExploreScreen>
    with SingleTickerProviderStateMixin {
  late final MapCameraController _camera = MapCameraController(vsync: this);
  Size _viewport = Size.zero;

  @override
  void dispose() {
    _camera.dispose();
    super.dispose();
  }

  void _select(String? code, {bool fly = true}) {
    ref.read(selectedCountryProvider.notifier).select(code);
    if (!fly || code == null) {
      if (code == null) {
        _camera.flyTo(MapCamera(), viewport: _viewport);
      }
      return;
    }
    final WorldOutlines? outlines = ref.read(worldOutlinesProvider).value;
    final CountryOutline? outline = outlines?[code];
    if (outline != null && !_viewport.isEmpty) {
      _camera.flyTo(
        MapCamera.framing(outline.bounds, _viewport),
        viewport: _viewport,
      );
    }
  }

  void _zoomBy(double factor) {
    if (_viewport.isEmpty) return;
    _camera.flyTo(
      _camera.camera.copyWith(
        zoom: (_camera.camera.zoom * factor).clamp(
          MapCamera.minZoom,
          MapCamera.maxZoom,
        ),
      ),
      viewport: _viewport,
      duration: Motion.base,
    );
  }

  @override
  Widget build(BuildContext context) {
    final AsyncValue<WorldOutlines> outlines = ref.watch(worldOutlinesProvider);
    final AsyncValue<CountryRegistry> registry = ref.watch(
      countryRegistryProvider,
    );
    final Map<String, int> heat = ref.watch(activityHeatProvider);
    final String? selected = ref.watch(selectedCountryProvider);

    return LayoutBuilder(
      builder: (BuildContext context, BoxConstraints constraints) {
        _viewport = constraints.biggest;
        return Stack(
          children: <Widget>[
            Positioned.fill(
              child: switch ((outlines, registry)) {
                (
                  AsyncData<WorldOutlines>(value: final WorldOutlines world),
                  _,
                ) =>
                  WorldMap(
                    outlines: world,
                    controller: _camera,
                    activity: heat,
                    selected: selected,
                    onSelected: _select,
                    labelFor: (String code) =>
                        registry.value?.resolve(code).name ?? code,
                  ),
                (AsyncError<WorldOutlines>(error: final Object error), _) =>
                  AtlasErrorView(
                    error: error,
                    onRetry: () => ref.invalidate(worldOutlinesProvider),
                  ),
                _ => const AtlasLoading(label: 'Drawing the world'),
              },
            ),
            const Positioned(top: 0, left: 0, right: 0, child: _TopScrim()),
            Positioned(
              top: 0,
              left: 0,
              right: 0,
              child: SafeArea(
                bottom: false,
                child: _Header(onSearch: _openSearch),
              ),
            ),
            Positioned(
              right: Insets.lg,
              bottom: constraints.maxHeight * 0.40,
              child: _ZoomControls(
                onIn: () => _zoomBy(1.8),
                onOut: () => _zoomBy(1 / 1.8),
                onReset: () => _select(null),
              ),
            ),
            _ExploreSheet(onCountry: _select),
          ],
        );
      },
    );
  }

  Future<void> _openSearch() async {
    final String? code = await showCountrySearch(context);
    if (code != null) _select(code);
  }
}

class _TopScrim extends StatelessWidget {
  const _TopScrim();

  @override
  Widget build(BuildContext context) => IgnorePointer(
    child: Container(
      height: 168,
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: <Color>[Color(0xCC06080C), Color(0x0006080C)],
        ),
      ),
    ),
  );
}

class _Header extends StatelessWidget {
  const _Header({required this.onSearch});

  final VoidCallback onSearch;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(
      Insets.gutter,
      Insets.md,
      Insets.gutter,
      0,
    ),
    child: Row(
      children: <Widget>[
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text(
                'Atlas',
                style: AtlasTypography.headline.copyWith(fontSize: 26),
              ),
              Text(
                'Content, and where it was meant to go',
                style: AtlasTypography.caption.copyWith(fontSize: 12.5),
              ),
            ],
          ),
        ),
        AtlasIconButton(
          icon: Icons.search_rounded,
          tooltip: 'Search countries',
          onPressed: onSearch,
        ),
      ],
    ),
  );
}

class _ZoomControls extends StatelessWidget {
  const _ZoomControls({
    required this.onIn,
    required this.onOut,
    required this.onReset,
  });

  final VoidCallback onIn;
  final VoidCallback onOut;
  final VoidCallback onReset;

  @override
  Widget build(BuildContext context) => Column(
    children: <Widget>[
      AtlasIconButton(
        icon: Icons.add_rounded,
        tooltip: 'Zoom in',
        onPressed: onIn,
      ),
      const SizedBox(height: Insets.sm),
      AtlasIconButton(
        icon: Icons.remove_rounded,
        tooltip: 'Zoom out',
        onPressed: onOut,
      ),
      const SizedBox(height: Insets.sm),
      AtlasIconButton(
        icon: Icons.public_rounded,
        tooltip: 'Show the whole world',
        onPressed: onReset,
      ),
    ],
  );
}

/// The sheet over the map. Shows the selected country when there is one, and
/// the trending list when there is not.
class _ExploreSheet extends ConsumerWidget {
  const _ExploreSheet({required this.onCountry});

  final void Function(String? code) onCountry;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final CountryActivity? selected = ref.watch(
      selectedCountryActivityProvider,
    );
    final String? selectedCode = ref.watch(selectedCountryProvider);
    final AsyncValue<List<CountryActivity>> activity = ref.watch(
      countryActivityProvider,
    );

    return DraggableScrollableSheet(
      initialChildSize: 0.32,
      minChildSize: 0.32,
      maxChildSize: 0.86,
      snap: true,
      snapSizes: const <double>[0.32, 0.86],
      builder: (BuildContext context, ScrollController controller) =>
          DecoratedBox(
            decoration: const BoxDecoration(
              color: AtlasColors.surface,
              borderRadius: BorderRadius.vertical(
                top: Radius.circular(Radii.xl),
              ),
              border: Border(
                top: BorderSide(color: AtlasColors.hairlineStrong),
              ),
            ),
            child: CustomScrollView(
              controller: controller,
              slivers: <Widget>[
                const SliverToBoxAdapter(child: _DragHandle()),
                if (selectedCode != null)
                  SliverToBoxAdapter(
                    child: _SelectedCountryPanel(
                      code: selectedCode,
                      activity: selected,
                      onClear: () => onCountry(null),
                    ),
                  ),
                SliverToBoxAdapter(
                  child: SectionHeader(
                    selectedCode == null
                        ? 'Where things are happening'
                        : 'Elsewhere right now',
                  ),
                ),
                switch (activity) {
                  AsyncData<List<CountryActivity>>(
                    value: final List<CountryActivity> data,
                  ) =>
                    _TrendingList(
                      countries: data
                          .where((CountryActivity c) => c.code != selectedCode)
                          .toList(),
                      selectedCode: selectedCode,
                      onCountry: onCountry,
                    ),
                  AsyncError<List<CountryActivity>>(
                    error: final Object error,
                  ) =>
                    SliverToBoxAdapter(
                      child: AtlasErrorView(
                        error: error,
                        compact: true,
                        onRetry: () => ref.invalidate(countryActivityProvider),
                      ),
                    ),
                  _ => const SliverToBoxAdapter(
                    child: AtlasLoading(compact: true),
                  ),
                },
                const SliverToBoxAdapter(child: SizedBox(height: Insets.xxxl)),
              ],
            ),
          ),
    );
  }
}

class _DragHandle extends StatelessWidget {
  const _DragHandle();

  @override
  Widget build(BuildContext context) => Center(
    child: Container(
      width: 38,
      height: 4,
      margin: const EdgeInsets.symmetric(vertical: Insets.md),
      decoration: BoxDecoration(
        color: AtlasColors.hairlineStrong,
        borderRadius: BorderRadius.circular(Radii.pill),
      ),
    ),
  );
}

class _TrendingList extends StatelessWidget {
  const _TrendingList({
    required this.countries,
    required this.selectedCode,
    required this.onCountry,
  });

  final List<CountryActivity> countries;
  final String? selectedCode;
  final void Function(String? code) onCountry;

  @override
  Widget build(BuildContext context) {
    if (countries.isEmpty) {
      return const SliverToBoxAdapter(
        child: AtlasEmpty(
          title: 'Nothing is moving yet',
          body: 'When creators start aiming posts at countries, they light up here.',
          icon: Icons.public_off_rounded,
        ),
      );
    }
    return SliverList.builder(
      itemCount: countries.length,
      itemBuilder: (BuildContext context, int index) => TrendingCountryTile(
        activity: countries[index],
        rank: index + 1,
        selected: countries[index].code == selectedCode,
        onTap: () => onCountry(countries[index].code),
      ),
    );
  }
}

/// What the map is looking at, with the one action that matters.
class _SelectedCountryPanel extends ConsumerWidget {
  const _SelectedCountryPanel({
    required this.code,
    required this.activity,
    required this.onClear,
  });

  final String code;
  final CountryActivity? activity;
  final VoidCallback onClear;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final Country? country =
        activity?.country ?? ref.watch(countryRegistryProvider).value?[code];
    final String name = country?.name ?? code;

    return Padding(
      padding: const EdgeInsets.fromLTRB(
        Insets.gutter,
        Insets.sm,
        Insets.gutter,
        Insets.lg,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            children: <Widget>[
              CountryFlag(code, size: 30),
              const SizedBox(width: Insets.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(name, style: AtlasTypography.headlineSmall),
                    Text(
                      activity == null
                          ? 'No posts aimed here yet'
                          : '${Format.compact(activity!.postCount)} posts available to you',
                      style: AtlasTypography.caption,
                    ),
                  ],
                ),
              ),
              AtlasIconButton(
                icon: Icons.close_rounded,
                tooltip: 'Clear selection',
                onPressed: onClear,
                size: 38,
                filled: false,
                color: AtlasColors.inkFaint,
              ),
            ],
          ),
          if (activity != null &&
              activity!.trendingTopics.isNotEmpty) ...<Widget>[
            const SizedBox(height: Insets.lg),
            Wrap(
              spacing: Insets.sm,
              runSpacing: Insets.sm,
              children: <Widget>[
                for (final String topic in activity!.trendingTopics.take(4))
                  AtlasChip(label: topic, dense: true),
              ],
            ),
          ],
          const SizedBox(height: Insets.lg),
          AtlasButton(
            label: 'See what is here',
            onPressed: () => context.push(Routes.country(code)),
            expand: true,
            trailingIcon: Icons.arrow_forward_rounded,
          ),
        ],
      ),
    );
  }
}
