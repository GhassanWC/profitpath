import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const css = readFileSync('utilities.css','utf8') + '\n' + readFileSync('../app/src/styles.css','utf8');
const engine = readFileSync('engine.bundle.js','utf8');
const app = readFileSync('app.js','utf8');
const head = `<title>ProfitPath</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>${css}
body { color-scheme: light; background: var(--pp-bg); }
@media (prefers-reduced-motion: reduce) { .pp-fade, .btn-pp, .pp-progress > div { animation: none; transition: none; } }
</style>`;
const body = `<div id="app"></div>
<script>${engine}</script>
<script>${app}</script>`;
mkdirSync('dist', { recursive: true });
writeFileSync('dist/profitpath-artifact.html', head + '\n' + body);
writeFileSync('dist/profitpath-preview.html', `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${head}</head><body>${body}</body></html>`);
console.log('built');
