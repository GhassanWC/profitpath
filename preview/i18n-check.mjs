/**
 * Guards the translation catalogues.
 *
 *   node i18n-check.mjs
 *
 * Three things are checked, and the first is the one that matters most:
 *
 * 1. FIDELITY. The engine still emits its own English prose, and the English
 *    catalogue carries a templated twin of every computed sentence. This runs all
 *    three sample analyses through the engine and asserts that rendering the
 *    catalogue entry with the emitted params reproduces the engine's string
 *    character for character. That is what keeps the duplicate honest: change the
 *    engine's wording without changing the catalogue and this fails.
 *
 * 2. PARITY. Every locale carries exactly the English key set — no missing keys
 *    (which would silently fall back to English) and no orphans left behind after
 *    a key is renamed.
 *
 * 3. PLACEHOLDERS. A translation may only use placeholders the English entry uses.
 *    A typo'd {mrgin} renders as empty text, which is invisible in review.
 *
 * Requires `npx tsc -p tsconfig.engine.json` and `-p tsconfig.i18n.json` in app/.
 */
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const E = require('../app/dist-engine/index.js');

// The catalogue is compiled by `tsconfig.i18n.json`, so this checks the very
// same code the app ships rather than a re-parsed copy of the source.
const I18N = require('../app/dist-i18n/index.js');
const { MESSAGES: CATALOGUES, createTranslator } = I18N;
const EN = CATALOGUES.en;

let failures = 0;
const fail = (msg) => {
  failures++;
  console.log('  ✗ ' + msg);
};

// ---------------------------------------------------------------- 1. fidelity
console.log('Fidelity — English catalogue vs the engine\'s own prose');
let compared = 0;
for (const sample of E.SAMPLES) {
  const m = E.normalizeAnswers(sample.type, sample.answers, sample.offering);
  const p = E.computePricing(m);
  const r = E.buildRoadmap(m, p);
  const t = createTranslator('en', CATALOGUES, m.meta.currency);

  const check = (label, msg, expected) => {
    if (!msg) return fail(`${sample.name}: ${label} carries no i18n metadata`);
    const got = t.t(msg.key, msg.params);
    compared++;
    if (got !== expected) fail(`${sample.name}: ${label}\n      engine: ${JSON.stringify(expected)}\n      catalogue: ${JSON.stringify(got)}`);
  };

  for (const rec of r.recommendations) {
    check(`rec ${rec.id} title`, rec.i18n?.title, rec.title);
    check(`rec ${rec.id} why`, rec.i18n?.why, rec.why);
    check(`rec ${rec.id} action`, rec.i18n?.action, rec.action);
    rec.assumptions.forEach((a, i) => check(`rec ${rec.id} assumption ${i + 1}`, rec.i18n?.assumptions[i], a));
  }
  check('roadmap disclaimer', r.disclaimerI18n, r.disclaimer);
  for (const key of ['minimum', 'recommended', 'premium']) {
    check(`scenario ${key} note`, p.scenarios[key].noteI18n, p.scenarios[key].note);
  }
  p.warnings.forEach((w, i) => check(`warning ${i + 1}`, p.warningsI18n?.[i], w));
  // The default margin-band rationale is static per business type.
  const staticRationale = t.t(`businessType.${m.meta.businessType}.rationale`);
  compared++;
  if (!p.marginBand.rationaleI18n && staticRationale !== p.marginBand.rationale) {
    fail(`${sample.name}: margin band rationale\n      engine: ${JSON.stringify(p.marginBand.rationale)}\n      catalogue: ${JSON.stringify(staticRationale)}`);
  }
}
console.log(`  ${compared} engine sentences compared`);

// A requested-margin analysis exercises the branches the samples never reach.
{
  const s = E.SAMPLES[0];
  const m = E.normalizeAnswers(s.type, { ...s.answers, desiredMarginPct: 45 }, s.offering);
  const p = E.computePricing(m);
  const t = createTranslator('en', CATALOGUES, m.meta.currency);
  const pairs = [
    ['margin band rationale (requested)', p.marginBand.rationaleI18n, p.marginBand.rationale],
    ['recommended note (requested)', p.scenarios.recommended.noteI18n, p.scenarios.recommended.note],
    ...p.warnings.map((w, i) => [`warning ${i + 1} (requested)`, p.warningsI18n?.[i], w]),
  ];
  for (const [label, msg, expected] of pairs) {
    if (!msg) { fail(`${label} carries no i18n metadata`); continue; }
    const got = t.t(msg.key, msg.params);
    compared++;
    if (got !== expected) fail(`${label}\n      engine: ${JSON.stringify(expected)}\n      catalogue: ${JSON.stringify(got)}`);
  }
}

// ------------------------------------------------------------------ 2. parity
console.log('\nParity — every locale carries the English key set');
const enKeys = Object.keys(EN);
const placeholders = (s) => new Set([...String(s).matchAll(/\{(\w+)(?:\|\w+)?\}/g)].map((m) => m[1]));
for (const [code, table] of Object.entries(CATALOGUES)) {
  if (code === 'en') continue;
  const missing = enKeys.filter((k) => !(k in table));
  const orphans = Object.keys(table).filter((k) => !(k in EN));
  const empty = Object.keys(table).filter((k) => table[k] === '');
  if (missing.length) fail(`${code}: ${missing.length} key(s) missing, e.g. ${missing.slice(0, 5).join(', ')}`);
  if (orphans.length) fail(`${code}: ${orphans.length} key(s) not in English, e.g. ${orphans.slice(0, 5).join(', ')}`);
  if (empty.length) fail(`${code}: ${empty.length} empty translation(s), e.g. ${empty.slice(0, 5).join(', ')}`);
  if (!missing.length && !orphans.length && !empty.length) console.log(`  ✓ ${code}: ${Object.keys(table).length} entries`);
}

// ------------------------------------------------------------ 3. placeholders
console.log('\nPlaceholders — translations only use the parameters English uses');
let bad = 0;
for (const [code, table] of Object.entries(CATALOGUES)) {
  if (code === 'en') continue;
  for (const [key, value] of Object.entries(table)) {
    if (!(key in EN)) continue;
    const allowed = placeholders(EN[key]);
    for (const name of placeholders(value)) {
      if (!allowed.has(name)) { fail(`${code}: "${key}" uses {${name}}, which English does not provide`); bad++; }
    }
  }
}
if (!bad) console.log('  ✓ no unknown placeholders');

console.log(failures ? `\nFAILED — ${failures} problem(s)` : '\nCatalogues are consistent with the engine and with each other.');
process.exit(failures ? 1 : 0);
