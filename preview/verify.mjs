/**
 * Verifies that every financial figure the UI shows is the engine's own output.
 *
 * Expectations are computed here in Node, straight from the compiled engine in
 * `app/dist-engine` — never read back out of the page — so a hardcoded or stale
 * number in a template fails instead of agreeing with itself.
 *
 * Runs against both surfaces:
 *   node verify.mjs                          # the dependency-free preview
 *   node verify.mjs http://localhost:4173    # a served Angular build as well
 *
 * Prerequisites: `npx tsc -p tsconfig.engine.json` in app/, and `node build.mjs`
 * here. Set PP_CHROMIUM to override the browser executable.
 */
import { chromium } from 'playwright';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const E = require('../app/dist-engine/index.js');

const sample = E.SAMPLES[0];
const model = E.normalizeAnswers(sample.type, sample.answers, sample.offering);
const pricing = E.computePricing(model);
const roadmap = E.buildRoadmap(model, pricing);
const cur = pricing.currency;

const money = (v, d) => E.formatMoney(v, cur, { decimals: d });
const pct = (f, d = 1) => E.formatPct(f, d);

/** Text the results screen must contain, and where it comes from. */
const RESULTS = [
  ['recommended price', money(pricing.recommended.price, 0)],
  ['true cost', money(pricing.trueCostPerUnit)],
  ['profit per unit', money(pricing.recommended.profitPerUnit)],
  ['margin', pct(pricing.recommended.marginPct)],
  ['monthly revenue', money(pricing.recommended.monthlyRevenue, 0)],
  ['monthly profit', money(pricing.recommended.monthlyProfit, 0)],
  ['break-even price', money(pricing.breakEvenPrice)],
  ['minimum scenario price', money(pricing.scenarios.minimum.price, 0)],
  ['premium scenario price', money(pricing.scenarios.premium.price, 0)],
];

const ROADMAP = [
  ['current monthly profit', money(roadmap.current.monthlyProfit, 0)],
  ['optimised monthly profit', money(roadmap.optimisedMonthlyProfit, 0)],
  ['lift', money(roadmap.optimisedMonthlyProfit - roadmap.current.monthlyProfit, 0)],
  ['sum of impacts', money(roadmap.sumOfImpacts, 0)],
  ...roadmap.recommendations.map((r) => [`impact: ${r.title}`, money(r.estimatedMonthlyImpact, 0)]),
];

/** The landing page must show the engine's cost lines, not illustrative ones. */
const LANDING = [
  ['recommended price', money(pricing.recommended.price, 0)],
  ['true cost', money(pricing.trueCostPerUnit)],
  ['target profit', money(model.goals.targetMonthlyProfit, 0)],
  ...pricing.costBreakdown.map((l) => [`cost line: ${l.label}`, money(l.amount)]),
];

const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{2190}-\u{21FF}]/u;

let failures = 0;
function check(surface, screen, label, needle, haystack) {
  const ok = haystack.includes(needle);
  if (!ok) {
    failures++;
    console.log(`  ✗ ${screen} · ${label}: expected "${needle}" from the engine, not found in the page`);
  }
  return ok;
}

async function verify(browser, name, url) {
  console.log(`\n${name} — ${url}`);
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => {
    // Google Fonts is unreachable in the sandbox; that is not a page fault.
    if (m.type() === 'error' && !/ERR_CONNECTION|net::/.test(m.text())) errors.push('console: ' + m.text());
  });

  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.pp-hero');

  const landingText = await page.locator('body').innerText();
  let pass = 0;
  for (const [label, needle] of LANDING) if (check(name, 'landing', label, needle, landingText)) pass++;

  // Icons must actually render — an empty registry entry would be silent.
  const landingIcons = await page.locator('svg.pp-i, pp-icon svg').count();
  if (landingIcons < 15) { failures++; console.log(`  ✗ landing · only ${landingIcons} icons rendered`); }

  await page.locator('[data-action="example"], button:has-text("See an Example")').first().click();
  await page.waitForSelector('.pp-kpi--hero');
  const resultsText = await page.locator('body').innerText();
  for (const [label, needle] of RESULTS) if (check(name, 'results', label, needle, resultsText)) pass++;

  await page.locator('a[href$="/roadmap"], a[href="#/roadmap"]').first().click();
  await page.waitForSelector('.pp-rec');
  const roadmapText = await page.locator('body').innerText();
  for (const [label, needle] of ROADMAP) if (check(name, 'roadmap', label, needle, roadmapText)) pass++;

  // Every recommendation states impact, difficulty, priority and a next action.
  const recCount = await page.locator('.pp-rec').count();
  const actionCount = await page.locator('.pp-rec__action').count();
  const metaCount = await page.locator('.pp-rec__meta').count();
  if (recCount !== roadmap.recommendations.length) {
    failures++;
    console.log(`  ✗ roadmap · ${recCount} cards for ${roadmap.recommendations.length} engine recommendations`);
  }
  if (actionCount !== recCount || metaCount !== recCount) {
    failures++;
    console.log(`  ✗ roadmap · ${actionCount} next-action blocks and ${metaCount} meta rows for ${recCount} cards`);
  }

  for (const [screen, text] of [['landing', landingText], ['results', resultsText], ['roadmap', roadmapText]]) {
    const m = text.match(EMOJI);
    if (m) { failures++; console.log(`  ✗ ${screen} · emoji still rendered: ${JSON.stringify(m[0])}`); }
  }

  // No horizontal overflow at phone width.
  await page.setViewportSize({ width: 390, height: 800 });
  await page.waitForTimeout(120);
  const scrollW = await page.evaluate(() => document.documentElement.scrollWidth);
  if (scrollW > 390) { failures++; console.log(`  ✗ mobile · scrollWidth ${scrollW} > 390`); }

  if (errors.length) { failures += errors.length; errors.forEach((e) => console.log('  ✗ ' + e)); }

  console.log(`  ${pass}/${LANDING.length + RESULTS.length + ROADMAP.length} engine figures matched · ${recCount} recommendation cards · mobile scrollWidth ${scrollW}`);
  await page.close();
}

const targets = [['preview', 'file://' + resolve('dist/profitpath-preview.html')]];
if (process.argv[2]) targets.push(['angular', process.argv[2]]);

const browser = await chromium.launch(process.env.PP_CHROMIUM ? { executablePath: process.env.PP_CHROMIUM } : {});
console.log(`Engine expectations for "${sample.offering}": price ${money(pricing.recommended.price, 0)}, true cost ${money(pricing.trueCostPerUnit)}, monthly profit ${money(pricing.recommended.monthlyProfit, 0)} → ${money(roadmap.optimisedMonthlyProfit, 0)} optimised`);
for (const [name, url] of targets) await verify(browser, name, url);
await browser.close();

console.log(failures ? `\nFAILED — ${failures} problem(s)` : '\nAll surfaces match the engine.');
process.exit(failures ? 1 : 0);
