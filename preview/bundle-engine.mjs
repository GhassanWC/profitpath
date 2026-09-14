// Bundles a folder of tsc (commonjs) output into one browser global.
//   node bundle-engine.mjs <dist dir> <out file> [global name]
// Used for both the engine and the i18n catalogue, so the preview runs the very
// same compiled code the Angular app does rather than a re-stripped copy.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2];
const out = process.argv[3];
const globalName = process.argv[4] ?? 'ProfitPathEngine';
const files = readdirSync(dir).filter((f) => f.endsWith('.js') && !f.endsWith('.spec.js'));
let src = `var ${globalName} = (function () {\n  var defs = {}, cache = {};\n  function req(name) {\n    var key = name.replace(/^\\.\\//, '').replace(/\\.js$/, '');\n    if (cache[key]) return cache[key].exports;\n    var module = { exports: {} };\n    cache[key] = module;\n    defs[key](module, module.exports, req);\n    return module.exports;\n  }\n`;
for (const f of files) {
  const key = f.replace(/\.js$/, '');
  src += `  defs[${JSON.stringify(key)}] = function (module, exports, require) {\n${readFileSync(join(dir, f), 'utf8')}\n  };\n`;
}
src += `  return req('./index');\n})();\n`;
writeFileSync(out, src);
console.log(`bundled ${files.length} modules -> ${out} (${(src.length / 1024).toFixed(1)} kB)`);
