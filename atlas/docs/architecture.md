# Atlas — architecture

This document is the reasoning behind the code. The README says how to run it;
this says why it is shaped the way it is, and what has to be true before it
ships.

---

## 1. The hypothesis

Atlas exists to answer one question:

> Will people enjoy discovering content through an honest preview and
> geographic targeting, instead of through an algorithmic feed?

Everything is arranged to make that question answerable. A feature that does not
touch **country → intent → AI understanding → preview → watch/skip** is out of
the MVP, however obvious it looks. That is why there are no direct messages, no
stories, no follower leaderboard and no analytics dashboard in here.

The difference from a conventional network, stated as two pipelines:

```
Traditional                       Atlas
  post                              creator chooses geography
  → algorithm                       → creator states intent
  → algorithm decides who sees it   → AI understands the content
  → user watches                    → AI explains it to the viewer
                                    → viewer decides
                                    → watch / skip
```

The second pipeline has a person making a decision in it. The UI's job is to
make that decision cheap, informed and un-manipulated.

---

## 2. Layers

```
features/          widgets, screens, feature-local state
   ↓ (providers)
services/          ai · auth · media · moderation · ranking
data/repositories/ interfaces
   ↓
data/mock  |  data/remote
   ↓
MockBackend (in memory)  |  ApiClient (HTTP)
```

Rules the codebase keeps:

- **A screen never imports `data/mock` or `data/remote`.** It reads a provider
  typed as the interface. `lib/providers/app_providers.dart` is the single place
  that decides which implementation exists, from `AppConfig`.
- **The data layer throws `AtlasException` and nothing else.** Transport and
  parsing failures are translated at the boundary, so a screen renders a
  sentence rather than a stack trace. `humanMessageFor` is the one translator.
- **`core/` depends on nothing above it.** The map painter and the country
  poster live in `features/map/` rather than `core/widgets/` precisely because
  they need the geometry in `data/geo/`.
- **Nothing computes a number the backend should own.** Country activity is a
  repository call. The seeded daily counts in `MockBackend` are marked mock-only
  and are never derived in the UI.

State is Riverpod 3. `Provider` for dependencies, `FutureProvider` for reads,
`Notifier`/`AsyncNotifier` for anything with transitions. There are no
`StateProvider`s and no global mutable singletons.

---

## 3. The data model

`Post` is the centre of it. The fields that carry the product, rather than the
usual social-network ones:

| Field | Why it exists |
| --- | --- |
| `targetCountries` | The creator's decision. Empty means *everywhere* — a choice, not an omission (`isGlobal`). |
| `creatorIntent` | The creator's own words about what the post is for. The single most valuable input the model gets. |
| `profile` (`AiContentProfile`) | What the AI understood: category, subcategories, topics, type, intent, audience, language. A **proposal** until the creator approves it. |
| `preview` (`AiPreview`) | Headline, what it shows, why someone might care. What a viewer reads instead of the content. |
| `moderation` | A post is visible to strangers only while `approved`. |
| `metrics.watches` / `.skips` / `.completions` | Listed before likes, because these are the numbers the product runs on. |

**Vocabularies are extensible, not enums.** `ContentCategory` and `ContentType`
are value objects over a slug with a known set attached. A slug this build has
never seen arrives from the backend, is kept, and renders with a humanised
label; nothing in the UI switches on a specific category. Adding "Urban farming"
server-side requires no app release. (`test/models/post_test.dart` holds that
line.)

`Country` is keyed by ISO 3166-1 alpha-2 everywhere. Names are display strings.
Flags are derived from the code in Unicode regional indicators — there is no
flag asset to ship and no list to drift.

---

## 4. The AI boundary

```dart
abstract interface class AiService {
  Future<PostAnalysis> analyze(PostAnalysisRequest request);
  Future<AiContentProfile> analyzePost(PostAnalysisRequest request);
  Future<AiPreview> generatePreview(PostAnalysisRequest request, AiContentProfile profile);
  Future<(ContentCategory, List<String>)> generateCategories(PostAnalysisRequest request);
  Future<List<String>> generateAudience(PostAnalysisRequest request, AiContentProfile profile);
  Future<ContentType> generateIntent(PostAnalysisRequest request);
}
```

Two rules every implementation is held to.

**No credentials on the device.** `RemoteAiService` calls the Atlas backend,
which holds the provider key and signs the upstream request. There is no
configuration slot for a model key anywhere in this project, and adding one
would be a bug. The backend is also where a provider gets swapped, rate-limited
or A/B tested without an app release.

