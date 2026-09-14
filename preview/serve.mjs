/**
 * A static file server, so `verify.mjs` can be pointed at a real Angular build
 * without the repo taking a dependency to do it.
 *
 *   node serve.mjs ../app/dist/profitpath/browser 4173
 *
 * Deliberately minimal: the verification only ever loads `/` and then navigates
 * by clicking, so there is no SPA fallback to get right and no routing to model.
 * It serves what is on disk, refuses anything outside the root, and stops on
 * SIGINT/SIGTERM so a CI step can background it and move on.
 */
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';

const root = resolve(process.argv[2] ?? '.');
const port = Number(process.argv[3] ?? 4173);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.map': 'application/json; charset=utf-8',
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  // normalize collapses `..` before the prefix check, so a traversal cannot
  // escape the root by spelling it differently.
  let path = join(root, normalize(decodeURIComponent(url.pathname)));
  if (path !== root && !path.startsWith(root + sep)) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  try {
    let info = await stat(path);
    if (info.isDirectory()) {
      path = join(path, 'index.html');
      info = await stat(path);
    }
    const headers = {
      'Content-Type': TYPES[extname(path)] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
      // Range support is not a nicety once media is served: without it Chromium
      // refuses to seek a <video> at all — `currentTime` silently stays at 0 —
      // and a check that samples across a clip samples one frame instead, while
      // reporting that it sampled the clip. That is how this got noticed.
      'Accept-Ranges': 'bytes',
    };

    const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? '');
    if (range && (range[1] || range[2])) {
      // A suffix range (`bytes=-500`) counts back from the end; an absent end
      // means "to the last byte".
      const [start, end] = range[1]
        ? [Number(range[1]), range[2] ? Math.min(Number(range[2]), info.size - 1) : info.size - 1]
        : [Math.max(0, info.size - Number(range[2])), info.size - 1];
      if (start > end || start >= info.size) {
        res.writeHead(416, { 'Content-Range': `bytes */${info.size}` }).end();
        return;
      }
      res.writeHead(206, {
        ...headers,
        'Content-Range': `bytes ${start}-${end}/${info.size}`,
        'Content-Length': end - start + 1,
      });
      createReadStream(path, { start, end }).pipe(res);
      return;
    }

    res.writeHead(200, { ...headers, 'Content-Length': info.size });
    createReadStream(path).pipe(res);
  } catch {
    res.writeHead(404).end('Not found');
  }
});

server.listen(port, () => console.log(`serving ${root} on http://localhost:${port}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
