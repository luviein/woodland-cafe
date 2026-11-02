import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOM_FILE = fileURLToPath(new URL('../src/data/cafeRoom.json', import.meta.url));

/** A single fixed file; validation shares the game's pure room rules. */
export function roomApi() {
  return {
    name: 'woodland-room-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__room', async (req, res) => {
        if ((req.url ?? '').split('?')[0] !== '/cafe-room.json') { res.statusCode = 404; res.end('Unknown room'); return; }
        res.setHeader('Content-Type', 'application/json');
        if (req.method === 'GET') { res.end(readFileSync(ROOM_FILE, 'utf8')); return; }
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return; }
        let body = '';
        try {
          for await (const chunk of req) {
            body += chunk;
            if (body.length > 65536) { res.statusCode = 413; res.end(JSON.stringify({ error: 'Room request too large' })); return; }
          }
          let data;
          try { data = JSON.parse(body); } catch { data = null; }
          const { isRoomSaveInput, roomProblems } = await server.ssrLoadModule('/src/logic/roomPainter.ts');
          if (!isRoomSaveInput(data)) { res.statusCode = 400; res.end(JSON.stringify({ error: 'Invalid room data' })); return; }
          const errors = roomProblems(data.rows, data.placed);
          if (errors.length) { res.statusCode = 400; res.end(JSON.stringify({ error: errors.join('\n') })); return; }
          const current = JSON.parse(readFileSync(ROOM_FILE, 'utf8'));
          if (JSON.stringify(data.base) !== JSON.stringify(current)) {
            res.statusCode = 409; res.end(JSON.stringify({ error: 'The room changed on disk. Reset to reload it before saving.' })); return;
          }
          writeFileSync(ROOM_FILE + '.tmp', JSON.stringify(data.rows, null, 2) + '\n');
          renameSync(ROOM_FILE + '.tmp', ROOM_FILE);
          res.end(JSON.stringify({ ok: true }));
        } catch (error) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Unable to save room' }));
        }
      });
    },
  };
}