**The model proposes, the creator disposes.** Every field of a profile and a
preview is editable in the composer before publishing, and an edit sets
`editedByCreator` so the data layer can tell a model's guess from a person's
statement. The AI assists; it never silently changes what someone meant.

### The preview contract

A preview explains content. It does not sell it. In practice that means:

- say what the thing is, plainly, including its length;
- say who might care, as a possibility (`You may be interested if…`), never as
  a promise;
- no withheld payoff, no dare, no unverifiable superlative.

This is enforced in the app as well as in the prompt. `AiPreview.isHonest` runs
a clickbait check, and `ComposerController.publish` refuses while it fails,
naming what tripped it so the creator can reword it. The server re-runs the same
check — a client-side rule is a usability feature, not a control.

`MockAiService` is a keyword reader, not a model. It exists so the analysis
step, the honesty check, the editable profile and the facets ranking runs on are
all exercised for real before a provider is wired up. It is deliberately
conservative: given nothing it recognises, it files the post as `Other` with low
confidence rather than inventing a confident answer.

---

## 5. Discovery

### What is recorded

Every interaction becomes a `FeedbackSignal` carrying the **facets** it was
about, captured at the time:

```
creator:u_layla
category:travel
sub:travel/luxury-hotels
topic:budget-travel
type:informational
intent:discovery
lang:en
country:OM
```

Facets are at deliberately mixed specificity, which is what makes the next part
possible.

### What a skip means

A skip is information, not a verdict. It says "not this, for me, right now".

`InterestProfile.applying` moves the narrow facets at full weight and the broad
ones at a fifth of it (`broadNegativeDamping`). So skipping a luxury-hotel video
drops `sub:travel/luxury-hotels` hard and barely touches `category:travel` — and
the next travel post still gets shown. That is the brief's example, and it is
the first test in `test/models/interest_profile_test.dart`.

The weights are asymmetric on purpose: a save moves four times as far as a skip
moves back. Skipping is the cheapest action in the app and has to stay cheap to
stay honest — if it cost as much as a save, people would hesitate over it and
the signal would go to noise. Saying "not interested" explicitly costs far more,
because it was deliberate. Affinities decay with a three-week half-life, so an
old opinion never becomes a permanent one.

### How the feed is ordered

`RecommendationService` scores each eligible post on five terms:

| Term | Weight | Meaning |
| --- | --- | --- |
| `geo` | 1.00 | The creator named this viewer's country. The strongest signal in the system. |
| `interest` | 0.75 | The learned profile, squashed to −1..1. |
| `freshness` | 0.45 | Two-day half-life. Older posts stay reachable. |
| `honesty` | 0.35 | Completion rate against a prior. |
| `exploration` | 0.30 | A slice that is not optimised at all. |

What is *not* in that table is the point. **Likes are not an input.** A post with
no likes is not penalised (`test/services/recommendation_test.dart`). What
"quality" means here is whether the people who chose to watch stayed — which
measures whether the preview told the truth, not whether the post was popular.

Completion rate is blended toward a prior worth twelve watches, so a post with
three watches and one completion is not treated as a 33% post and buried before
anyone saw it. Exploration is scaled by `1 - |interest|`, so the unoptimised
slice shrinks as the system learns rather than staying a fixed tax.

Ranking reorders eligible posts. It never overrules *who is eligible* — that is
the creator's targeting, and it is not something a model gets a vote on.

The learned profile is visible to the person it is about, in Settings, in the
same words the ranking uses, with a button to delete it.

---

## 6. Safety

`ModerationService` is called on the publish path before anything reaches a
stranger, and on the comment path before a comment is stored. A post is only
visible to others while `moderation.isPubliclyVisible`.

`MockModerationService` is a placeholder and does not pretend otherwise — it is
not a classifier. What it does do is refuse the obvious cases outright rather
than letting them through as ordinary public content, and route anything
ambiguous to review instead of guessing. A rejection always carries a reason the
creator can act on; "your post was rejected" with no explanation is not a
moderation decision, it is a dead end.

Also present from the first version, because a public network is not shippable
without them: report post, report user, block user, delete post, delete account.
Blocking removes a creator from the blocker's eligible set at the repository
level, not just from the UI.

---

## 7. Authentication

`AuthService` covers email/password, Google and Apple. No screen imports a
vendor SDK, which is what lets the app run end to end before any of them is
wired up.

**Apple's rules shape the interface.** An iOS app offering any third-party
sign-in must also offer Sign in with Apple, so `signInWithApple` is not
optional on that platform. Apple returns a person's name and email only on the
*first* authorisation, and returns a private relay address when they choose to
hide theirs — so an implementation must persist whatever it gets the first time
and must never treat a missing display name as an error. `MockAuthService`
reproduces that behaviour so the code downstream copes the way it will in
production. Apple also requires that an app offering account creation offers
account deletion, which is why `deleteAccount` is on the interface and in
Settings.

