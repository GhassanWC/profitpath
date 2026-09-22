import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../models/post.dart';
import '../../providers/app_providers.dart';

/// Everything aimed at one country. The argument is the ISO alpha-2 code,
/// optionally with a category slug after a slash — `JP` or `JP/travel`.
final countryPostsProvider = FutureProvider.family<List<Post>, String>((
  Ref ref,
  String key,
) {
  final List<String> parts = key.split('/');
  return ref
      .watch(postRepositoryProvider)
      .inCountry(parts.first, category: parts.length > 1 ? parts[1] : null);
});

final countryTopicsProvider = FutureProvider.family<List<String>, String>(
  (Ref ref, String code) =>
      ref.watch(countryRepositoryProvider).trendingTopics(code),
);
