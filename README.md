# ProfitPath — Smart Pricing & Profit Roadmap (MVP)

> Tell us what you want to sell. We'll help you figure out how to sell it profitably.

## What's in this package

```
docs/01-architecture-analysis.md   Requirements review, architecture, formulas, models, phases
app/                               Angular 18 application (standalone components, Bootstrap 5)
  src/app/core/engine/             Framework-free calculation + roadmap engines (tested)
  src/app/core/i18n/               Message catalogues + framework-free translator (en · ar · fr · es)
  src/app/core/state/              Signal store + route guard
  src/app/core/ai/                 ExplanationProvider boundary (template provider in V1)
  src/app/core/data/               AnalysisRepository interface (local-storage impl; Firestore later)
  src/app/pages/                   landing · analyze (questionnaire) · results · roadmap
  src/app/shared/                  metric tile, scenario card, cost breakdown, recommendation card, pipes
preview/                           Dependency-free live preview built from the same compiled engine
tools/                             ledger-clip.mjs draws the hero clip; hero-clip.mjs cuts it to spec
```

## Design system

Warm paper, one ink, and figures that are scannable before they are read. Every token and
class lives in `app/src/styles.css`, which the preview compiles in verbatim, so the two
surfaces cannot drift — retargeting the tokens there moves the whole product at once.

**An editorial register, not a dashboard one.** The product prices things for people who
sell things, so it reads as financial print: a flat paper ground, rules instead of shadows,
square corners, **Instrument Serif** for headings and the hero figure, **IBM Plex Mono** for
every number, and **Plus Jakarta Sans** for the copy you actually read. Nothing floats and
nothing is rounded; a surface is told apart from the ground by a rule and a tint.

**One surface layer.** A card *is* the sheet, told apart from the ground by a rule and a
tint — not a white card floating inside a frosted panel, which is what the glass system this
replaced did with a `::before`.

**Card hierarchy — four treatments and one inverted. Do not add a fifth.**

| Class | Use |
| --- | --- |
| `.pp-card` | secondary: the default sheet |
| `.pp-card--primary` | the decision on the page — ruled in ink, roomier, brand rule on top. One per screen |
| `.pp-card--insight` | explanation and reasoning: faint brand wash |
| `.pp-card--data` | dense figures: the interior recedes so numbers lead |
| `.pp-card--dark` | inverted, at most one per screen |
| `.pp-card-bare` | a plain block nested inside one of the above |

**Brand.** One ink blue (`--pp-brand`), dark enough to carry white text at 6:1 and to be
read as text on paper — so there is no second, darker variant to keep in step. It marks the
primary action, the active nav rule, the top rule of the primary card and the accents, and
nothing else. There is no gradient anywhere except the composition bar, which encodes two
quantities in one strip.

**Contrast.** Every ink token clears WCAG AA (4.5:1) on paper, on the raised sheet, on both
recessed tints and on the dark plate. `node preview/contrast.mjs` audits 28 pairs read
straight out of the shipped stylesheet and fails if one drops below that — run it after
touching a colour.

**Icons.** Lucide, inlined in `app/src/app/shared/icons.ts` rather than loaded from a CDN,
so both surfaces share one registry and neither needs a network round-trip. Angular renders
them through `<pp-icon name="…">`; `preview/build.mjs` strips the `export` keyword and
reuses the same file. Add one by copying the inner markup of `lucide-static/icons/<name>.svg`.
A name with no entry renders an empty `<svg>` and complains to nobody, so `i18n-check.mjs`
asserts every referenced name resolves. No emoji anywhere in the interface.

**Illustrations.** The landing page's drawings live in `app/src/app/shared/illustrations.ts`
(same plain-data trick as the icons, so the preview reuses the file). They carry no colour
of their own — stroke weight and hue come from the page, so one accent recolours the set.

## The hero's background

The landing hero is five layers, and the order is the point: an animated CSS **plate** on the
floor, then the clip, then **grain** and a directional **scrim** on top. The scrim is what
makes the headline legible over footage nobody has seen yet; the plate is what the hero falls
back to when a clip 404s, stalls, or is refused autoplay — so the failure mode is a finished
page, not a black band.

**The clip that ships** is supplied footage — banknotes assembling into a heart — cut to spec
by `tools/hero-clip.mjs`. `tools/ledger-clip.mjs` renders the drawn alternative (raking light
moving across a ruled ledger sheet, at 410 kB) if it is ever dropped.

```bash
node tools/hero-clip.mjs your-clip.mov --loop-blend=1 --dim=0.45
cd preview && node build.mjs               # so both surfaces agree
```

The delivery spec is 24fps, twelve seconds, **no audio track at all** — a muted autoplaying
video that still carries audio is blocked by some autoplay policies. The three flags each exist
because a real clip needed them:

| Flag | Why |
| --- | --- |
| `--loop-blend=1` | arbitrary footage does not loop; this cross-dissolves the tail over the head, because the hard cut back to frame one is what reads as cheap |
| `--dim=0.45` | grading the footage down, not deepening the scrim, is what keeps a **bright** clip legible without changing the design for every other clip. This one measured 4.09:1 under the headline ungraded — below AA |
| `--width` | rarely needed: the frame is 1600×900, but the tool caps output at what the source can fill natively rather than upscaling. Portrait phone footage would otherwise be blown up 2.2× and the encoder would spend bits on detail that was never there — 2.3 MB against 784 kB, for no visible difference |

**H.264 is listed first, WebM second** — the reverse of the usual advice. The source order is a
*preference*, not a fallback chain: a browser takes the first entry it can play. VP9 usually
wins on smooth dark footage, but on this detailed live-action it lost outright (959 kB against
784 kB), so H.264 leads and almost everyone gets the smaller file. WebM stays behind it because
the open-source Chromium build ships **no H.264 at all** — an mp4-only manifest leaves it with
nothing to decode, which is silent: `readyState` stays 0 and `networkState` goes to `NO_SOURCE`
*after* every byte has downloaded. The tool prints both sizes and says which should lead.

Setting `HERO_CLIP` back to `null` is a supported state, not a broken one: no `<video>` renders
and nothing is requested. A reader who has asked for reduced motion gets the poster and **no
download** — `preload="none"`, no autoplay, and the plate stops drifting.

Film grain is the tempting addition and the one to refuse: it is incompressible, and adding it
to the drawn clip took the same twelve seconds from 410 kB to 4.5 MB. The grain in this hero is
a CSS layer above the clip, which costs nothing.

`preview/hero-video.mjs` checks all of this, including the state that is not currently shipped
— see below.

Type is loaded from Google Fonts in `app/src/index.html` and `preview/build.mjs`. Arabic
faces sit at the end of every stack: font fallback is per-glyph, so Latin copy and every
figure still set in the Latin face.

## Languages

**English · العربية · Français · Español.** The catalogue is a runtime one, not Angular's
compile-time `$localize`: that would need a separate build per language, could not switch
without a reload, and could not be shared with the dependency-free preview. `core/i18n` has
no framework imports, so the app, the engine-adjacent code and the preview all read the same
733 entries.

A reader's language is detected from the browser and remembered in `localStorage`; the
switcher in the header lists every language in its own script.

**The engine keeps its own English.** `roadmap.ts`, `pricing.ts` and the margin bands still
compose their sentences in English *and* report the key and parameters they used
(`Recommendation.i18n`, `Scenario.noteI18n`, `PricingResult.warningsI18n`,
`ProfitRoadmap.disclaimerI18n`). The UI rebuilds the sentence from the catalogue and falls
back to the engine's prose if a key is ever missing. This keeps the dependency arrow
pointing one way — the engine never imports the UI's catalogue — and `i18n-check.mjs`
asserts the two spellings stay character-identical.

**Right-to-left** is CSS logical properties (`inset-inline`, `padding-inline-*`,
`text-align: start`), not a mirrored stylesheet. `.pp-icon-flip` marks the directional icons;
`.pp-num` keeps figures left-to-right inside an Arabic paragraph. Arabic is pinned to Latin
digits (`ar-u-nu-latn`) because Gulf financial interfaces use them and mixed numerals break
tabular alignment.

**Adding a language.** Add a `LocaleDef` to `LOCALES` in `core/i18n/catalogue.ts`, add
`messages.<code>.ts` with the same key set as `messages.en.ts`, register it in
`core/i18n/index.ts`, then run `node preview/i18n-check.mjs` — it names every key you missed.
Plurals go through `Intl.PluralRules`: give the catalogue whichever of
`zero/one/two/few/many/other` the language needs (Arabic uses all six).

## Verify the UI against the engine

Nothing in the interface may hardcode a financial figure. `preview/verify.mjs` computes the
sample analysis in Node straight from the compiled engine and the compiled catalogue, then
walks both surfaces in all four languages asserting that every price, cost, margin and
recommendation impact on the page is that engine's own output, formatted for that locale —
plus that the translated copy is present, that the English it replaced is gone, that icons
render, that no emoji survive, that `<html dir>` follows the language, and that nothing
overflows at 390px.

`i18n-check.mjs` guards the catalogues themselves: fidelity against the engine's prose, key
parity across locales, no placeholder a translation invents, and no key a template asks for
that the catalogue lacks, plus every icon name a template asks for.