To wire the real providers:

1. Add `google_sign_in` and `sign_in_with_apple`, and write one
   `RemoteAuthService implements AuthService`. Nothing else changes.
2. iOS: enable the *Sign in with Apple* capability, add the reversed client ID
   URL scheme for Google, and configure the associated domain if you offer
   email relay.
3. Android: add `google-services.json` and register the release SHA-1; Apple
   sign-in on Android goes through the web flow.
4. Point `ATLAS_API_BASE_URL` at the backend that verifies the identity token
   and mints the session `ApiClient` sends as a bearer.

---

## 8. Design

Dark-first is a product decision, not a default. The map and full-bleed media
are composed against a near-black ground, and a light variant would change what
the map *means*: a lit country on a pale map reads as a stain. The theme is
installed in both `ThemeData` slots so a device set to light mode still gets the
designed product.

- **One accent.** Amber — the colour of a place lit up on a night map. It marks
  the primary action, the active tab, activity on the map and the selected
  country. Category colours exist but only ever appear as a 6px dot.
- **No shadows.** A surface is told apart from the ground by a hairline and a
  tint. On near-black, a Material shadow is a smudge.
- **Rounding steps with the shape.** A chip's corner and a card's corner are
  different numbers (`Radii`), and full rounding is reserved for shapes that are
  pills by nature — never a rectangular button or card.
- **Two faces, different jobs.** Inter carries the interface. Instrument Serif is
  reserved for the AI's own sentences, country names and the figure that leads a
  screen. Rarity is what makes it read as written rather than generated.
- **Motion is two numbers.** `Motion.skip` (170ms) has to feel like nothing
  happened; `Motion.watch` (420ms) has to feel like the card opened. Those two
  are the feel of the product.

### The map

Vector, from a 111 KB asset: no tile server, no API key, no third-party map SDK
whose styling the product would have to negotiate with. That is what makes it
ownable — a country can glow because it holds content, rather than because a
tile provider permits an overlay.

The projection is **Equal Earth**, not Mercator. Mercator would make Greenland
the largest thing on a map whose whole point is "content from here, aimed
there", inflating the north and shrinking most of the countries people in this
app are posting from and to. Everything works in **map space** (y 0..1, x
0..2.0547, uniform units), so one scale factor draws the world and a hairline
border stays a hairline at every zoom.

Taps hit-test against the same `Path` objects that are drawn, smallest-bounds
first, so a country sitting inside another's bounding box — Lesotho, Vatican
City — wins the tap it deserves.

### Cover art

A post without media does not get a grey box with a play triangle. Its cover is
its own country's coastline drawn as contour rings (`CountryPoster`), tinted by
category. Unique per country, free of licensing, weightless, resolution-
independent, and it says the one thing the product is about.

---

## 9. Shipping

Neither store build is possible from this repository as it stands — the Android
and iOS SDKs are not here. Beyond installing those:

- [ ] Signing config for both platforms (`android/app/build.gradle.kts` still
      signs release with the debug key).
- [ ] App icons and launch screens (currently the Flutter defaults).
- [ ] A real `AuthService` (§7).
- [ ] A moderation provider behind `ModerationService` (§6).
- [ ] An upload path for media. The composer hands the local file path to the
      repository; a backend needs the file uploaded first and the returned URL
      stored in `mediaUrl`.
- [ ] A privacy policy covering camera, microphone and photo library, and the
      App Store privacy questionnaire. Location is not collected, which is worth
      saying explicitly.
- [ ] Replace the bundled placeholder reels, which are development scaffolding.
- [ ] Crash reporting and a minimal analytics path for the one question in §1.

## 10. What comes next

In order, and no further than the loop requires:

1. **Backend.** Auth, storage, posts, signals. The interfaces exist; nothing
   above `data/` changes.
2. **Real model behind `AiService`**, with the preview contract as the system
   prompt and the honesty check re-run server side.
3. **Ranking server side**, reading the same facets. The on-device scorer stays
   as the offline fallback and as the readable definition of intent.
4. **Cities and regions.** `Post.targetCities` is already in the model and
   unused; the country picker is the surface that grows.
5. **Creator feedback.** "Your preview was watched 40% of the time it was shown"
   is the most useful thing this product could tell a creator, and it falls out
   of `PostMetrics.watchRate` — which is why that field exists already.
