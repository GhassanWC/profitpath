/**
 * Verifies the landing hero's background-video path — both halves of it.
 *
 *   node hero-video.mjs                             # the preview
 *   node hero-video.mjs http://localhost:4173       # the Angular build too
 *   node hero-video.mjs --installed=http://…        # an Angular build with a clip
 *
 * This is not a formality. The two templates emit the same element, but Angular
 * writes static attributes with setAttribute while the preview's markup goes
 * through the HTML parser — and `muted` only reflects to the property under the
 * parser. Spelled `muted` in the Angular template the property stayed false,
 * autoplay was refused, and the clip would silently never have played. That bug
 * shipped past code review and was caught here.
 *
 * The shipped state has no clip (`HERO_CLIP` is `null` in
 * `app/src/app/shared/hero-clip.ts`), so the interesting behaviour is the one
 * nobody would otherwise exercise until the day they drop footage in. This
 * takes the real built preview, rewrites that one constant to point at a small
 * committed fixture, and drives it — so what is checked is the shipped markup,
 * not a copy of it written for the test.
 *
 * It asserts, in order:
 *
 *   no clip        no <video> element at all, and no request for one; the CSS
 *                  plate carries the hero
 *   with a clip    the element mounts under the grain and scrim, is muted,
 *                  looping, inline and carries no audio track; it autoplays,
 *                  advances, and only then fades in (`.is-ready`), with the
 *                  plate still underneath it
 *   reduced motion the clip is never fetched — `preload="none"`, no autoplay,
 *                  paused — and the poster shows instead
 *
 * The fixture is 320x180 and two seconds, about 4 kB for all three files.
 * To regenerate it:
 *
 *   ffmpeg -f lavfi -i "color=c=0x14161f:s=320x180:r=12:d=2" \
 *     -filter_complex "[0:v]drawbox=x='40+30*sin(2*PI*t/2)':y=40:w=90:h=90:\
 *     color=0x2b3450@1:t=fill,format=yuv420p[v]" -map "[v]" -an \
 *     -c:v libx264 -crf 30 fixtures/hero-sample.mp4
 *
 * Prerequisite: `node build.mjs`. Set PP_CHROMIUM to override the browser.
 */
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const PORT = 4178;
const PAGE = 'hero-video-fixture.html';

/**
 * The constant `build.mjs` inlines verbatim, and the descriptor to swap in.
 *
 * Matched rather than compared, so this keeps working the day someone installs
 * real footage: the manifest is then an object literal instead of `null`, and a
 * check that only knew the `null` spelling would fail exactly when the feature
 * started mattering. Object literals carry no semicolons, so stopping at the
 * first one is unambiguous.
 *
 * Anchored to the start of a line because the manifest's own doc comment shows
 * the filled-in form as an example, indented — matching that instead would
 * rewrite the comment and leave the real constant alone.
 */
const DECLARATION = /^const HERO_CLIP = [^;]*;/m;
const WIRED = `const HERO_CLIP = ${JSON.stringify({
  poster: 'hero-sample.jpg',
  sources: [
    { src: 'hero-sample.webm', type: 'video/webm' },
    { src: 'hero-sample.mp4', type: 'video/mp4' },
  ],
})};`;

/**
 * A bare URL adds the Angular build to the *no clip* sections — that is the
 * shipped state, so it costs nothing and CI passes it.
 *
 * `--installed=<url>` adds a surface to the *with a clip* sections. Point it at
 * an Angular build whose `HERO_CLIP` actually names the fixture. That needs a
 * rebuild, which is why CI leaves it out and the preview stands in: both
 * templates emit the same element from the same constant. Worth running by hand
 * after touching either one.
 */
const argv = process.argv.slice(2);
const angularUrl = argv.find((a) => !a.startsWith('--'));
const installedUrl = argv.find((a) => a.startsWith('--installed='))?.slice('--installed='.length);

let failures = 0;
/** Per-section, so one section's summary line cannot be silenced by another's. */
let sectionFailures = 0;
const section = (name) => {
  sectionFailures = 0;
  console.log(`\n${name}`);
};
const fail = (m) => {
  console.error(`  ✗ ${m}`);
  failures++;
  sectionFailures++;
};
const ok = (m) => console.log(`  ✓ ${m}`);

// ---------------------------------------------------------------- the fixture

