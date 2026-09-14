import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const css = readFileSync('utilities.css', 'utf8') + '\n' + readFileSync('../app/src/styles.css', 'utf8');
const engine = readFileSync('engine.bundle.js', 'utf8');
const i18n = readFileSync('i18n.bundle.js', 'utf8');
const app = readFileSync('app.js', 'utf8');

/**
 * The icon set is shared with the Angular app rather than duplicated. That file
 * is deliberately plain data — no type annotations, no imports — so stripping
 * the `export ` keyword is all it takes to reuse it here.
 */
const icons = readFileSync('../app/src/app/shared/icons.ts', 'utf8').replace(/^export /gm, '');
/* The landing drawings ride along the same way, for the same reason. */
const art = readFileSync('../app/src/app/shared/illustrations.ts', 'utf8').replace(/^export /gm, '');
/* And the hero clip's manifest, so both surfaces agree on whether one exists. */
const heroClip = readFileSync('../app/src/app/shared/hero-clip.ts', 'utf8').replace(/^export /gm, '');

const head = `<title>ProfitPath</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Instrument+Serif:ital@0;1&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>${css}
body { color-scheme: light; }
</style>`;
/* The catalogue loads before the app so the very first paint is already in the
   reader's language — there is no English flash to correct. */
const body = `<div id="app"></div>
<script>${icons}</script>
<script>${art}</script>
<script>${heroClip}</script>
<script>${engine}</script>
<script>${i18n}</script>
<script>${app}</script>`;

mkdirSync('dist', { recursive: true });
writeFileSync('dist/profitpath-artifact.html', head + '\n' + body);
/* `lang` and `dir` are the English defaults; the app rewrites both on <html>
   from the reader's stored choice before it renders. */
writeFileSync('dist/profitpath-preview.html', `<!doctype html><html lang="en" dir="ltr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${head}</head><body>${body}</body></html>`);
console.log('built');
