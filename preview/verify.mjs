/**
 * Verifies that every financial figure the UI shows is the engine's own output,
 * in every language the app ships.
 *
 * Expectations are computed here in Node, straight from the compiled engine in
 * `app/dist-engine` and the compiled catalogue in `app/dist-i18n` — never read
 * back out of the page — so a hardcoded or stale number in a template fails
 * instead of agreeing with itself.
 *
 * Runs against both surfaces:
 *   node verify.mjs                          # the dependency-free preview
 *   node verify.mjs http://localhost:4173    # a served Angular build as well
 *
 * Language is chosen through the browser context's `locale`, which is what both
 * surfaces read when no choice has been stored — so this exercises the same
 * detection a first-time reader gets.
 *
 * Prerequisites: `npx tsc -p tsconfig.engine.json` and `-p tsconfig.i18n.json`
 * in app/, and `node build.mjs` here. Set PP_CHROMIUM to override the browser.
 */
import { chromium } from 'playwright';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const E = require('../app/dist-engine/index.js');
const { MESSAGES, LOCALES, createTranslator } = require('../app/dist-i18n/index.js');

const sample = E.SAMPLES[0];
const model = E.normalizeAnswers(sample.type, sample.answers, sample.offering);
const pricing = E.computePricing(model);
const roadmap = E.buildRoadmap(model, pricing);
const cur = pricing.currency;

/** The engine's decimal rule, which the UI's figures follow. */
const dec = (v) => (Math.abs(v) >= 1000 ? 0 : 2);

/**
 * Strings that must be gone as well as strings that must be there. Checking only
 * for the translation would pass a page that printed both; checking that the
 * English is absent is what catches a literal left behind in a template.
 */
const TRANSLATED = {
  landing: ['landing.how.title', 'landing.pricing.title', 'compare.today'],
  // The margin-band rationale is the long sentence the pricing explanation
  // splices in from the engine; it is the one most easily left in English.
  results: ['results.threeWays', 'results.breakEven', 'results.trueCost', `businessType.${model.meta.businessType}.rationale`],
  roadmap: ['roadmap.nextAction', 'roadmap.progress', 'roadmap.assumptions'],
  // The questionnaire is nearly half the catalogue, and its copy is reached
  // through keys built from the business type — worth asserting directly.
  analyze: ['analyze.q0.title', 'analyze.businessType', `businessType.${model.meta.businessType}.description`],
  questions: ['group.context.title', 'question.country.label', 'question.currency.label', 'analyze.notice'],
};

const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{2190}-\u{21FF}]/u;

let failures = 0;
const fail = (msg) => {
  failures++;
  console.log('  ✗ ' + msg);
};

function expectations(locale) {
  const T = createTranslator(locale, MESSAGES, cur);
  const money = (v, d) => T.money(v, cur, d === undefined ? dec(v) : d);
  const pct = (f, d = 1) => T.pct(f, d);
  return {
    T,
    landing: [
      ['recommended price', money(pricing.recommended.price, 0)],
      ['true cost', money(pricing.trueCostPerUnit)],
      ['target profit', money(model.goals.targetMonthlyProfit, 0)],
      ...pricing.costBreakdown.map((l) => [`cost line: ${l.key}`, money(l.amount)]),
    ],
    results: [
      ['recommended price', money(pricing.recommended.price, 0)],
      ['true cost', money(pricing.trueCostPerUnit)],
      ['profit per unit', money(pricing.recommended.profitPerUnit)],
      ['margin', pct(pricing.recommended.marginPct)],
      ['monthly revenue', money(pricing.recommended.monthlyRevenue, 0)],
      ['monthly profit', money(pricing.recommended.monthlyProfit, 0)],
      ['break-even price', money(pricing.breakEvenPrice)],
      ['minimum scenario price', money(pricing.scenarios.minimum.price, 0)],
      ['premium scenario price', money(pricing.scenarios.premium.price, 0)],
    ],
    roadmap: [
      ['current monthly profit', money(roadmap.current.monthlyProfit, 0)],
      ['optimised monthly profit', money(roadmap.optimisedMonthlyProfit, 0)],
      ['lift', money(roadmap.optimisedMonthlyProfit - roadmap.current.monthlyProfit, 0)],
      ['sum of impacts', money(roadmap.sumOfImpacts, 0)],
      ...roadmap.recommendations.map((r) => [`impact: ${r.id}`, money(r.estimatedMonthlyImpact, 0)]),
    ],
  };
}

