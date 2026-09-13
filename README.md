# ProfitPath — Smart Pricing & Profit Roadmap (MVP)

> Tell us what you want to sell. We'll help you figure out how to sell it profitably.

## What's in this package

```
docs/01-architecture-analysis.md   Requirements review, architecture, formulas, models, phases
app/                               Angular 18 application (standalone components, Bootstrap 5)
  src/app/core/engine/             Framework-free calculation + roadmap engines (tested)
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
and `preview/build.mjs`.

## Verify the UI against the engine

Nothing in the interface may hardcode a financial figure. `preview/verify.mjs` computes the
sample analysis in Node straight from the compiled engine and asserts that every price,
cost, margin and recommendation impact the page shows is that engine's own output — plus
that icons render, that no emoji survive, and that nothing overflows at 390px.

```bash
cd app && npx tsc -p tsconfig.engine.json && npx ng build
cd ../preview && node build.mjs
node verify.mjs                                   # the dependency-free preview
node verify.mjs http://localhost:4173             # a served Angular build too
node contrast.mjs                                 # colour audit
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
cd app && npx tsc -p tsconfig.engine.json && node ../preview/bundle-engine.mjs dist-engine ../preview/engine.bundle.js
cd ../preview && node build.mjs     # -> dist/profitpath-preview.html (open in a browser)
```

## Architecture in one paragraph

All money math lives in `app/src/app/core/engine` and has zero Angular imports. `normalize.ts` turns questionnaire answers into a `CostModel`; `pricing.ts` computes true cost, break-even, three scenarios and the target-profit analysis with closed-form formulas (no iteration); `roadmap.ts` is a list of rules that each compute a monthly impact from the user's own numbers under a stated assumption, then rank by impact ÷ difficulty. `questions.ts` is the registry that makes the questionnaire dynamic — adding a business type is one entry there plus one in `business-types.ts`. The Angular layer only renders engine output through a signal store. The AI boundary (`core/ai/explanation-provider.ts`) may rephrase computed numbers; it never calculates.

## Deferred (by decision, Sept 2026)

Authentication and persistence (interfaces are in place: `AnalysisRepository`), LLM-written explanations (`ExplanationProvider`), market data, resource finder, PDF export, billing.
