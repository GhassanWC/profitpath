import 'package:atlas/app.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/harness.dart';

/// Walks every screen at three phone sizes and fails on any overflow.
///
/// Flutter reports a RenderFlex overflow as an exception during layout, so
/// "does this screen lay out cleanly on a small phone" is something a test can
/// answer — and answering it found four real clipping bugs that only showed up
/// below 700pt of height. The sizes are a small Android phone, an iPhone SE and
/// a large modern phone.
void main() {
  const Map<String, Size> phones = <String, Size>{
    'small (320x568)': Size(320, 568),
    'medium (375x667)': Size(375, 667),
    'large (430x932)': Size(430, 932),
  };

  phones.forEach((String label, Size size) {
    group('on a $label phone', () {
      Future<void> boot(WidgetTester tester) async {
        useInMemoryPreferences();
        useScreen(tester, size);
        await tester.pumpWidget(
          ProviderScope(overrides: testOverrides(), child: const AtlasApp()),
        );
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 200));
      }

      Future<void> signIn(WidgetTester tester) async {
        // On a short phone the third-party buttons are below the fold. The
        // list builds a little past the viewport, so the finder can match
        // something that is built but off screen — ensureVisible is what
        // actually brings it under the tap.
        await tester.scrollUntilVisible(
          find.text('Continue with Google'),
          180,
          scrollable: find.byType(Scrollable).first,
        );
        await tester.ensureVisible(find.text('Continue with Google'));
        await tester.pump();
        await tester.tap(find.text('Continue with Google'));
        await tester.pump();
        await tester.pump(const Duration(seconds: 1));
        await tester.pump(const Duration(seconds: 1));
      }

      Future<void> settle(WidgetTester tester) async {
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 800));
      }

      /// A list builds a little past its viewport, so a finder can match
      /// something that is built but off screen. Bring it under the finger
      /// before tapping it.
      Future<void> tapVisible(WidgetTester tester, Finder finder) async {
        await tester.ensureVisible(finder);
        await tester.pump();
        await tester.tap(finder);
      }

      Future<void> typeInto(
        WidgetTester tester,
        Finder finder,
        String text,
      ) async {
        await tester.scrollUntilVisible(
          finder,
          140,
          scrollable: find.byType(Scrollable).first,
        );
        await tester.ensureVisible(finder);
        await tester.pump();
        await tester.enterText(finder, text);
        await tester.pump();
      }

      testWidgets('sign in and the map', (WidgetTester tester) async {
        await boot(tester);
        await signIn(tester);
        expect(find.text('WHERE THINGS ARE HAPPENING'), findsOneWidget);
      });

      testWidgets('a country, opened from the map', (
        WidgetTester tester,
      ) async {
        await boot(tester);
        await signIn(tester);
        await tapVisible(tester, find.text('Japan').first);
        await settle(tester);
        await tapVisible(tester, find.text('See what is here'));
        await settle(tester);
        expect(find.text('Trending here'.toUpperCase()), findsOneWidget);
      });

      testWidgets('the feed, and a skip', (WidgetTester tester) async {
        await boot(tester);
        await signIn(tester);
        await tester.tap(find.text('Feed'));
        await settle(tester);
        await tester.tap(find.text('Skip').last);
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 400));
      });

      testWidgets('activity and profile', (WidgetTester tester) async {
        await boot(tester);
        await signIn(tester);
        await tester.tap(find.text('Activity'));
        await settle(tester);
        await tester.tap(find.text('You'));
        await settle(tester);
        expect(find.text('CONTENT REACH'), findsOneWidget);
      });

      testWidgets('the composer, all four steps', (WidgetTester tester) async {
        await boot(tester);
        await signIn(tester);

        final SemanticsHandle semantics = tester.ensureSemantics();
        await tester.tap(find.bySemanticsLabel('Create a post'));
        await settle(tester);

        await tapVisible(tester, find.text('Write instead'));
        await tester.pump();
        await typeInto(
          tester,
          find.byType(TextField).last,
          'Has anyone here done the Oman visa on arrival recently?',
        );
        await tester.tap(find.text('Continue'));
        await settle(tester);

        await typeInto(
          tester,
          find.byType(TextField).first,
          'I want people who have done this recently to tell me how it went.',
        );
        await tester.tap(find.text('Continue'));
        await settle(tester);

        await tester.tap(find.text('Continue'));
        await settle(tester);

        expect(find.text('AI CONTENT PROFILE'), findsOneWidget);
        semantics.dispose();
      });

      testWidgets('the watch screen', (WidgetTester tester) async {
        await boot(tester);
        await signIn(tester);
        await tester.tap(find.text('Feed'));
        await settle(tester);
        await tester.tap(find.text('Watch').last);
        await settle(tester);
        // The player cannot initialise without a platform implementation, so
        // what is under test here is the chrome around it laying out cleanly.
        expect(find.byIcon(Icons.arrow_back_rounded), findsWidgets);
      });
    });
  });
}
