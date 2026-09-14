/**
 * Cut a video to the landing hero's background spec.
 *
 *   node tools/hero-clip.mjs <file> [--loop-blend=1] [--start=0]
 *
 * Writes three files into `app/public/`, which is what the manifest in
 * `app/src/app/shared/hero-clip.ts` already names, so nothing else changes:
 *
 *   hero.mp4          H.264 — what almost everything plays
 *   hero.webm         VP9 — roughly a third smaller where it is supported
 *   hero-poster.jpg   the first frame: shown while the clip loads, and instead
 *                     of it when the reader has asked for reduced motion
 *
 * Then set `HERO_CLIP` in the manifest to the descriptor beside it. Until you
 * do, the hero paints the CSS plate and makes no request.
 *
 * Why the spec is what it is: the clip sits under a scrim between 32% and 94%
 * opaque, so most of its detail is thrown away before anyone sees it. It is cut
 * for that — dark, twelve seconds, no fast motion, and no audio track at all
 * (a muted autoplaying video that still carries audio is blocked by some
 * autoplay policies). A bitrate that would be indefensible for footage anyone
 * looks at directly is right here.
 *
 * There is deliberately no "generate me one" mode. A synthesised gradient is
 * what `.pp-lp-hero__plate` already draws in eight lines of CSS, for no bytes;
 * encoding the same picture as video only adds a download. The one thing a clip
 * adds — grain and real movement — is also the one thing that does not compress:
 * a 12s 720p loop with film grain lands at 4.5 MB. Either the footage is worth
 * that, or the CSS is better. Both are honest; a fake clip is not.
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

function buildFilter({ start, blend }) {
  // cover, not contain: the hero is full-bleed at the window's aspect ratio, so
  // anything letterboxed here shows as bars behind the headline.
  const fit =
    `fps=${FPS},scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1`;
  const take = `trim=${start}:${start + SECONDS},setpts=PTS-STARTPTS`;

  if (!blend) return `[0:v]${fit},${take},format=yuv420p[v]`;

  // Arbitrary footage does not loop, and the hard cut back to frame one is the
  // thing that reads as cheap. Cross-dissolve the last `blend` seconds over the
  // first, which costs that much length and hides the seam.
  const keep = SECONDS - blend;
  // The trailing `fps` on each branch is not redundant: `trim` drops the frame
  // rate from the stream's metadata, and xfade refuses an input whose rate it
  // cannot read ("current rate of 1/0 is invalid").
  return [
    `[0:v]${fit},${take}[all]`,
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
  console.error('Usage: node tools/hero-clip.mjs <file> [--loop-blend=1] [--start=0]');
  process.exit(1);
}
if (!existsSync(resolve(source))) {
  console.error(`No such file: ${source}`);
  process.exit(1);
}

const blend = flag('loop-blend', 0);
const start = flag('start', 0);
if (blend < 0 || blend >= SECONDS) {
  console.error(`--loop-blend must be between 0 and ${SECONDS}.`);
  process.exit(1);
}

write(ffmpegPath(), resolve(source), buildFilter({ start, blend }), start);
