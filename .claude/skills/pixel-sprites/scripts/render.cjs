// Renders sprites from a game sprite file, big, to a PNG you can Read: the
// way to look at a sprite (and compare it with the user's screenshot) before
// and after a fix. Each sprite uses its own legend.
// Usage: node render.cjs <src/art/sprites/file.ts> <NAME[,NAME...]> <out.png> [scale=8] [frames=0,3,6,9 | all] [--bg #rrggbb]
//   frames: which frames (four-view critters: 0 front, 3 back, 6 left, 9 right standing)
//   --bg: a flat background instead of the checkerboard (e.g. the floor colour)
const P = require('./pixel.cjs');
const [file, names, out, scale = '8', frames = '0,3,6,9', ...rest] = process.argv.slice(2);
const bgAt = rest.indexOf('--bg');
const items = [];
for (const name of names.split(',')) {
  const s = P.readSprite(file, name);
  const want = frames === 'all' ? s.frames.map((_, i) => i) : frames.split(',').map(Number).filter((i) => i < s.frames.length);
  for (const i of want) items.push({ rows: s.frames[i], legend: s.legend });
  for (const p of P.problems(s.frames[0])) console.log(`${name}: ${p}`);
}
P.preview(out, items, { scale: +scale, perRow: frames === 'all' ? 3 : 4, background: bgAt >= 0 ? rest[bgAt + 1] : undefined });
console.log(`wrote ${out} (${items.length} frames)`);
