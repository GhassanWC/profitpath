import 'package:wainzo/data/repositories/repositories.dart';
import 'package:wainzo/features/feed/feed_providers.dart';
import 'package:wainzo/models/feedback_signal.dart';
import 'package:wainzo/models/interest_profile.dart';
import 'package:wainzo/models/post.dart';
import 'package:wainzo/providers/app_providers.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/harness.dart';

/// The viewing half of the loop, at the state level.
void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late ProviderContainer container;

  setUp(() {
    useInMemoryPreferences();
    container = ProviderContainer.test(overrides: testOverrides());
  });

  Future<FeedState> feed() => container.read(feedControllerProvider.future);

  FeedController controller() =>
      container.read(feedControllerProvider.notifier);

  test('the feed only offers posts aimed at where the viewer is', () async {
    final FeedState state = await feed();

    expect(state.queue, isNotEmpty);
    for (final Post post in state.queue) {
      expect(
        post.targets('OM'),
        isTrue,
        reason:
            '${post.id} is in an Omani viewer’s feed without being aimed there',
      );
      expect(post.isVisibleToOthers, isTrue);
      expect(
        post.creatorId,
        isNot('u_me'),
        reason: 'your own posts are not your feed',
      );
    }
  });

  test(
    'skipping is synchronous: the next card is current before anything awaits',
    () async {
      await feed();
      final FeedState before = container
          .read(feedControllerProvider)
          .requireValue;
      final Post first = before.current!;
      final Post second = before.next!;

      controller().skip(first);

      // No await between the call and this read.
      final FeedState after = container
          .read(feedControllerProvider)
          .requireValue;
      expect(after.current!.id, second.id);
      expect(after.queue.length, before.queue.length - 1);
    },
  );

  test('a skip is recorded with the facets it was about', () async {
    await feed();
    final Post first = container
        .read(feedControllerProvider)
        .requireValue
        .current!;

    controller().skip(first, dwell: const Duration(seconds: 3));
    await Future<void>.delayed(Duration.zero);

    final FeedbackRepository feedback = container.read(
      feedbackRepositoryProvider,
    );
    final List<FeedbackSignal> history = await feedback.history('u_me');
    final FeedbackSignal signal = history.firstWhere(
      (FeedbackSignal s) => s.kind == FeedbackKind.skip,
    );

    expect(signal.postId, first.id);
    expect(signal.previewDwell, const Duration(seconds: 3));
    expect(signal.facets, contains('category:${first.profile!.category.slug}'));
    expect(signal.facets.any((String f) => f.startsWith('sub:')), isTrue);
  });

  test('a skip teaches the profile without burying the category', () async {
    await feed();
    final Post first = container
        .read(feedControllerProvider)
        .requireValue
        .current!;
    final String category = 'category:${first.profile!.category.slug}';
    final String subcategory = FeedbackSignal.facetsOf(first)
        .firstWhere((String f) => f.startsWith('sub:'));

    controller().skip(first);
    await Future<void>.delayed(Duration.zero);

    final InterestProfile profile = await container
        .read(feedbackRepositoryProvider)
        .profileFor('u_me');
    final DateTime now = DateTime.now();

    expect(profile.affinities[subcategory]!.at(now), lessThan(0));
    expect(
      profile.affinities[category]!.at(now).abs(),
      lessThan(profile.affinities[subcategory]!.at(now).abs()),
    );
  });

  test(
    'watching removes the card but does not record the signal here',
    () async {
      // The watch screen owns that signal, so a post opened from a country page
      // counts exactly the same as one opened from the feed.
      await feed();
      final FeedState before = container
          .read(feedControllerProvider)
          .requireValue;
      final Post first = before.current!;

      controller().watched(first);
      await Future<void>.delayed(Duration.zero);

      expect(
        container.read(feedControllerProvider).requireValue.current!.id,
        isNot(first.id),
      );
      final List<FeedbackSignal> history = await container
          .read(feedbackRepositoryProvider)
          .history('u_me');
      expect(
        history.where((FeedbackSignal s) => s.kind == FeedbackKind.watch),
        isEmpty,
      );
    },
  );

  test('an impression is recorded without judging the post', () async {
    await feed();
    final Post first = container
        .read(feedControllerProvider)
        .requireValue
        .current!;

    controller().impression(first);
    await Future<void>.delayed(Duration.zero);

    final InterestProfile profile = await container
        .read(feedbackRepositoryProvider)
        .profileFor('u_me');
    expect(
      profile.affinities,
      isEmpty,
      reason: 'being shown something is not an opinion',
    );
  });

  test(
    'the queue refills as it empties, and ends rather than repeating',
    () async {
      await feed();
      final Set<String> seen = <String>{};

      for (int i = 0; i < 60; i++) {
        final FeedState state = container
            .read(feedControllerProvider)
            .requireValue;
        final Post? current = state.current;
        if (current == null) break;
        expect(
          seen.add(current.id),
          isTrue,
          reason: '${current.id} came round twice',
        );
        controller().skip(current);
        await Future<void>.delayed(Duration.zero);
      }

      expect(seen.length, greaterThan(8));
      expect(
        container.read(feedControllerProvider).requireValue.current,
        isNull,
      );
    },
  );
}
