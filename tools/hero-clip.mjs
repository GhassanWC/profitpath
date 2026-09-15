/**
 * Cut a video to the landing hero's background spec.
 *
 *   node tools/hero-clip.mjs <file> [--loop-blend=1] [--start=0] [--dim=0.35]
 *
 * Writes three files into `app/public/`, which is what the manifest in
 * `app/src/app/shared/hero-clip.ts` already names, so nothing else changes:
 *
 *   hero.mp4          H.264 — what everything plays
 *   hero.webm         VP9 — usually smaller, but NOT always: on detailed
 *                     live-action it can lose to H.264 outright, and the
 *                     browser takes the first source it can play. Both sizes
 *                     are printed, and a warning names the case where listing
 *                     WebM first would serve most people the bigger file.
 *   hero-poster.jpg   the first frame: shown while the clip loads, and instead
 *                     of it when the reader has asked for reduced motion
 *
 * Then set `HERO_CLIP` in the manifest to the descriptor beside it. Until you
 * do, the hero paints the CSS plate and makes no request.
 *
 * `--dim` grades the footage down so the copy over it stays legible; `--width`
 * overrides the output size, which otherwise caps at what the source can fill
 * natively rather than upscaling portrait phone footage into a landscape frame.
 * `preview/hero-video.mjs` measures the result at both breakpoints — run it
 * after cutting a clip, and let it pick the `--dim` rather than guessing.
 *
 * Why the spec is what it is: the clip sits under a scrim between 32% and 94%
 * opaque, so most of its detail is thrown away before anyone sees it. It is cut
 * for that — dark, twelve seconds, no fast motion, and no audio track at all
 * (a muted autoplaying video that still carries audio is blocked by some
 * autoplay policies). A bitrate that would be indefensible for footage anyone
 * looks at directly is right here.
 *
 * This cuts footage; it does not invent any. `tools/ledger-clip.mjs` draws a
 * clip from scratch, and its output comes through here like anything else. The
 * line between them is worth keeping: a synthesised *gradient* would
 * be pointless — `.pp-lp-hero__plate` draws one in eight lines of CSS for no
 * bytes — so what that script draws is the thing CSS cannot, light moving across
 * a ruled sheet. Film grain is the other tempting addition and the one to
 * refuse: it is incompressible, and adding it took the same 12 seconds from
 * 410 kB to 4.5 MB. The grain in this hero is a CSS layer above the clip.
 *
 * ffmpeg comes from $FFMPEG, then PATH, then `ffmpeg-static` if it happens to be
 * installed. It is not a dependency of the app or of the checks — the outputs
 * are committed, and this runs only when they need regenerating.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'app/public');

/** 1600x900 at 24fps for twelve seconds. See the note on the spec above. */
const W = 1600;
const H = 900;
const FPS = 24;
const SECONDS = 12;

function ffmpegPath() {
  if (process.env.FFMPEG) return process.env.FFMPEG;
  try {
    const found = execFileSync('sh', ['-c', 'command -v ffmpeg'], { encoding: 'utf8' }).trim();
    if (found) return found;
  } catch {
    /* not on PATH; try the npm package */
  }
  try {
    return createRequire(import.meta.url)('ffmpeg-static');
  } catch {
    console.error(
      'No ffmpeg. Install it from your package manager, or `npm i -g ffmpeg-static`, or\n' +
        'point $FFMPEG at a binary. Nothing else in this repo needs it.',
    );
    process.exit(1);
  }
}

/**
 * The source's pixel dimensions, read back from ffmpeg's own report.
 *
 * `-i` alone exits non-zero ("At least one output file must be specified"),
 * which is expected — the dimensions are on stderr either way.
 */
function probe(ff, source) {
  let out = '';
  try {
    execFileSync(ff, ['-hide_banner', '-i', source], { encoding: 'utf8', stdio: 'pipe' });
  } catch (e) {
    out = `${e.stderr ?? ''}`;
  }
  const m = /Stream #\d+:\d+.*Video:.*?, (\d+)x(\d+)/.exec(out);
  return m ? { w: Number(m[1]), h: Number(m[2]) } : null;
}

