import 'package:wainzo/data/repositories/repositories.dart';
import 'package:wainzo/features/create/composer_providers.dart';
import 'package:wainzo/models/post.dart';
import 'package:wainzo/models/taxonomy.dart';
import 'package:wainzo/providers/app_providers.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/harness.dart';

/// The creation half of the loop: choose, describe, target, review, publish.
void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late ProviderContainer container;

  setUp(() {
    useInMemoryPreferences();
    container = ProviderContainer.test(overrides: testOverrides());
  });

  ComposerController controller() => container.read(composerProvider.notifier);

  ComposerState state() => container.read(composerProvider);

  Future<void> fillIn({
    String caption = 'How Omani halwa is made, start to finish',
    String intent =
        'I want people in Japan to discover traditional Omani food.',
    List<String> countries = const <String>['JP', 'KR'],
  }) async {
    controller()
      ..useTextOnly()
      ..setCaption(caption)
      ..setIntent(intent);
    for (final String code in countries) {
      controller().toggleCountry(code);
    }
  }

  test('each step gates the next one', () async {
    expect(state().canContinue, isFalse, reason: 'nothing chosen yet');

    controller()
      ..useTextOnly()
      ..setCaption('A question about ferries');
    expect(state().canContinue, isTrue);

    await controller().next();
    expect(state().step, ComposerStep.intent);
    expect(state().canContinue, isFalse, reason: 'no purpose written yet');

    controller().setIntent(
      'I want people who have done this to tell me how it went.',
    );
    expect(state().canContinue, isTrue);
  });

  test('countries can be added, removed, and cleared to global', () async {
    controller()
      ..toggleCountry('jp')
      ..toggleCountry('KR')
      ..toggleCountry('GB');
    expect(state().targetCountries, <String>['JP', 'KR', 'GB']);
    expect(state().isGlobal, isFalse);

    controller().removeCountry('KR');
    expect(state().targetCountries, <String>['JP', 'GB']);

    controller().toggleCountry('JP');
    expect(state().targetCountries, <String>['GB']);

    controller().goGlobal();
    expect(state().targetCountries, isEmpty);
    expect(state().isGlobal, isTrue, reason: 'empty means everywhere');
  });

  test('analysis fills the profile and writes a preview', () async {
    await fillIn();
    await controller().analyze();

    final ComposerState after = state();
    expect(after.hasAnalysis, isTrue);
    expect(after.profile!.category, ContentCategory.food);
    expect(after.profile!.editedByCreator, isFalse);
    expect(after.preview!.headline, isNotEmpty);
    expect(after.preview!.isHonest, isTrue);
  });

  test('every AI field is the creator\'s to overrule', () async {
    await fillIn();
    await controller().analyze();

    controller()
      ..setCategory(ContentCategory.culture)
      ..setContentType(ContentType.personal)
      ..setPostIntent(ContentType.discussion)
      ..setTopics(<String>['Family recipes'])
      ..setAudience(<String>['People who cook'])
      ..editPreview(headline: 'My aunt makes halwa');

    final ComposerState after = state();
    expect(after.profile!.category, ContentCategory.culture);
    expect(after.profile!.contentType, ContentType.personal);
    expect(after.profile!.intent, ContentType.discussion);
    expect(after.profile!.topics, <String>['Family recipes']);
    expect(after.profile!.audience, <String>['People who cook']);
    expect(after.preview!.headline, 'My aunt makes halwa');

    // The distinction the data layer needs: this is now the creator's
    // statement, not the model's guess.
    expect(after.profile!.editedByCreator, isTrue);
    expect(after.preview!.editedByCreator, isTrue);
  });

  test('publishing sends the post to the countries that were chosen', () async {
    await fillIn(countries: <String>['JP', 'KR']);
    await controller().analyze();

    final String? id = await controller().publish();
    expect(id, isNotNull);

    final PostRepository posts = container.read(postRepositoryProvider);
    final Post published = await posts.byId(id!);

    expect(published.status, PostStatus.published);
    expect(published.moderation, ModerationStatus.approved);
    expect(published.targetCountries, <String>['JP', 'KR']);
    expect(published.targets('JP'), isTrue);
    expect(published.targets('GB'), isFalse);
    expect(published.hasAiAnalysis, isTrue);
    expect(
      published.creatorIntent,
      contains('discover traditional Omani food'),
    );

    // And it is now findable from the country the creator aimed at.
    final List<Post> inJapan = await posts.inCountry('JP');
    expect(inJapan.map((Post p) => p.id), contains(id));
  });

  test('a preview that fails the honesty check cannot be published', () async {
    await fillIn();
    await controller().analyze();
    controller().editPreview(headline: "You won't believe this halwa");

    expect(state().previewIsHonest, isFalse);
    // On the review step, "can continue" is "can publish".
    controller().goTo(ComposerStep.review);
    expect(state().canContinue, isFalse);

    final String? id = await controller().publish();
    expect(id, isNull);
    expect(state().error, isNotNull);
  });

  test('moderation refuses what it should, and says why', () async {
    await fillIn(
      caption: 'selling firearms, message me',
      intent: 'I want to sell firearms to people in the UK.',
    );
    await controller().analyze();

    final String? id = await controller().publish();
    expect(id, isNull);
    expect(state().error, isNotNull);
    expect(state().publishing, isFalse, reason: 'the button has to come back');
  });

  test('a draft is kept without being shown to anyone', () async {
    await fillIn();
    final String? id = await controller().saveDraft();
    expect(id, isNotNull);

    final PostRepository posts = container.read(postRepositoryProvider);
    final Post draft = await posts.byId(id!);
    expect(draft.status, PostStatus.draft);
    expect(draft.isVisibleToOthers, isFalse);

    final List<Post> inJapan = await posts.inCountry('JP');
    expect(inJapan.map((Post p) => p.id), isNot(contains(id)));
  });

  test('publishing changes what the map shows', () async {
    final PostRepository posts = container.read(postRepositoryProvider);
    final int before = (await posts.inCountry('SE')).length;

    await fillIn(countries: <String>['SE']);
    await controller().analyze();
    await controller().publish();

    expect((await posts.inCountry('SE')).length, before + 1);
    expect(container.read(mockBackendProvider).posts, isNotEmpty);
  });
}
