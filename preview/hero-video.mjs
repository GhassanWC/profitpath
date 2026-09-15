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
 * It reads `HERO_CLIP` out of the built preview and checks whichever state the
 * repo is in, so neither can rot:
 *
 *   with a clip    the element mounts under the grain and scrim, is muted,
 *                  looping, inline and carries no audio track; it autoplays,
 *                  advances, and only then fades in (`.is-ready`), with the
 *                  plate still underneath it — and the copy stays legible over
 *                  the clip's brightest frame (see below)
 *   no clip        no <video> element at all, and no request for one; the CSS
 *                  plate carries the hero and its layers stay in order
 *   reduced motion the clip is never fetched — `preload="none"`, no autoplay,
 *                  paused — and the poster shows instead
 *
 * The *installed* path is driven against a small committed fixture rather than
 * whatever ships, by rewriting that one constant in the real built preview — so
 * what runs is the shipped markup, not a copy written for the test, and the path
 * stays covered even when the manifest is `null`.
 *
 * The legibility assertion is the one nothing else here can make: `contrast.mjs`
 * audits the stylesheet's tokens, and the token behind this copy is the plate,
 * which the clip covers. It needs `serve.mjs`'s range support — see the sweep.
 *
 * The fixture is 320x180 and two seconds, about 4 kB for all three files.
 * To regenerate it:
 *
 *   ffmpeg -f lavfi -i "color=c=0x14161f:s=320x180:r=12:d=2" \
 *     -filter_complex "[0:v]drawbox=x='40+30*sin(2*PI*t/2)':y=40:w=90:h=90:\
 *     color=0x2b3450@1:t=fill,format=yuv420p[v]" -map "[v]" -an \
 *     -c:v libx264 -crf 30 fixtures/hero-sample.mp4
 *
 * ONE TRAP WORTH KNOWING, because it costs an hour and looks like a broken
 * clip: Playwright drives the open-source Chromium build, which ships NO H.264.
 * An mp4-only manifest therefore gives it nothing decodable — `readyState` stays
 * 0 and `networkState` goes to NO_SOURCE *after* every byte has downloaded, with
 * nothing in the console. Everything measured here is decoding the WebM, so keep
 * a WebM entry in the manifest even when H.264 is the smaller file and leads.
 * (`serve.mjs` must also send `video/mp4` and `video/webm`; as the octet-stream
 * default the same silent refusal happens to every browser.)
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
  // Bounded, because `canplay` may already have fired before this listener is
  // attached: an unbounded wait then hangs forever, and `evaluate` has no
  // timeout of its own — the run just stops, with no failure and no message.
  // The assertions below are what report an unready clip, so timing out here is
  // the right behaviour, not a silent pass.
  await video.evaluate(
    (v) =>
      v.readyState >= 3 ||
      new Promise((r) => {
        const done = () => r();
        v.addEventListener('canplay', done, { once: true });
        setTimeout(done, 10000);
      }),
  );
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

  // ---------------------------------------------- the headline over the clip
  //
  // The one check a hero video actually needs, and the one nothing else here
  // can do: `contrast.mjs` audits the stylesheet's own tokens, and the token
  // behind this text is the dark plate — which the clip covers. Legibility now
  // depends on footage that is not in the stylesheet at all.
  //
  // Composited in a canvas rather than read off a screenshot, because that is
  // the only way to sample the *background alone*: with the copy in place the
  // brightest pixels under the headline are the headline. Same geometry as the
  // hero — object-fit: cover, then the scrim's exact stops — sampled across the
  // whole clip, because a loop is only as legible as its brightest moment.
  const measure = async () => video.evaluate(async (v, dir) => {
    const rtl = dir === 'rtl';
    const box = v.getBoundingClientRect();
    const copy = document.querySelector('.pp-lp-hero__copy > div').getBoundingClientRect();
    const W = Math.round(box.width);
    const H = Math.round(box.height);
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    // object-fit: cover — the same crop the browser paints.
    const scale = Math.max(W / v.videoWidth, H / v.videoHeight);
    const dw = v.videoWidth * scale;
    const dh = v.videoHeight * scale;
    const dx = (W - dw) / 2;
    const dy = (H - dh) / 2;

    // The scrim is READ from the page, not copied from styles.css. It differs by
    // breakpoint — horizontal on desktop, vertical and much weaker in the middle
    // at phone width — and it flips in Arabic. A hardcoded copy measured the
    // desktop scrim at every width and silently passed the case that actually
    // fails, so the gradient comes from getComputedStyle instead.
    const css = getComputedStyle(document.querySelector('.pp-lp-hero__scrim')).backgroundImage;
    // Computed values are not the source spelling: Chromium drops `to bottom`
    // (it is the default) and drops the 0%/100% positions on the end stops, so
    // a parser that demands either finds nothing.
    const stops = [...css.matchAll(/(rgba?\([^)]*\))(?:\s+([\d.]+)%)?/g)].map((m) => ({
      css: m[1],
      at: m[2] === undefined ? null : Number(m[2]) / 100,
    }));
    if (stops.length < 2) throw new Error(`could not read the scrim gradient from: ${css}`);
    // Fill the positions CSS leaves implicit: ends anchor, interior stops spread
    // evenly between their known neighbours.
    if (stops[0].at === null) stops[0].at = 0;
    if (stops[stops.length - 1].at === null) stops[stops.length - 1].at = 1;
    for (let a = 0; a < stops.length; a++) {
      if (stops[a].at !== null) continue;
      let b = a;
      while (stops[b].at === null) b++;
      const span = (stops[b].at - stops[a - 1].at) / (b - a + 1);
      for (let k = a; k < b; k++) stops[k].at = stops[a - 1].at + span * (k - a + 1);
    }
    // Direction. No keyword at all means `to bottom`, so vertical is the default
    // and horizontal is the thing that has to be stated.
    const horizontal = /\bto (left|right)\b|(^|[^\d.])(90|270)deg/.test(css);
    const vertical = !horizontal;
    const reversed = /\bto (left|top)\b|(^|[^\d.])(0deg|270deg)/.test(css) || (horizontal && rtl);
    let grad;
    if (vertical) grad = reversed ? ctx.createLinearGradient(0, H, 0, 0) : ctx.createLinearGradient(0, 0, 0, H);
    else grad = reversed ? ctx.createLinearGradient(W, 0, 0, 0) : ctx.createLinearGradient(0, 0, W, 0);
    for (const s of stops) grad.addColorStop(s.at, s.css);

    const rect = {
      x: Math.max(0, Math.round(copy.left - box.left)),
      y: Math.max(0, Math.round(copy.top - box.top)),
      w: Math.min(W, Math.round(copy.width)),
      h: Math.min(H, Math.round(copy.height)),
    };

    const chan = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    const lum = (r, g, b) => 0.2126 * chan(r / 255) + 0.7152 * chan(g / 255) + 0.0722 * chan(b / 255);

    const wasPaused = v.paused;
    v.pause();
    let brightest = 0;
    let atTime = 0;
    // Probed timestamps that actually landed. Seeking needs HTTP range support:
    // without it Chromium leaves `currentTime` at 0 and says nothing, and this
    // would sample one frame eight times while reporting it had swept the clip.
    const landed = [];
    // Eight probes across the loop: enough to catch a bright pass, cheap enough
    // to keep this a check rather than a render job.
    for (let i = 0; i < 8; i++) {
      const t = (v.duration * i) / 8;
      await new Promise((r) => {
        let done = false;
        const fin = () => {
          if (!done) {
            done = true;
            r();
          }
        };
        // `seeked` fires before the decoded frame is available to drawImage;
        // requestVideoFrameCallback is the one that means "there is a frame".
        if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(() => fin());
        v.addEventListener('seeked', () => setTimeout(fin, 60), { once: true });
        setTimeout(fin, 1500);
        v.currentTime = t;
      });
      if (Math.abs(v.currentTime - t) < 0.5) landed.push(t);
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(v, dx, dy, dw, dh);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
      const px = ctx.getImageData(rect.x, rect.y, rect.w, rect.h).data;
      for (let p = 0; p < px.length; p += 4) {
        const l = lum(px[p], px[p + 1], px[p + 2]);
        if (l > brightest) {
          brightest = l;
          atTime = t;
        }
      }
    }
    if (!wasPaused) await v.play().catch(() => {});
    return { brightest, atTime, rect, landed, probes: 8 };
  }, await page.evaluate(() => document.documentElement.dir));


  // Both breakpoints. The phone scrim is a different gradient over a copy block
  // that runs the full width, so desktop passing says nothing about it — which
  // is exactly the case a bright clip fails first.
  for (const [label, width, height] of [['desktop', 1440, 900], ['phone', 390, 844]]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(250);
    const legibility = await measure();
    // A sweep that only covered one frame is not a sweep; say so rather than
    // reporting a pass that was never earned.
    if (legibility.landed.length < legibility.probes) {
      fail(
        `${label}: only ${legibility.landed.length}/${legibility.probes} timestamps were reachable — the ` +
          'server is not answering range requests, so this swept one frame, not the clip',
      );
    }

    // The two inks that sit on the clip, from styles.css.
    const INKS = [['headline', 0xfb, 0xf9, 0xf4], ['lede', 0xc8, 0xcd, 0xdb]];
    const chan = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    for (const [name, r, g, b] of INKS) {
      const inkLum = 0.2126 * chan(r / 255) + 0.7152 * chan(g / 255) + 0.0722 * chan(b / 255);
      const ratio = (inkLum + 0.05) / (legibility.brightest + 0.05);
      if (ratio < 4.5) {
        fail(`${label}: ${name} drops to ${ratio.toFixed(2)}:1 over the clip at t=${legibility.atTime.toFixed(1)}s — below AA`);
      } else {
        ok(`${label}: ${name} holds ${ratio.toFixed(2)}:1 at the clip's brightest (t=${legibility.atTime.toFixed(1)}s)`);
      }
    }
  }

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
