import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../models/post.dart';
import '../../providers/app_providers.dart';
import '../../providers/session_providers.dart';

/// Posts by one creator. Includes drafts when the viewer is that creator.
final profilePostsProvider = FutureProvider.family<List<Post>, String>((
  Ref ref,
  String userId,
) {
  final bool isMine = ref.watch(viewerIdProvider) == userId;
  return ref
      .watch(postRepositoryProvider)
      .byCreator(userId, includeUnpublished: isMine);
});

final savedPostsProvider = FutureProvider.family<List<Post>, String>(
  (Ref ref, String userId) => ref.watch(postRepositoryProvider).saved(userId),
);

/// Which countries a creator has sent content to, and how much.
final contentReachProvider = FutureProvider.family<Map<String, int>, String>(
  (Ref ref, String userId) =>
      ref.watch(userRepositoryProvider).contentReach(userId),
);

final isFollowingProvider = FutureProvider.family<bool, String>((
  Ref ref,
  String userId,
) {
  final String viewerId = ref.watch(viewerIdProvider);
  if (viewerId == userId) return Future<bool>.value(false);
  return ref
      .watch(userRepositoryProvider)
      .isFollowing(userId: viewerId, targetId: userId);
});