async function verify(browser, surface, url, locale) {
  const def = LOCALES.find((l) => l.code === locale);
  const exp = expectations(locale);
  const label = `${surface} · ${locale}`;
  const context = await browser.newContext({ viewport: { width: 1280, height: 1000 }, locale: def.intl.split('-u-')[0] });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => {
    // Google Fonts is unreachable in the sandbox; that is not a page fault.
    if (m.type() === 'error' && !/ERR_CONNECTION|net::/.test(m.text())) errors.push('console: ' + m.text());
  });

  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.pp-hero');

  const screens = {};
  let pass = 0;
  const capture = async (name) => {
    // innerText for figures — it reflects the rendered line boxes, which is how
    // a split hero number betrays itself. Copy is checked against the text with
    // <script> and <style> stripped: both surfaces inline their sources, and the
    // English inside them is not something a reader ever sees.
    screens[name] = {
      inner: await page.locator('body').innerText(),
      text: await page.evaluate(() => {
        const clone = document.body.cloneNode(true);
        clone.querySelectorAll('script, style').forEach((el) => el.remove());
        return clone.textContent;
      }),
    };
    for (const [what, needle] of exp[name] ?? []) {
      if (screens[name].inner.includes(needle)) pass++;
      else fail(`${label} · ${name} · ${what}: expected "${needle}" from the engine, not found`);
    }
    for (const key of TRANSLATED[name]) {
      const want = exp.T.t(key);
      if (!screens[name].text.includes(want)) fail(`${label} · ${name}: missing "${want}" (${key})`);
      if (locale !== 'en' && MESSAGES.en[key] !== want && screens[name].text.includes(MESSAGES.en[key])) {
        fail(`${label} · ${name}: untranslated English "${MESSAGES.en[key]}" (${key}) still on the page`);
      }
    }
    const emoji = screens[name].text.match(EMOJI);
    if (emoji) fail(`${label} · ${name}: emoji rendered ${JSON.stringify(emoji[0])}`);
  };

  await capture('landing');

  // Icons must actually render — an empty registry entry would be silent.
  const landingIcons = await page.locator('svg.pp-i, pp-icon svg').count();
  if (landingIcons < 15) fail(`${label} · landing: only ${landingIcons} icons rendered`);

  await page.locator('.pp-header-pill a.btn-pp, a[href$="/analyze"].btn').first().click();
  await page.waitForSelector('#offering, .pp-type-card');
  await capture('analyze');

  // First question group: labels and help text come from type-scoped keys.
  await page.fill('#offering, input[type="text"]', sample.offering);
  await page.locator(`[data-type="${sample.type}"], .pp-type-card`).first().click();
  await page.locator('#start, .pp-card--primary button.btn-pp').first().click();
  await page.waitForSelector('#country, input[id="country"]');
  await capture('questions');

  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.pp-hero');
  await page.locator('[data-action="example"], .pp-hero button.btn-pp-glass').first().click();
  await page.waitForSelector('.pp-kpi--hero');
  await capture('results');

  await page.locator('a[href$="/roadmap"], a[href="#/roadmap"]').first().click();
  await page.waitForSelector('.pp-rec');
  await capture('roadmap');

  // Every recommendation states impact, difficulty, priority and a next action.
  const recCount = await page.locator('.pp-rec').count();
  const actionCount = await page.locator('.pp-rec__action').count();
  const metaCount = await page.locator('.pp-rec__meta').count();
  if (recCount !== roadmap.recommendations.length) fail(`${label} · roadmap: ${recCount} cards for ${roadmap.recommendations.length} engine recommendations`);
  if (actionCount !== recCount || metaCount !== recCount) fail(`${label} · roadmap: ${actionCount} next-action blocks and ${metaCount} meta rows for ${recCount} cards`);

  // Direction: the document follows the language, figures stay left-to-right
  // inside it, and the directional icons mirror.
  const dir = await page.evaluate(() => document.documentElement.getAttribute('dir'));
  if (dir !== def.dir) fail(`${label}: <html dir> is "${dir}", expected "${def.dir}"`);
  if (def.dir === 'rtl') {
    const numDir = await page.evaluate(() => {
      const el = document.querySelector('.pp-num');
      return el ? getComputedStyle(el).direction : null;
    });
    if (numDir !== 'ltr') fail(`${label}: figures render ${numDir}, expected ltr inside an rtl page`);
    // The preview puts the class on the <svg>; Angular puts it on the <pp-icon>
    // host and the rule reaches the svg inside. Measure whichever actually turns.
    const flipped = await page.evaluate(() => {
      const el = document.querySelector('svg.pp-icon-flip') ?? document.querySelector('.pp-icon-flip svg');
      return el ? getComputedStyle(el).transform : null;
    });
    if (!flipped || !/^matrix\(-1/.test(flipped)) fail(`${label}: directional icons not mirrored (transform ${flipped})`);
  }

  // No horizontal overflow at phone width.
  await page.setViewportSize({ width: 390, height: 800 });
  await page.waitForTimeout(120);
  const scrollW = await page.evaluate(() => document.documentElement.scrollWidth);
  if (scrollW > 390) fail(`${label} · mobile: scrollWidth ${scrollW} > 390`);

  errors.forEach((e) => fail(`${label}: ${e}`));

  const total = exp.landing.length + exp.results.length + exp.roadmap.length;
  console.log(`  ${label}: ${pass}/${total} engine figures · ${recCount} cards · dir ${dir} · mobile ${scrollW}`);
  await context.close();
}

const targets = [['preview', 'file://' + resolve('dist/profitpath-preview.html')]];
if (process.argv[2]) targets.push(['angular', process.argv[2]]);

const browser = await chromium.launch(process.env.PP_CHROMIUM ? { executablePath: process.env.PP_CHROMIUM } : {});
console.log(`Engine expectations for "${sample.offering}" (${cur}): price ${pricing.recommended.price}, true cost ${pricing.trueCostPerUnit}, monthly profit ${pricing.recommended.monthlyProfit} → ${roadmap.optimisedMonthlyProfit} optimised`);
for (const [surface, url] of targets) {
  console.log(`\n${surface} — ${url}`);
  for (const l of LOCALES) await verify(browser, surface, url, l.code);
}
await browser.close();

console.log(failures ? `\nFAILED — ${failures} problem(s)` : '\nAll surfaces match the engine, in every language.');
process.exit(failures ? 1 : 0);
