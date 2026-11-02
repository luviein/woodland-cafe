// Arrange mode's save route (GAME_DESIGN.md §9.3), a Vite plugin.
//
// Only under `npm run dev` (apply: 'serve'): a built game never has it. It
// reads and writes the screens' layout files, src/data/layouts/<screen>.json,
// and nothing else:
//   GET  /__layouts/marketplace.json    -> the file ({} if there's none yet)
//   POST /__layouts/marketplace.json    <- { name: { x, y } } (whole numbers)
// Plain JavaScript (not TypeScript) because it needs Node's file APIs, which
// the game's TypeScript setup doesn't include.
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const LAYOUTS_DIR = fileURLToPath(new URL('../src/data/layouts/', import.meta.url));
/** A screen's file name: letters, digits and dashes only, so no path can sneak in. */
const FILE_NAME = /^[A-Za-z0-9-]+\.json$/;

/** { name: { x, y } } with whole-number x and y, and nothing else. */
function isLayout(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  return Object.values(data).every(
    (p) => p && typeof p === 'object' && Object.keys(p).length === 2 && Number.isInteger(p.x) && Number.isInteger(p.y),
  );
}

export function layoutApi() {
  return {
    name: 'woodland-layout-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__layouts', (req, res) => {
        const name = (req.url ?? '').replace(/^\//, '').split('?')[0];
        if (!FILE_NAME.test(name)) {
          res.statusCode = 404;
          res.end('Unknown layout file');
          return;
        }
        const file = LAYOUTS_DIR + name;
        if (req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json');
          res.end(existsSync(file) ? readFileSync(file, 'utf8') : '{}');
          return;
        }
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end();
          return;
        }
        let body = '';
        req.on('data', (chunk) => (body += chunk));
        req.on('end', () => {
          let data;
          try {
            data = JSON.parse(body);
          } catch {
            data = null;
          }
          if (!isLayout(data)) {
            res.statusCode = 400;
            res.end('Not a layout: { name: { x, y } } with whole numbers');
            return;
          }
          // Write to a temporary file, then swap it in: a half-written layout
          // file can never break the game.
          writeFileSync(file + '.tmp', JSON.stringify(data, null, 2) + '\n');
          renameSync(file + '.tmp', file);
          res.end('Saved');
        });
      });
    },
  };
}