function run(ff, args) {
  try {
    execFileSync(ff, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' });
  } catch {
    // ffmpeg has already printed why on stderr; a Node stack on top of it only
    // buries the line that matters.
    console.error('\nffmpeg failed — see above.');
    process.exit(1);
  }
}

// --------------------------------------------------------------------- filter

function buildFilter({ start, blend, dim, out }) {
  // cover, not contain: the hero is full-bleed at the window's aspect ratio, so
  // anything letterboxed here shows as bars behind the headline.
  const fit =
    `fps=${FPS},scale=${out.w}:${out.h}:force_original_aspect_ratio=increase,crop=${out.w}:${out.h},setsar=1`;
  const take = `trim=${start}:${start + SECONDS},setpts=PTS-STARTPTS`;

  // Grading the footage down, rather than deepening the scrim, is what keeps a
  // bright clip legible without changing the design for every other clip. It is
  // a straight multiply in RGB — the same arithmetic as laying black over it at
  // `dim` opacity — so the effect is predictable: luminance falls by roughly
  // (1-dim)^2.2, and `preview/hero-video.mjs` reports what it actually bought.
  // Applied before the loop blend so the cross-dissolve grades with it.
  const k = (1 - dim).toFixed(4);
  const grade = dim ? `,colorchannelmixer=rr=${k}:gg=${k}:bb=${k}` : '';

  if (!blend) return `[0:v]${fit},${take}${grade},format=yuv420p[v]`;

  // Arbitrary footage does not loop, and the hard cut back to frame one is the
  // thing that reads as cheap. Cross-dissolve the last `blend` seconds over the
  // first, which costs that much length and hides the seam.
  const keep = SECONDS - blend;
  // The trailing `fps` on each branch is not redundant: `trim` drops the frame
  // rate from the stream's metadata, and xfade refuses an input whose rate it
  // cannot read ("current rate of 1/0 is invalid").
  return [
    `[0:v]${fit},${take}${grade}[all]`,
    `[all]split=2[a][b]`,
    `[a]trim=0:${keep},setpts=PTS-STARTPTS,fps=${FPS}[head]`,
    `[b]trim=${keep}:${SECONDS},setpts=PTS-STARTPTS,fps=${FPS}[tail]`,
    `[head][tail]xfade=transition=fade:duration=${blend}:offset=${keep - blend}[faded]`,
    `[faded]format=yuv420p[v]`,
  ].join(';');
}

// --------------------------------------------------------------------- output

function write(ff, source, filter, start) {
  mkdirSync(OUT, { recursive: true });
  const mp4 = resolve(OUT, 'hero.mp4');
  const webm = resolve(OUT, 'hero.webm');
  const poster = resolve(OUT, 'hero-poster.jpg');

  // `-stream_loop -1` so a source shorter than the window fills it by repeating
  // rather than failing halfway through the filter graph. Footage longer than
  // the window never reaches the second pass, so this costs nothing there. The
  // input `-t` is what stops the infinite stream.
  const common = [
    '-stream_loop', '-1', '-t', String(start + SECONDS), '-i', source,
    '-filter_complex', filter, '-map', '[v]', '-an',
  ];

  console.log('encoding hero.mp4…');
  run(ff, [
    ...common,
    '-c:v', 'libx264', '-profile:v', 'high', '-crf', '28', '-preset', 'slow',
    '-pix_fmt', 'yuv420p', '-g', String(FPS * 2), '-movflags', '+faststart', mp4,
  ]);

  console.log('encoding hero.webm…');
  run(ff, [
    ...common,
    '-c:v', 'libvpx-vp9', '-crf', '34', '-b:v', '0', '-row-mt', '1', '-deadline', 'good', webm,
  ]);

  console.log('extracting the poster…');
  run(ff, ['-i', mp4, '-frames:v', '1', '-q:v', '4', poster]);

  const kb = (p) => `${Math.round(statSync(p).size / 1024)} kB`;
  console.log('');
  console.log(`  app/public/hero.mp4        ${kb(mp4)}`);
  console.log(`  app/public/hero.webm       ${kb(webm)}`);
  console.log(`  app/public/hero-poster.jpg ${kb(poster)}`);

  // The manifest's source ORDER is a preference, not a fallback chain: the
  // browser takes the first entry it can play. VP9 usually wins on the smooth
  // dark footage this hero wants, but on detailed live-action it can lose to
  // H.264 outright, and then leading with WebM hands most people the bigger
  // file. Keep both either way — the open-source Chromium build ships no H.264,
  // so an mp4-only manifest leaves it with nothing to decode.
  if (statSync(webm).size >= statSync(mp4).size) {
    console.warn(
      `\nhero.webm (${kb(webm)}) is larger than hero.mp4 (${kb(mp4)}) for this clip, so put\n` +
        'the mp4 source FIRST in app/src/app/shared/hero-clip.ts. Keep the webm entry\n' +
        'behind it: browsers without H.264 have nothing else to play.',
    );
  }
  console.log('');
  console.log('Now set HERO_CLIP in app/src/app/shared/hero-clip.ts, and rebuild the');
  console.log('preview so both surfaces agree:  cd preview && node build.mjs');

  const mb = statSync(mp4).size / 1e6;
  if (mb > 2.5) {
    console.warn(
      `\nhero.mp4 is ${mb.toFixed(1)} MB. It is a background: if the footage has grain or\n` +
        'fast motion it will not compress, and the CSS plate is the better trade.',
    );
  }
}

// ------------------------------------------------------------------------ cli

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const hit = argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return fallback;
  const value = hit.includes('=') ? Number(hit.split('=')[1]) : 1;
  return Number.isFinite(value) ? value : fallback;
};

