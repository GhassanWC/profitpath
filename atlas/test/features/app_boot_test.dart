import 'package:atlas/app.dart';
import 'package:atlas/core/widgets/atlas_button.dart';
import 'package:atlas/features/feed/widgets/ai_preview_card.dart';
import 'package:atlas/features/map/widgets/world_map.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/harness.dart';

/// Does the thing actually run?
///
/// This boots the real app — real router, real theme, real repositories over
/// the bundled sample content — signs in, and walks the product's loop. It is
/// the test that would catch a wiring mistake no unit test can see.
void main() {
  Future<void> boot(WidgetTester tester) async {
    useInMemoryPreferences();
    await tester.binding.setSurfaceSize(const Size(430, 932));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    await tester.pumpWidget(
      ProviderScope(overrides: testOverrides(), child: const AtlasApp()),
    );
    // Restoring the stored session, then landing on sign-in.
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));
  }

  Future<void> signIn(WidgetTester tester) async {
    await tester.tap(find.text('Continue with Google'));
    await tester.pump();
    await tester.pump(const Duration(seconds: 1));
    await tester.pump(const Duration(seconds: 1));
  }

  testWidgets('opens on sign-in and says what the product is', (
    WidgetTester tester,
  ) async {
    await boot(tester);

    expect(find.text('Atlas'), findsOneWidget);
    expect(
      find.textContaining('Creators choose where their work is seen'),
      findsOneWidget,
    );
    expect(find.text('Continue with Apple'), findsOneWidget);
    // The promise the product makes about location, on the first screen.
    expect(find.textContaining('never needs your location'), findsOneWidget);
  });

  testWidgets('signing in lands on the map, with countries lit up', (
    WidgetTester tester,
  ) async {
    await boot(tester);
    await signIn(tester);

    expect(find.byType(WorldMap), findsOneWidget);
    expect(find.text('Content, and where it was meant to go'), findsOneWidget);
    expect(find.text('WHERE THINGS ARE HAPPENING'), findsOneWidget);
    // Real activity, over the seeded content.
    expect(find.text('Japan'), findsWidgets);
  });

  testWidgets('the feed shows one preview and a decision', (
    WidgetTester tester,
  ) async {
    await boot(tester);
    await signIn(tester);

    await tester.tap(find.text('Feed'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 500));

    expect(find.byType(AiPreviewCard), findsWidgets);
    expect(find.text('Aimed at you'), findsOneWidget);
    expect(find.text('Watch'), findsWidgets);
    expect(find.text('Skip'), findsWidgets);
    expect(
      find.textContaining('Skipping costs nothing'),
      findsOneWidget,
      reason: 'the product states what a skip means, on the screen where it happens',
    );
  });

  testWidgets('every tab opens', (WidgetTester tester) async {
    await boot(tester);
    await signIn(tester);

    for (final (String tab, String marker) in <(String, String)>[
      ('Activity', 'Activity'),
      ('You', 'CONTENT REACH'),
      ('Explore', 'Content, and where it was meant to go'),
    ]) {
      await tester.tap(find.text(tab));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 500));
      expect(find.text(marker), findsWidgets, reason: 'the $tab tab');
    }
  });

  testWidgets('the composer opens from the centre button', (
    WidgetTester tester,
  ) async {
    await boot(tester);
    await signIn(tester);

    // By its accessibility label rather than its icon: the zoom control on the
    // map uses the same glyph, and a screen reader has to tell them apart too.
    final SemanticsHandle semantics = tester.ensureSemantics();
    await tester.tap(find.bySemanticsLabel('Create a post'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 600));

    expect(find.text('What are you posting?'), findsOneWidget);
    expect(find.text('Record a video'), findsOneWidget);
    expect(find.text('Write instead'), findsOneWidget);
    semantics.dispose();
  });

  testWidgets('a post can be written, targeted and published', (
    WidgetTester tester,
  ) async {
    await boot(tester);
    await signIn(tester);

    final SemanticsHandle semantics = tester.ensureSemantics();
    await tester.tap(find.bySemanticsLabel('Create a post'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 600));

    Future<void> advance() async {
      await tester.tap(find.text('Continue'));
      await tester.pump();
      await tester.pump(const Duration(seconds: 1));
    }

    await tester.tap(find.text('Write instead'));
    await tester.pump();
    await tester.enterText(
      find.byType(TextField).last,
      'Has anyone here done the Oman visa on arrival recently?',
    );
    await tester.pump();
    await advance();

    expect(find.text('What do you want this to achieve?'), findsOneWidget);
    await tester.enterText(
      find.byType(TextField).first,
      'I want people who have actually done this recently to tell me how it went.',
    );
    await tester.pump();
    await advance();

    expect(find.text('Where should people see it?'), findsOneWidget);
    await tester.enterText(find.byType(TextField).first, 'Oman');
    await tester.pump();
    // `find.text` also matches the search field's own contents, so target the
    // row rather than the word.
    await tester.tap(find.widgetWithText(ListTile, 'Oman'));
    await tester.pump();
    expect(find.text('Going to 1 country'), findsOneWidget);
    await advance();

    // The review step: analysis has run and the creator can act on it.
    expect(find.text('What the AI made of it'), findsOneWidget);
    expect(find.text('AI CONTENT PROFILE'), findsOneWidget);

    // The card a viewer will actually meet is further down the review step.
    await tester.scrollUntilVisible(
      find.text('THE PREVIEW PEOPLE WILL READ'),
      280,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.byType(AiPreviewCard), findsOneWidget);

    final AtlasButton publish = tester.widget<AtlasButton>(
      find.widgetWithText(AtlasButton, 'Publish'),
    );
    expect(
      publish.onPressed,
      isNotNull,
      reason: 'an honest preview must be publishable',
    );

    await tester.tap(find.text('Publish'));
    await tester.pump();
    await tester.pump(const Duration(seconds: 2));

    expect(find.text('It is on its way'), findsOneWidget);
    semantics.dispose();
  });
}