const built = readFileSync('dist/profitpath-preview.html', 'utf8');
const declaration = built.match(DECLARATION);
if (!declaration) {
  console.error(
    'Could not find the HERO_CLIP declaration in the built preview. Either\n' +
      'hero-clip.ts has changed shape, or build.mjs has stopped inlining it —\n' +
      'without it neither surface can render a hero clip at all.',
  );
  process.exit(1);
}
/** Whether the repo currently ships footage, which decides what is worth asserting. */
const clipInstalled = !/= *null;/.test(declaration[0]);

// Written beside the fixture media so the relative sources resolve.
writeFileSync(resolve('fixtures', PAGE), built.replace(DECLARATION, WIRED));

const server = spawn(process.execPath, ['serve.mjs', 'fixtures', String(PORT)], { stdio: 'ignore' });
const stop = () => server.kill();
process.on('exit', stop);

const base = `http://localhost:${PORT}`;
for (let i = 0; i < 50; i++) {
  try {
    const r = await fetch(`${base}/${PAGE}`);
    if (r.ok) break;
  } catch {
    /* not up yet */
  }
  await new Promise((r) => setTimeout(r, 100));
}

const browser = await chromium.launch(process.env.PP_CHROMIUM ? { executablePath: process.env.PP_CHROMIUM } : {});

/** Surfaces that have a clip wired: the fixture page always, Angular on request. */
const installed = [['preview', `${base}/${PAGE}`]];
if (installedUrl) installed.push(['angular', installedUrl]);

// ------------------------------------------------- 1. the shipped state: none

// Both surfaces, because both render this hero from the same manifest. Skipped
// once footage is installed: "renders no video" is then the wrong assertion, and
// the sections below cover what replaced it.
const shipped = clipInstalled ? [] : [['preview', 'file://' + resolve('dist/profitpath-preview.html')]];
if (!clipInstalled && angularUrl) shipped.push(['angular', angularUrl]);
if (clipInstalled) console.log('\nA clip is installed — skipping the no-clip sections.');

for (const [surface, url] of shipped) {
  section(`No clip installed — the shipped state (${surface})`);
  const context = await browser.newContext();
  const page = await context.newPage();
  const media = [];
  page.on('request', (r) => {
    if (['media', 'image'].includes(r.resourceType())) media.push(r.url());
  });
  await page.goto(url);
  await page.waitForSelector('.pp-lp-hero');

  const count = await page.locator('.pp-lp-hero__video').count();
  if (count) fail(`a <video> rendered with no clip installed`);
  else ok('no <video> element');

  if (!(await page.locator('.pp-lp-hero__plate').count())) fail('the plate is missing');
  else ok('the plate carries the hero');

  // The layers that make arbitrary footage safe to put copy on must be in place
  // before there is any footage — otherwise the day a clip lands is the day the
  // headline stops being legible.
  const order = await page.evaluate(() =>
    [...document.querySelector('.pp-lp-hero').children].map((el) => el.className.replace('pp-lp-hero__', '').split(' ')[0]),
  );
  const expected = ['plate', 'grain', 'scrim', 'foot'];
  if (expected.some((c, i) => order[i] !== c)) fail(`layer order is ${order.slice(0, 4).join(' → ')}`);
  else ok(`layer order ${expected.join(' → ')}`);

  const clips = media.filter((u) => /\.(mp4|webm)$/.test(u));
  if (clips.length) fail(`requested ${clips.join(', ')} with no clip installed`);
  else ok('no media requested');

  await context.close();
}

// ------------------------------------------------------ 2. a clip, playing