const source = argv.find((a) => !a.startsWith('--'));
if (!source) {
  console.error('Usage: node tools/hero-clip.mjs <file> [--loop-blend=1] [--start=0] [--dim=0.35] [--width=1600]');
  process.exit(1);
}
if (!existsSync(resolve(source))) {
  console.error(`No such file: ${source}`);
  process.exit(1);
}

const blend = flag('loop-blend', 0);
const start = flag('start', 0);
const dim = flag('dim', 0);
const widthOverride = flag('width', 0);
if (blend < 0 || blend >= SECONDS) {
  console.error(`--loop-blend must be between 0 and ${SECONDS}.`);
  process.exit(1);
}
if (dim < 0 || dim >= 1) {
  console.error('--dim must be between 0 and 1 (0.35 knocks the footage back by a third).');
  process.exit(1);
}

const ff = ffmpegPath();
const src = probe(ff, resolve(source));

/**
 * Never encode more pixels than the source actually has.
 *
 * A cover crop from portrait phone footage into this landscape frame upscales
 * hard — 720x1280 has to be blown up 2.2x to fill 1600x900 — and the encoder
 * then spends bits storing detail that was never in the file. Capping at what
 * the source can fill natively cut this clip from 2.3 MB to well under a third
 * with no visible difference, because the browser does the same upscale for
 * free and the whole thing sits under a scrim regardless.
 *
 * `--width` overrides, for footage where you want the headroom anyway.
 */
const out = (() => {
  if (widthOverride) {
    const w = Math.round(widthOverride / 2) * 2;
    return { w, h: Math.round((w * H) / W / 2) * 2, why: 'requested' };
  }
  if (!src) return { w: W, h: H, why: 'default (could not read the source size)' };
  // The width the source fills without stretching, given the crop keeps this frame's ratio.
  const native = Math.min(src.w, Math.round((src.h * W) / H));
  if (native >= W) return { w: W, h: H, why: 'full spec' };
  const w = Math.max(640, Math.round(native / 2) * 2);
  return { w, h: Math.round((w * H) / W / 2) * 2, why: `capped to the source's ${src.w}x${src.h}` };
})();

console.log(`source ${src ? `${src.w}x${src.h}` : 'unknown'} -> output ${out.w}x${out.h} (${out.why})`);
write(ff, resolve(source), buildFilter({ start, blend, dim, out }), start);
