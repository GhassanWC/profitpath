/**
 * Renders the hero's background clip — the one that ships in `app/public/`.
 *
 *   node tools/ledger-clip.mjs [out.mp4]     then: node tools/hero-clip.mjs <out.mp4>
 *
 * A checked-in binary nobody can regenerate is a dead end, so this is the whole
 * recipe. It writes a high-quality master; `hero-clip.mjs` cuts that to the
 * hero's delivery spec, exactly as it would cut footage from a camera.
 *
 * WHAT IT DRAWS, and why this rather than a gradient: `.pp-lp-hero__plate`
 * already paints a drifting two-light gradient in CSS, for no bytes, so a clip
 * of the same thing would be a heavier copy of what is there. This draws what
 * CSS cannot — raking light moving across a ruled ledger sheet:
 *
 *   ground   the plate's own diagonal ramp, drifting a little
 *   rules    a ledger's horizontal rules and money columns, drifting more
 *   lights   two cool pools, drifting the other way
 *
 * The rules are MULTIPLIED by the lights, so they exist only where the light
 * falls; as the pools drift the ruling surfaces and fades like paper catching
 * light at an angle. Parallax between the three layers is what sells it as a
 * surface rather than a texture.
 *
 * The lights sit right of centre on purpose. The scrim over this runs from 94%
 * opaque on the reading side to 32% on the other, so the right of the frame is
 * the only part anyone actually sees — putting the interest anywhere else is
 * rendering for a region the design covers up.
 *
 * SEAMLESS: every drift completes exactly one cycle over the duration — the
 * sines by construction, the rules by travelling exactly one rule period — so
 * the last frame hands back to the first with no cut. `hero-clip.mjs` therefore
 * needs no `--loop-blend` here.
 *
 * It stays under 550 kB because it is smooth: grain is what does not compress,
 * and the grain in this hero is the CSS layer above the clip, which costs
 * nothing. Adding film grain to the video took the same 12 seconds to 4.5 MB.
 *
 * Needs ffmpeg (see hero-clip.mjs for where it is found). Nothing else does.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

/** Rendered oversized, so the drift crop never reaches an edge. */
const SRC_W = 2600;
const SRC_H = 1700;
const W = 1600;
const H = 900;
const FPS = 24;
const SECONDS = 12;
/** Rule spacing. The rules travel exactly this far, so the loop closes. */
const PERIOD = 46;

function ffmpegPath() {
  if (process.env.FFMPEG) return process.env.FFMPEG;
  try {
    const found = execFileSync('sh', ['-c', 'command -v ffmpeg'], { encoding: 'utf8' }).trim();
    if (found) return found;
  } catch {
    /* not on PATH */
  }
  try {
    return createRequire(import.meta.url)('ffmpeg-static');
  } catch {
    console.error('No ffmpeg. Install it, or `npm i -g ffmpeg-static`, or set $FFMPEG.');
    process.exit(1);
  }
}

