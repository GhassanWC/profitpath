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
```

## Design system

Soft glass on a periwinkle wash, one brand gradient, and figures that are scannable before
they are read. Every token and class lives in `app/src/styles.css`, which the preview
compiles in verbatim, so the two surfaces cannot drift.

**Two-layer surface model.** Content never sits straight on the page wash. `.pp-card` *is*
the glass panel, and the card inside it is drawn by the element's own `::before` at a 12px
inset — so a card stays one element in the markup.

**Card hierarchy — four treatments and one inverted. Do not add a fifth.**

| Class | Use |
| --- | --- |
| `.pp-card` | secondary: the default content card |
| `.pp-card--primary` | the decision on the page — deeper, roomier, brand edge. One per screen |
| `.pp-card--insight` | explanation and reasoning: faint brand wash |
| `.pp-card--data` | dense figures: pale interior |
| `.pp-card--dark` | inverted, at most one per screen |
| `.pp-card-bare` | a plain block nested inside one of the above |

**Brand.** The mark, the primary button, the active nav item and the accents are all the
same blue→violet identity (`--pp-brand`, `--pp-brand-gradient`). Near-black is ink and the
inverted card only. Brand *text* uses `--pp-brand-ink`, which is darkened to clear AA.

**Contrast.** Every ink token clears WCAG AA (4.5:1) on white, on `--pp-subtle` and on
`--pp-subtle-2`. `node preview/contrast.mjs` audits the shipped stylesheet and fails if a
pair drops below that — run it after touching a colour.

**Icons.** Lucide, inlined in `app/src/app/shared/icons.ts` rather than loaded from a CDN,
so both surfaces share one registry and neither needs a network round-trip. Angular renders
them through `<pp-icon name="…">`; `preview/build.mjs` strips the `export` keyword and
reuses the same file. Add one by copying the inner markup of `lucide-static/icons/<name>.svg`.
No emoji anywhere in the interface.

Typeface is **Plus Jakarta Sans** (Google Fonts, 300–700), loaded in `app/src/index.html`
and `preview/build.mjs`. Arabic faces sit at the end of `--pp-font`: font fallback is
per-glyph, so Latin copy and every figure still set in Plus Jakarta Sans.

## Languages

**English · العربية · Français · Español.** The catalogue is a runtime one, not Angular's
compile-time `$localize`: that would need a separate build per language, could not switch
without a reload, and could not be shared with the dependency-free preview. `core/i18n` has
no framework imports, so the app, the engine-adjacent code and the preview all read the same
725 entries.

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
that the catalogue lacks.

```bash
cd app && npx tsc -p tsconfig.engine.json && npx tsc -p tsconfig.i18n.json && npx ng build
cd ../preview && npm install                      # Playwright, for the browser checks only
node build.mjs
node i18n-check.mjs                               # catalogues: fidelity, parity, coverage
node verify.mjs                                   # the dependency-free preview
node verify.mjs http://localhost:4173             # a served Angular build too
node contrast.mjs                                 # colour audit
```

`i18n-check.mjs` and `contrast.mjs` are plain Node; only `verify.mjs` and `e2e.mjs` drive a
browser. The preview itself is one self-contained HTML file and needs no install at all.
Set `PP_CHROMIUM` to point the Playwright scripts at an existing browser when the machine's
build differs from the pinned one.

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
