import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/repositories/repositories.dart';
import '../../models/feedback_signal.dart';
import '../../models/post.dart';
import '../../providers/app_providers.dart';
import '../../providers/session_providers.dart';

/// What the feed is holding.
///
/// A queue rather than a page index: the top of the queue is the card on
/// screen, and skipping is a pop. That is what makes a skip instant — there is
/// no fetch, no page turn and no index arithmetic between the tap and the next
/// card, which is already built underneath.
final class FeedState {
  const FeedState({
    this.queue = const <Post>[],
    this.loadingMore = false,
    this.exhausted = false,
  });

  final List<Post> queue;
  final bool loadingMore;

  /// True once the repository has nothing further for this viewer.
  final bool exhausted;

  Post? get current => queue.isEmpty ? null : queue.first;

  Post? get next => queue.length < 2 ? null : queue[1];

  bool get isEmpty => queue.isEmpty;

  FeedState copyWith({List<Post>? queue, bool? loadingMore, bool? exhausted}) =>
      FeedState(
        queue: queue ?? this.queue,
        loadingMore: loadingMore ?? this.loadingMore,
        exhausted: exhausted ?? this.exhausted,
      );

  FeedState advanced() =>
      queue.isEmpty ? this : copyWith(queue: queue.sublist(1));
}

final AsyncNotifierProvider<FeedController, FeedState> feedControllerProvider =
    AsyncNotifierProvider<FeedController, FeedState>(FeedController.new);

final class FeedController extends AsyncNotifier<FeedState> {
  final Set<String> _served = <String>{};

  static const int _pageSize = 12;

  /// Refill when the queue gets this short, so the next card is always ready.
  static const int _refillThreshold = 4;

  @override
  Future<FeedState> build() async {
    _served.clear();
    final List<Post> posts = await _fetch();
    return FeedState(queue: posts, exhausted: posts.isEmpty);
  }

  Future<List<Post>> _fetch() async {
    final List<Post> posts = await ref
        .read(postRepositoryProvider)
        .feed(
          viewerId: ref.read(viewerIdProvider),
          viewerCountry: ref.read(viewerCountryProvider),
          exclude: _served,
          limit: _pageSize,
        );
    _served.addAll(posts.map((Post p) => p.id));
    return posts;
  }

  /// Skip. Everything slow about this happens after the state has already
  /// changed: the card is gone before the signal is written.
  void skip(Post post, {Duration? dwell}) {
    final FeedState? current = state.value;
    if (current == null) return;
    state = AsyncValue<FeedState>.data(current.advanced());
    unawaited(_record(post, FeedbackKind.skip, dwell: dwell));
    _maybeRefill();
  }

  /// Watch. The card leaves the queue too — a decision has been made about it
  /// either way, and seeing the same preview again on the way back from the
  /// video would be strange.
  ///
  /// The watch *signal* is not recorded here. The watch screen owns it, so that
  /// a post opened from a country page or a profile counts exactly the same as
  /// one opened from the feed and nothing is ever counted twice.
  void watched(Post post, {Duration? dwell}) {
    final FeedState? current = state.value;
    if (current == null) return;
    state = AsyncValue<FeedState>.data(current.advanced());
    _maybeRefill();
  }

  /// Records that a preview was put in front of someone. An impression, so the
  /// watch rate has a denominator; it carries no judgement of its own.
  void impression(Post post) {
    unawaited(_record(post, FeedbackKind.previewSeen));
  }

  Future<void> refresh() async {
    _served.clear();
    state = const AsyncValue<FeedState>.loading();
    state = await AsyncValue.guard<FeedState>(() async {
      final List<Post> posts = await _fetch();
      return FeedState(queue: posts, exhausted: posts.isEmpty);
    });
  }

  void _maybeRefill() {
    final FeedState? current = state.value;
    if (current == null ||
        current.loadingMore ||
        current.exhausted ||
        current.queue.length > _refillThreshold) {
      return;
    }
    state = AsyncValue<FeedState>.data(current.copyWith(loadingMore: true));
    unawaited(() async {
      try {
        final List<Post> more = await _fetch();
        // The feed can be left, or the whole provider disposed, while a refill
        // is in flight. Touching state afterwards would throw.
        if (!ref.mounted) return;
        final FeedState? latest = state.value;
        if (latest == null) return;
        state = AsyncValue<FeedState>.data(
          latest.copyWith(
            queue: <Post>[...latest.queue, ...more],
            loadingMore: false,
            exhausted: more.isEmpty,
          ),
        );
      } on Object {
        if (!ref.mounted) return;
        final FeedState? latest = state.value;
        // A failed refill is not a failed feed: keep what is on screen and let
        // the next skip try again.
        if (latest != null) {
          state = AsyncValue<FeedState>.data(
            latest.copyWith(loadingMore: false),
          );
        }
      }
    }());
  }

  Future<void> _record(Post post, FeedbackKind kind, {Duration? dwell}) =>
      ref.recordSignal(post: post, kind: kind, previewDwell: dwell);
}

/// Writes one interaction.
///
/// Offered on both ref types so that the feed controller, the watch screen, the
/// country page and a comment sheet all record signals the same way, with the
/// same facets attached. There is exactly one place a [FeedbackSignal] is
/// built, which is what keeps the ranking inputs consistent.
extension SignalRecording on Ref {
  Future<void> recordSignal({
    required Post post,
    required FeedbackKind kind,
    FeedbackSurface surface = FeedbackSurface.feed,
    double? watchedFraction,
    Duration? previewDwell,
  }) => _record(
    repository: read(feedbackRepositoryProvider),
    viewerId: read(viewerIdProvider),
    post: post,
    kind: kind,
    surface: surface,
    watchedFraction: watchedFraction,
    previewDwell: previewDwell,
  );
}

extension WidgetSignalRecording on WidgetRef {
  Future<void> recordSignal({
    required Post post,
    required FeedbackKind kind,
    FeedbackSurface surface = FeedbackSurface.feed,
    double? watchedFraction,
    Duration? previewDwell,
  }) => _record(
    repository: read(feedbackRepositoryProvider),
    viewerId: read(viewerIdProvider),
    post: post,
    kind: kind,
    surface: surface,
    watchedFraction: watchedFraction,
    previewDwell: previewDwell,
  );
}

Future<void> _record({
  required FeedbackRepository repository,
  required String viewerId,
  required Post post,
  required FeedbackKind kind,
  required FeedbackSurface surface,
  double? watchedFraction,
  Duration? previewDwell,
}) => repository.record(
  FeedbackSignal.forPost(
    id: 'sig_${DateTime.now().microsecondsSinceEpoch}',
    userId: viewerId,
    post: post,
    kind: kind,
    surface: surface,
    watchedFraction: watchedFraction,
    previewDwell: previewDwell,
    createdAt: DateTime.now(),
  ),
);
