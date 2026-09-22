# Atlas

> Creators choose where their content is seen. AI explains what it is. The viewer decides.

A map-based social network for iOS and Android, built in Flutter. It is not a
feed you fall into — it is a world you look at, and a series of small decisions
you make on purpose.

The whole product is one loop:

```
creator picks countries → states what the post is for → AI reads both →
post is filed and a preview is written → the preview reaches people in
those countries → they watch, or they skip → the skip teaches the system
something narrow, and the loop tightens
```

Everything in this project either serves that loop or stays out of the MVP.

## Run it

```bash
cd atlas
flutter pub get
flutter run
```

No backend, no API key, no signup: the app boots on bundled sample content —
twenty-four posts from thirteen countries, each with a hand-written AI profile
and preview — and every screen is reachable. Sign in with any of the three
buttons; the mock auth service accepts them all.

To point it at a real backend:

```bash
flutter run \
  --dart-define=ATLAS_BACKEND=remote \
  --dart-define=ATLAS_API_BASE_URL=https://api.example.com
```

That swaps every repository for its HTTP implementation. No widget changes.

## What is real, and what is standing in

| Real | Standing in |
| --- | --- |
| The map: vector, offline, 234 countries, own projection and hit-testing | — |
| The watch/skip loop, and the signals it writes | — |
| Ranking, including the skip asymmetry | Runs on device against the mock store |
| The composer, end to end, including the honesty check | — |
| The video player | Three bundled placeholder clips stand in for real footage |
| Content model, repositories, HTTP layer | The backend behind them |
| `AiService`, with the full request/response shape | `MockAiService`, a keyword reader, not a model |
| `ModerationService`, called on the publish path | `MockModerationService`, regex rules, not a classifier |
| `AuthService`, all three providers, session persistence | `MockAuthService`; no Google or Apple SDK is linked yet |

Nothing marked "standing in" is faked *around* — each one sits behind the
interface its real version will implement, and the call sites do not change.

## Structure

```
lib/
├── core/            theme · tokens · routing · network · geo · shared widgets
├── models/          post · user · country · taxonomy · ai profile · signals
├── data/
│   ├── geo/         the bundled map + country registry, and their parsers
│   ├── repositories/  the interfaces every screen talks to
│   ├── mock/        in-memory store, seeded content
│   └── remote/      the HTTP implementations of the same interfaces
├── services/        ai · auth · media · moderation · ranking
├── providers/       composition root, and the session
└── features/        explore · feed · watch · country · create · profile ·
                     activity · settings · auth · map · shell
```

Presentation never reaches past `data/repositories` and `services`. Swapping
the backend means writing new repositories.

## Design

Dark-first, one accent, two typefaces. The full reasoning is in
[`docs/architecture.md`](docs/architecture.md#design); the short version:

- **The map is the product**, so it gets the whole screen and the only
  saturated colour. Countries light up because they hold content.
- **Amber is the only accent.** It marks the primary action, the active tab and
  activity on the map. Nothing else.
- **A surface is told apart by a hairline and a tint, never a shadow** — on a
  near-black ground a shadow reads as a smudge.
- **Instrument Serif is reserved for the AI's own sentences** and for the figure
  that leads a screen. Inter carries everything else. Keeping the serif rare is
  what makes a preview read as something written rather than generated.
- **No like counts on a preview card.** The card answers "is this for me",
  not "is this popular".

## The assets are generated, not hand-maintained

```bash
cd tool
npm pack world-atlas@2 && npm pack world-countries@5 && tar xzf *.tgz
python3 build_map_assets.py countries-50m.json ../assets/data   # map + registry
python3 make_sample_clips.py ../assets/media                    # placeholder reels
```

`world_outlines.bin` is a purpose-built binary — 111 KB and one pass over a
byte buffer, against roughly 3 MB of GeoJSON and an object per coordinate.
The format is documented on `WorldOutlines`.

## Looking at it without a device

```bash
flutter test --update-goldens test/screenshots.dart
```

Writes every screen to `screenshots/` at 3x, with the real typefaces and the
platform emoji font loaded — `flutter test` otherwise draws every string in a
placeholder box font. The one thing it cannot show is video: `video_player` has
no implementation in a headless test, so the watch screen captures its chrome
around a loading state.

## Checks

```bash
flutter analyze   # clean
flutter test      # 109 tests
```

The suite is written against the product's claims rather than its code shape.
The ones worth reading first:

- `test/models/interest_profile_test.dart` — skipping luxury hotels must not
  bury travel. This is the product's discovery philosophy, as arithmetic.
- `test/services/recommendation_test.dart` — likes are not a ranking input, and
  a post with two watches is not judged on a two-watch completion rate.
- `test/features/preview_deck_test.dart` — the next preview is up in the same
  frame the decision was made.
- `test/features/app_boot_test.dart` — boots the real app, signs in, walks
  every tab, and writes and publishes a post through the UI.
- `test/features/layout_audit_test.dart` — walks every screen at three phone
  sizes and fails on any overflow. Writing it found six real clipping bugs
  below 700pt of height.
- `test/data/world_outlines_test.dart` — runs against the shipped asset, so the
  generator and the parser cannot drift apart.

## Before a store build

Both platforms need their SDKs, which this repository does not carry. Beyond
that, and covered in [`docs/architecture.md`](docs/architecture.md#shipping):
signing, a real `AuthService` (Sign in with Apple is not optional on iOS once
Google is offered), a moderation provider, and an upload path for media — the
composer currently hands the local file path straight to the repository.