```bash
cd app && npx tsc -p tsconfig.engine.json && npx tsc -p tsconfig.i18n.json && npx ng build
cd ../preview && npm install                      # Playwright, for the browser checks only
node build.mjs
node i18n-check.mjs                               # catalogues: fidelity, parity, coverage
node verify.mjs                                   # the dependency-free preview
node verify.mjs http://localhost:4173             # a served Angular build too
node contrast.mjs                                 # colour audit
node hero-video.mjs http://localhost:4173         # the hero's background, clip or no clip
```

`hero-video.mjs` drives the hero's clip on both surfaces: the element mounts under the grain
and scrim, autoplays muted, advances, fades in only on `canplay`, and under
`prefers-reduced-motion` sits paused on its poster having fetched nothing. It adapts to the
manifest — with `HERO_CLIP` set to `null` it instead asserts that no `<video>` renders, no
media is requested, and the hero's layers stay in order, so neither state can rot. It carries a
4 kB fixture clip so the *installed* path can be exercised without rebuilding the app.

Its last assertion is the one nothing else can make. `contrast.mjs` audits the stylesheet's own
tokens, and the token behind the hero copy is the dark plate — which the clip covers, so
legibility now depends on footage that is not in the stylesheet at all. `hero-video.mjs`
composites the clip and the scrim in a canvas with the hero's exact geometry, sweeps eight
timestamps across the loop, and measures the headline and lede against the *brightest* frame
under them. The shipped clip holds **13.1:1** and **8.7:1**; AA wants 4.5.

That sweep is why `serve.mjs` answers range requests. Without them Chromium refuses to seek a
`<video>` and silently leaves `currentTime` at zero — the check went on reporting a pass while
measuring one frame eight times. It now verifies each seek landed and fails if they did not,
because a check that quietly narrows its own coverage is worse than no check.

`i18n-check.mjs` and `contrast.mjs` are plain Node; `verify.mjs`, `hero-video.mjs` and
`e2e.mjs` drive a browser. The preview itself is one self-contained HTML file and needs no install at all.
Set `PP_CHROMIUM` to point the Playwright scripts at an existing browser when the machine's
build differs from the pinned one.

**All of it runs in CI** (`.github/workflows/ci.yml`) on every push to the default branch and
every pull request, so none of it depends on someone remembering. The workflow also rebuilds
`preview/engine.bundle.js` and `preview/i18n.bundle.js` and fails if they differ from what is
committed — that is what catches a TypeScript source edited without the bundle regenerated.
It uploads the built preview as an artifact, so a reviewer can download one file and open it.

`preview/serve.mjs` is a dependency-free static server for pointing `verify.mjs` at a real
Angular build:

```bash
node serve.mjs ../app/dist/profitpath/browser 4173
```

## Run the Angular app

```bash
cd app
npm install
npm start            # http://localhost:4200
npm run build        # production build in dist/profitpath
npm run test:engine  # engine unit tests, no browser needed (tsc + node)
```

Requires Node 18.19+ (Node 20/22 recommended) and internet access to npm.

## Run the engine tests only

```bash
cd app && npx tsc -p tsconfig.engine.json && node dist-engine/engine.spec.js
```

37 tests cover charm rounding, the iPhone example from the brief, analytic closure of percentage fees, service/food/SaaS unit conversions, what-if immutability, business-type detection, questionnaire integrity and roadmap rules.

## Rebuild the live preview

```bash
cd app
npx tsc -p tsconfig.engine.json && node ../preview/bundle-engine.mjs dist-engine ../preview/engine.bundle.js ProfitPathEngine
npx tsc -p tsconfig.i18n.json   && node ../preview/bundle-engine.mjs dist-i18n   ../preview/i18n.bundle.js   ProfitPathI18n
cd ../preview && node build.mjs     # -> dist/profitpath-preview.html (open in a browser)
```

## Architecture in one paragraph

All money math lives in `app/src/app/core/engine` and has zero Angular imports. `normalize.ts` turns questionnaire answers into a `CostModel`; `pricing.ts` computes true cost, break-even, three scenarios and the target-profit analysis with closed-form formulas (no iteration); `roadmap.ts` is a list of rules that each compute a monthly impact from the user's own numbers under a stated assumption, then rank by impact ÷ difficulty. `questions.ts` is the registry that makes the questionnaire dynamic — adding a business type is one entry there plus one in `business-types.ts`. The Angular layer only renders engine output through a signal store. The AI boundary (`core/ai/explanation-provider.ts`) may rephrase computed numbers; it never calculates — it builds its sentences from the i18n catalogue, so it has one copy of the wording rather than an English original and a translated twin.

## Deferred (by decision, Sept 2026)

Authentication and persistence (interfaces are in place: `AnalysisRepository`), LLM-written explanations (`ExplanationProvider`), market data, resource finder, PDF export, billing.
