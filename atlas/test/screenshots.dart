import 'package:atlas/app.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/fonts.dart';
import 'support/harness.dart';

/// Captures each screen to `screenshots/`.
///
/// Not named `*_test.dart` on purpose: it writes files and asserts nothing, so
/// it is a tool rather than a test and `flutter test` leaves it alone. Run it
/// deliberately:
///
///     flutter test --update-goldens test/screenshots.dart
void main() {
  setUpAll(loadAppFonts);

  Future<void> shot(WidgetTester tester, String name) => expectLater(
    find.byType(MaterialApp),
    matchesGoldenFile('../screenshots/$name.png'),
  );

  Future<void> boot(WidgetTester tester) async {
    useInMemoryPreferences();
    useScreen(tester, const Size(430, 932));
    await tester.pumpWidget(
      ProviderScope(overrides: testOverrides(), child: const AtlasApp()),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));
  }

  /// Several frames rather than one long one: an async provider resolving on a
  /// microtask needs the frame after the one that started it, and a capture a
  /// frame early is a picture of a loading state.
  Future<void> settle(WidgetTester tester) async {
    for (int i = 0; i < 8; i++) {
      await tester.pump(const Duration(milliseconds: 150));
    }
  }

  Future<void> signIn(WidgetTester tester) async {
    await tester.tap(find.text('Continue with Google'));
    await tester.pump();
    await tester.pump(const Duration(seconds: 1));
    await settle(tester);
  }

  testWidgets('01 sign in', (WidgetTester tester) async {
    await boot(tester);
    await shot(tester, '01-sign-in');
  });

  testWidgets('02 explore', (WidgetTester tester) async {
    await boot(tester);
    await signIn(tester);
    await settle(tester);
    await shot(tester, '02-explore');
  });

  testWidgets('03 explore, country chosen', (WidgetTester tester) async {
    await boot(tester);
    await signIn(tester);
    await settle(tester);
    await tester.tap(find.text('Japan').first);
    await settle(tester);
    await shot(tester, '03-explore-country-selected');
  });

  testWidgets('04 country page', (WidgetTester tester) async {
    await boot(tester);
    await signIn(tester);
    await settle(tester);
    await tester.tap(find.text('Japan').first);
    await settle(tester);
    await tester.tap(find.text('See what is here'));
    await settle(tester);
    await shot(tester, '04-country-japan');
  });

  testWidgets('05 feed', (WidgetTester tester) async {
    await boot(tester);
    await signIn(tester);
    await tester.tap(find.text('Feed'));
    await settle(tester);
    await shot(tester, '05-feed-preview-card');
  });

  testWidgets('06 feed, mid skip', (WidgetTester tester) async {
    await boot(tester);
    await signIn(tester);
    await tester.tap(find.text('Feed'));
    await settle(tester);
    await tester.drag(find.text('Watch').last, const Offset(-150, 0));
    await tester.pump();
    await shot(tester, '06-feed-skipping');
  });

  testWidgets('07 what an AI preview is', (WidgetTester tester) async {
    await boot(tester);
    await signIn(tester);
    await tester.tap(find.text('Feed'));
    await settle(tester);
    await tester.tap(find.text('AI PREVIEW').last);
    await settle(tester);
    await shot(tester, '07-ai-preview-explained');
  });

  testWidgets('08 watch', (WidgetTester tester) async {
    await boot(tester);
    await signIn(tester);
    await tester.tap(find.text('Feed'));
    await settle(tester);
    await tester.tap(find.text('Watch').last);
    await settle(tester);
    await shot(tester, '08-watch');

    // The AI's reading of the post, which is collapsed by default because the
    // viewer has already read the preview.
    await tester.tap(find.text('WHAT THE AI MADE OF THIS'));
    await settle(tester);
    await shot(tester, '08b-watch-ai-panel-open');
  });

  testWidgets('09 create: media', (WidgetTester tester) async {
    await boot(tester);
    await signIn(tester);
    final SemanticsHandle semantics = tester.ensureSemantics();
    await tester.tap(find.bySemanticsLabel('Create a post'));
    await settle(tester);
    await shot(tester, '09-create-1-media');
    semantics.dispose();
  });

  testWidgets('10 create: intent, countries, review', (
    WidgetTester tester,
  ) async {
    await boot(tester);
    await signIn(tester);
    final SemanticsHandle semantics = tester.ensureSemantics();
    await tester.tap(find.bySemanticsLabel('Create a post'));
    await settle(tester);

    await tester.tap(find.text('Write instead'));
    await tester.pump();
    await tester.enterText(
      find.byType(TextField).last,
      'Has anyone here done the Oman visa on arrival recently?',
    );
    await tester.pump();
    await tester.tap(find.text('Continue'));
    await settle(tester);
    await shot(tester, '10-create-2-intent');

    await tester.enterText(
      find.byType(TextField).first,
      'I want people who have actually done this recently to tell me how it went.',
    );
    await tester.pump();
    await tester.tap(find.text('Continue'));
    await settle(tester);
    await tester.enterText(find.byType(TextField).first, 'Oman');
    await tester.pump();
    await tester.tap(find.widgetWithText(ListTile, 'Oman'));
    await tester.pump();
    await tester.enterText(find.byType(TextField).first, 'Japan');
    await tester.pump();
    await tester.tap(find.widgetWithText(ListTile, 'Japan'));
    await settle(tester);
    await shot(tester, '11-create-3-countries');

    await tester.tap(find.text('Continue'));
    await settle(tester);
    await shot(tester, '12-create-4-ai-review');

    await tester.scrollUntilVisible(
      find.text('THE PREVIEW PEOPLE WILL READ'),
      280,
      scrollable: find.byType(Scrollable).first,
    );
    await settle(tester);
    await shot(tester, '13-create-4-preview-approval');

    await tester.tap(find.text('Publish'));
    await settle(tester);
    await shot(tester, '14-published');
    semantics.dispose();
  });

  testWidgets('15 activity', (WidgetTester tester) async {
    await boot(tester);
    await signIn(tester);
    await tester.tap(find.text('Activity'));
    await settle(tester);
    await shot(tester, '15-activity');
  });

  testWidgets('16 profile', (WidgetTester tester) async {
    await boot(tester);
    await signIn(tester);
    await tester.tap(find.text('You'));
    await settle(tester);
    await shot(tester, '16-profile-reach-map');
  });

  testWidgets('17 settings', (WidgetTester tester) async {
    await boot(tester);
    await signIn(tester);
    await tester.tap(find.text('You'));
    await settle(tester);
    await tester.tap(find.byIcon(Icons.settings_outlined));
    await settle(tester);
    await shot(tester, '17-settings-what-was-learned');
  });
}
