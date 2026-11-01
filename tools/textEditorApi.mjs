// The text editor's save route (GAME_DESIGN.md §9.1), a Vite plugin.
//
// Only under `npm run dev` (apply: 'serve'): a built game never has it. It
// reads and writes exactly two files, the game's text JSON, and nothing else:
//   GET  /__texts/grandma.json    -> the file
//   POST /__texts/grandma.json    <- the new contents (must be a JSON object)
// Plain JavaScript (not TypeScript) because it needs Node's file APIs, which
// the game's TypeScript setup doesn't include.
import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const TEXTS_DIR = fileURLToPath(new URL('../src/data/texts/', import.meta.url));
const FILES = new Set(['grandma.json', 'customers.json']);

export function textEditorApi() {
  return {
    name: 'woodland-text-editor-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__texts', (req, res) => {
        const name = (req.url ?? '').replace(/^\//, '').split('?')[0];
        if (!FILES.has(name)) {
          res.statusCode = 404;
          res.end('Unknown text file');
          return;
        }
        const file = TEXTS_DIR + name;
        if (req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json');
          res.end(readFileSync(file, 'utf8'));
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
          if (!data || typeof data !== 'object' || Array.isArray(data)) {
            res.statusCode = 400;
            res.end('Not a JSON object');
            return;
          }
          // Write to a temporary file, then swap it in: a half-written text
          // file can never break the game.
          writeFileSync(file + '.tmp', JSON.stringify(data, null, 2) + '\n');
          renameSync(file + '.tmp', file);
          res.end('Saved');
        });
      });
    },
  };
}