for (const [surface, url] of installed) {
  section(`A clip installed (${surface})`);
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(url);
  const video = page.locator('.pp-lp-hero__video');
  await video.waitFor({ state: 'attached' });

  // Configuration. `muted` is the load-bearing one: without the property set
  // before playback is attempted, every autoplay policy refuses the clip.
  const cfg = await video.evaluate((v) => ({
    muted: v.muted,
    loop: v.loop,
    playsInline: v.playsInline,
    autoplay: v.autoplay,
    preload: v.preload,
    ariaHidden: v.getAttribute('aria-hidden'),
    tabIndex: v.tabIndex,
    controls: v.controls,
  }));
  const before = sectionFailures;
  for (const [k, want] of [
    ['muted', true], ['loop', true], ['playsInline', true], ['autoplay', true],
    ['controls', false], ['ariaHidden', 'true'], ['tabIndex', -1],
  ]) {
    if (cfg[k] !== want) fail(`${k} is ${JSON.stringify(cfg[k])}, expected ${JSON.stringify(want)}`);
  }
  if (sectionFailures === before) ok(`muted, looping, inline, autoplaying, decorative (preload="${cfg.preload}")`);

  // Paint order: the plate below, the grain and scrim above. The scrim is what
  // makes the headline legible over arbitrary footage, so a clip that landed on
  // top of it would be a contrast bug, not a cosmetic one.
  const order = await page.evaluate(() => {
    const kids = [...document.querySelector('.pp-lp-hero').children];
    return kids.map((el) => el.className.replace('pp-lp-hero__', '').split(' ')[0]);
  });
  const at = (n) => order.indexOf(n);
  if (!(at('plate') < at('video') && at('video') < at('grain') && at('grain') < at('scrim'))) {
    fail(`layer order is ${order.join(' → ')}`);
  } else ok(`layer order ${order.slice(0, 4).join(' → ')}`);

  // It actually decodes and advances, rather than merely existing.
  await video.evaluate((v) => v.readyState >= 3 || new Promise((r) => v.addEventListener('canplay', r, { once: true })));
  const played = await video.evaluate(
    (v) =>
      new Promise((r) => {
        const t0 = v.currentTime;
        setTimeout(() => r({ t0, t1: v.currentTime, paused: v.paused, w: v.videoWidth, audio: v.mozHasAudio ?? null }), 700);
      }),
  );
  if (played.w === 0) fail('the clip decoded no frames (videoWidth 0)');
  else if (played.paused) fail('the clip is paused — autoplay was refused');
  else if (played.t1 <= played.t0) fail(`currentTime did not advance (${played.t0} → ${played.t1})`);
  else ok(`playing: ${played.w}px wide, advanced ${(played.t1 - played.t0).toFixed(2)}s`);

  // The fade-in, and the plate still underneath it. Polled rather than waited
  // out: the class lands on `canplay` but the opacity takes the transition's
  // 900ms to arrive, and a fixed sleep either races it or pads every run.
  const ready = await video.evaluate(
    (v) =>
      new Promise((r) => {
        const deadline = Date.now() + 4000;
        const tick = () => {
          const opacity = getComputedStyle(v).opacity;
          const cls = v.classList.contains('is-ready');
          if ((cls && Number(opacity) > 0.99) || Date.now() > deadline) r({ cls, opacity });
          else requestAnimationFrame(tick);
        };
        tick();
      }),
  );
  if (!ready.cls) fail('is-ready never landed, so the clip stays transparent');
  else if (Number(ready.opacity) < 0.99) fail(`faded in to opacity ${ready.opacity}`);
  else ok('faded in on canplay');

  if (!(await page.locator('.pp-lp-hero__plate').count())) fail('the plate was removed — nothing to fall back to');
  else ok('the plate is still underneath');

  await context.close();
}

// -------------------------------------------------------- 3. reduced motion

for (const [surface, url] of installed) {
  section(`A clip installed, reduced motion requested (${surface})`);
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  const media = [];
  page.on('request', (r) => {
    if (r.resourceType() === 'media') media.push(new URL(r.url()).pathname);
  });
  await page.goto(url);
  const video = page.locator('.pp-lp-hero__video');
  await video.waitFor({ state: 'attached' });
  await page.waitForTimeout(900);

  const state = await video.evaluate((v) => ({
    preload: v.preload,
    autoplay: v.autoplay,
    paused: v.paused,
    poster: v.getAttribute('poster'),
    opacity: getComputedStyle(v).opacity,
  }));
  if (state.preload !== 'none') fail(`preload is "${state.preload}", expected "none"`);
  if (state.autoplay) fail('autoplay is set despite the reduced-motion request');
  if (!state.paused) fail('the clip is playing despite the reduced-motion request');
  if (!state.poster) fail('no poster, so there is nothing to show instead');
  if (Number(state.opacity) < 0.99) fail(`poster is at opacity ${state.opacity} and never fades in`);
  if (media.length) fail(`fetched ${media.join(', ')} despite the reduced-motion request`);
  if (!sectionFailures) ok('paused on its poster, and no part of the clip fetched');

  // The plate must stop drifting too, or "reduced motion" is half-honoured.
  const anim = await page.locator('.pp-lp-hero__plate').evaluate((el) => getComputedStyle(el).animationName);
  if (anim !== 'none') fail(`the plate is still animating (${anim})`);
  else ok('the plate is not animating either');

  await context.close();
}

await browser.close();
stop();

console.log(failures ? `\nFAILED — ${failures} problem(s)` : '\nThe hero video path holds, installed and not.');
process.exit(failures ? 1 : 0);