function run(ff, args) {
  try {
    execFileSync(ff, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' });
  } catch {
    console.error('\nffmpeg failed — see above.');
    process.exit(1);
  }
}

/** Soft elliptical falloff, the same shape the CSS plate's radial stops make. */
const pool = (cx, cy, rx, ry) =>
  `clip(1-hypot((X-${cx}*W)/(${rx}*W),(Y-${cy}*H)/(${ry}*H)),0,1)^1.5`;

/** Position along the 146deg diagonal, 0 at one corner and 1 at the far one. */
const DIAG = '(0.56*X/W+0.83*Y/H)/1.39';
/** #10121a -> #191c26 at 52% -> #0e1016, as one expression per channel. */
const ramp = (a, b, c) =>
  `(${a}+${b - a}*min(${DIAG},0.52)/0.52+${c - b}*max(${DIAG}-0.52,0)/0.48)`;

const ff = ffmpegPath();
const out = resolve(process.argv[2] ?? 'hero-master.mp4');
const tmp = mkdtempSync(join(tmpdir(), 'ledger-'));

try {
  const ground = join(tmp, 'ground.png');
  const rules = join(tmp, 'rules.png');
  const lights = join(tmp, 'lights.png');

  console.log('drawing the ground…');
  run(ff, [
    '-f', 'lavfi', '-i', `color=c=black:s=${SRC_W}x${SRC_H}`,
    '-vf', `geq=r='${ramp(16, 25, 14)}':g='${ramp(18, 28, 16)}':b='${ramp(26, 38, 22)}'`,
    '-frames:v', '1', ground,
  ]);

  console.log('ruling the sheet…');
  // Full-white lines: they carry no colour of their own, because the multiply
  // below takes it from the light — the same rule the illustrations follow.
  run(ff, [
    '-f', 'lavfi', '-i', `color=c=black:s=${SRC_W}x${SRC_H}`,
    '-vf', `drawgrid=w=0:h=${PERIOD}:t=1:c=white@1.0,drawgrid=w=433:h=0:t=1:c=white@0.55`,
    '-frames:v', '1', rules,
  ]);

  console.log('placing the lights…');
  const a = pool(0.58, 0.3, 0.46, 0.6);
  const b = pool(0.74, 0.74, 0.4, 0.54);
  run(ff, [
    '-f', 'lavfi', '-i', `color=c=black:s=${SRC_W}x${SRC_H}`,
    '-vf', `geq=r='43*${a}+21*${b}':g='54*${a}+65*${b}':b='88*${a}+108*${b}'`,
    '-frames:v', '1', lights,
  ]);

  const phase = `2*PI*t/${SECONDS}`;
  /** One sine cycle over the duration on each axis: an ellipse, ending where it began. */
  const drift = (ampX, ampY, offX, offY) =>
    `crop=${W}:${H}:x='(in_w-out_w)/2+${ampX}*sin(${phase}${offX})':y='(in_h-out_h)/2+${ampY}*sin(${phase}${offY})'`;

  console.log('rendering…');
  // format=gbrp before every blend. Left in YUV, `multiply` and `screen` run on
  // the chroma planes and the frame comes out saturated magenta — it looks like
  // a colour-grade bug and is really a pixel-format one.
  const filter = [
    `[0:v]${drift(40, 26, '', '+PI/2')},setsar=1,format=gbrp[g]`,
    // The rules travel linearly, not sinusoidally: exactly one rule period over
    // the duration, so the sheet appears to creep steadily and still loops.
    `[1:v]crop=${W}:${H}:x='(in_w-out_w)/2+70*sin(${phase})':y='(in_h-out_h)/2+${PERIOD}*t/${SECONDS}',setsar=1,format=gbrp[r]`,
    `[2:v]${drift(180, 110, '+PI', '-PI/2')},setsar=1,format=gbrp,split=2[l1][l2]`,
    `[r][l1]blend=all_mode=multiply[lit]`,
    `[g][l2]blend=all_mode=screen:all_opacity=0.62[base]`,
    `[base][lit]blend=all_mode=screen:all_opacity=1.0[c]`,
    `[c]vignette=PI/4.5,format=yuv420p[v]`,
  ].join(';');

  const still = (p) => ['-loop', '1', '-framerate', String(FPS), '-t', String(SECONDS), '-i', p];
  run(ff, [
    ...still(ground), ...still(rules), ...still(lights),
    '-filter_complex', filter, '-map', '[v]', '-an',
    // A near-lossless master: hero-clip.mjs does the lossy pass, and stacking
    // two of those on a gradient is what produces banding.
    '-c:v', 'libx264', '-crf', '14', '-preset', 'slow', '-pix_fmt', 'yuv420p', out,
  ]);

  console.log(`\n  ${out}`);
  console.log('\nNow cut it to the hero spec:');
  console.log(`  node tools/hero-clip.mjs ${out}`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
