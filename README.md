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

The interface follows the ProfitPath design system: a frosted-glass dashboard on a
periwinkle→pale-blue wash, light-weight tabular figures, pill controls and near-black
primary buttons. Every token and class lives in `app/src/styles.css`, which the preview
compiles in verbatim, so the two surfaces cannot drift.

The key structural rule is the **two-layer surface model**: content never sits straight on
the page wash. `.pp-card` *is* the frosted panel, and the white card inside it is drawn by
the element's own `::before` at a 12px inset — so a card stays one element in the markup.
Use `.pp-panel` + `.pp-card-bare` where one panel has to group several cards.

Typeface is **Plus Jakarta Sans** (Google Fonts, 300–700), loaded in `app/src/index.html`
and `preview/build.mjs`.

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
