/**
 * Audits the text colours declared in app/src/styles.css against the surfaces
 * they are actually used on. Secondary text must stay readable — the old
 * --pp-muted sat at 3.2:1 on white and read as disabled.
 *
 *   node contrast.mjs
 *
 * Every pair below must clear WCAG AA for normal text (4.5:1). Add a pair here
 * whenever a new ink token starts appearing on a new surface.
 */
import { readFileSync } from 'node:fs';

const css = readFileSync('../app/src/styles.css', 'utf8');
const token = (name) => {
  const m = new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{3,8})`).exec(css);
  if (!m) throw new Error(`token --${name} not found in styles.css`);
  return m[1];
};

const lin = (c) => (c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
const lum = (hex) => {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

const WHITE = '#ffffff';
/* There is no white surface in this system: the raised sheet is --pp-card and
   the ground is --pp-bg-2, both warm. Every ink is checked on all three of the
   surfaces it can land on, plus the dark plate. */
const PAPER = token('pp-bg-2');
const SHEET = token('pp-card');
const PLATE = token('pp-dark');
const PAIRS = [
  ['ink on paper', token('pp-ink'), PAPER],
  ['ink on sheet', token('pp-ink'), SHEET],
  ['ink-2 on paper', token('pp-ink-2'), PAPER],
  ['ink-2 on sheet', token('pp-ink-2'), SHEET],
  ['muted on paper', token('pp-muted'), PAPER],
  ['muted on sheet', token('pp-muted'), SHEET],
  ['muted on tile', token('pp-muted'), token('pp-subtle')],
  ['muted on data card', token('pp-muted'), token('pp-subtle-2')],
  ['muted on insight card', token('pp-muted'), token('pp-brand-wash')],
  ['brand text on paper', token('pp-brand-ink'), PAPER],
  ['brand text on sheet', token('pp-brand-ink'), SHEET],
  ['brand text on insight card', token('pp-brand-ink'), token('pp-brand-wash')],
  ['brand text on brand-soft', token('pp-brand-ink'), token('pp-brand-soft')],
  ['violet text on sheet', token('pp-brand-2-ink'), SHEET],
  ['violet badge on violet-soft', token('pp-brand-2-ink'), token('pp-brand-2-soft')],
  ['positive figure on paper', token('pp-pos'), PAPER],
  ['positive figure on sheet', token('pp-pos'), SHEET],
  ['positive figure on tile', token('pp-pos'), token('pp-subtle')],
  ['positive badge on pos-soft', token('pp-pos-ink'), token('pp-pos-soft')],
  ['negative figure on sheet', token('pp-neg'), SHEET],
  ['negative badge on neg-soft', token('pp-neg-ink'), token('pp-neg-soft')],
  ['warn badge on warn-soft', token('pp-warn-ink'), token('pp-warn-soft')],
  ['neutral badge on neutral-soft', token('pp-ink-2'), token('pp-neutral-soft')],
  ['white on brand button', WHITE, token('pp-brand')],
  ['paper on ink button', PAPER, token('pp-ink')],

  // The dark plate: the inverted card, the recommended scenario, the hero.
  ['plate ink on plate', token('pp-on-dark'), PLATE],
  ['plate muted on plate', token('pp-on-dark-muted'), PLATE],
  ['plate positive on plate', token('pp-pos-dark'), PLATE],
];

let worst = Infinity;
let failed = 0;
for (const [label, fg, bg] of PAIRS) {
  const f = fg.startsWith('#') ? fg : token(fg);
  const r = ratio(f, bg);
  worst = Math.min(worst, r);
  const ok = r >= 4.5;
  if (!ok) failed++;
  console.log(`${ok ? '✓' : '✗'} ${label.padEnd(32)} ${f} on ${bg}  ${r.toFixed(2)}:1`);
}
console.log(`\n${PAIRS.length - failed}/${PAIRS.length} pairs pass AA (4.5:1) · worst ${worst.toFixed(2)}:1`);
process.exit(failed ? 1 : 0);
