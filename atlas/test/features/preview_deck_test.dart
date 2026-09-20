import 'package:atlas/features/feed/widgets/preview_deck.dart';
import 'package:atlas/models/post.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/harness.dart';
import '../support/posts.dart';

/// The core loop, as a widget test.
///
/// The claim being checked is the one the product lives or dies on: skipping is
/// instant. Not "fast" — instant, meaning the next card is on screen in the
/// same frame the decision was made, before any animation has run.
void main() {
  final List<Post> posts = <Post>[
    samplePost(id: 'p_first'),
    samplePost(id: 'p_second', headline: 'Tokyo before it wakes up'),
    samplePost(id: 'p_third', headline: 'Patagonia by bus'),
  ];

  testWidgets('skip puts the next preview up in the same frame', (
    WidgetTester tester,
  ) async {
    List<Post> queue = posts;
    final List<String> skipped = <String>[];

    await pumpAtlas(
      tester,
      StatefulBuilder(
        builder: (BuildContext context, StateSetter setState) => PreviewDeck(
          posts: queue,
          onWatch: (Post post, Duration dwell) {},
          onSkip: (Post post, Duration dwell) {
            skipped.add(post.id);
            setState(() => queue = queue.sublist(1));
          },
        ),
      ),
    );
    await tester.pump();

    expect(find.text('Traditional Omani halwa'), findsOneWidget);

    // The card underneath renders its own buttons; the live one is on top.
    await tester.tap(find.text('Skip').last);
    // Exactly one frame. No settle, no waiting for the exit animation.
    await tester.pump();

    expect(skipped, <String>['p_first']);
    expect(find.text('Tokyo before it wakes up'), findsWidgets);

    // Once the exit animation has finished, the skipped card is gone for good.
    await tester.pump(const Duration(milliseconds: 400));
    expect(find.text('Traditional Omani halwa'), findsNothing);
  });

  testWidgets('a left swipe skips too', (WidgetTester tester) async {
    List<Post> queue = posts;
    final List<String> skipped = <String>[];

    await pumpAtlas(
      tester,
      StatefulBuilder(
        builder: (BuildContext context, StateSetter setState) => PreviewDeck(
          posts: queue,
          onWatch: (Post post, Duration dwell) {},
          onSkip: (Post post, Duration dwell) {
            skipped.add(post.id);
            setState(() => queue = queue.sublist(1));
          },
        ),
      ),
    );
    await tester.pump();

    await tester.drag(
      find.text('Traditional Omani halwa').last,
      const Offset(-200, 0),
    );
    await tester.pump();

    expect(skipped, <String>['p_first']);
  });

  testWidgets('a short drag snaps back rather than skipping', (
    WidgetTester tester,
  ) async {
    final List<String> skipped = <String>[];

    await pumpAtlas(
      tester,
      PreviewDeck(
        posts: posts,
        onWatch: (Post post, Duration dwell) {},
        onSkip: (Post post, Duration dwell) => skipped.add(post.id),
      ),
    );
    await tester.pump();

    await tester.drag(
      find.text('Traditional Omani halwa').last,
      const Offset(-40, 0),
    );
    await tester.pumpAndSettle();

    expect(skipped, isEmpty);
    expect(find.text('Traditional Omani halwa'), findsOneWidget);
  });

  testWidgets('watch reports how long the preview was read for', (
    WidgetTester tester,
  ) async {
    Duration? dwell;

    await pumpAtlas(
      tester,
      PreviewDeck(
        posts: posts,
        onWatch: (Post post, Duration value) => dwell = value,
        onSkip: (Post post, Duration value) {},
      ),
    );
    await tester.pump();
    // Dwell is wall-clock, so this waits for real time rather than pumping the
    // test clock forward.
    await tester.runAsync(
      () => Future<void>.delayed(const Duration(milliseconds: 80)),
    );

    await tester.tap(find.text('Watch').last);
    await tester.pump();

    expect(dwell, isNotNull);
    expect(dwell!.inMilliseconds, greaterThanOrEqualTo(60));
  });

  testWidgets('the card says what the post is and why it might matter', (
    WidgetTester tester,
  ) async {
    await pumpAtlas(
      tester,
      PreviewDeck(
        posts: posts,
        onWatch: (Post post, Duration dwell) {},
        onSkip: (Post post, Duration dwell) {},
      ),
    );
    await tester.pump();

    expect(find.text('Traditional Omani halwa'), findsOneWidget);
    expect(find.text('WHY YOU MIGHT WATCH'), findsWidgets);
    expect(find.text('AI PREVIEW'), findsWidgets);
    expect(find.text('Watch'), findsWidgets);
    expect(find.text('Skip'), findsWidgets);
    // Why this post is in front of this person, printed on the card.
    expect(find.textContaining('aimed this at'), findsWidgets);
  });

  testWidgets('no like or view count appears on a preview', (
    WidgetTester tester,
  ) async {
    await pumpAtlas(
      tester,
      PreviewDeck(
        posts: posts,
        onWatch: (Post post, Duration dwell) {},
        onSkip: (Post post, Duration dwell) {},
      ),
    );
    await tester.pump();

    expect(find.byIcon(Icons.favorite_rounded), findsNothing);
    expect(find.byIcon(Icons.favorite_border_rounded), findsNothing);
    expect(find.byIcon(Icons.visibility_outlined), findsNothing);
  });
}
