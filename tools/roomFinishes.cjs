// Regenerate from the supplied room sheet, decoded with pixel-sprites/decode.ps1.
// Usage: node tools/roomFinishes.cjs <1536x1024.rgb> <preview.png>
const fs = require('fs');
const P = require('../.claude/skills/pixel-sprites/scripts/pixel.cjs');
const img = P.loadRaw(process.argv[2], 1536, 1024);
// Inset crops exclude the sheet's drop shadows and surrounding backdrop.
const boxes = [
  ...[44, 230, 416, 601].flatMap(x => [[x, 110, x + 158, 281], [x, 323, x + 158, 497]]),
  [837, 110, 984, 280], [1010, 110, 1159, 280], [1183, 110, 1328, 280], [1355, 110, 1502, 280],
  [837, 325, 984, 497], [1010, 325, 1159, 497], [1183, 325, 1328, 497],
].map(([x0, y0, x1, y1]) => ({ x0, y0, x1, y1 }));
const colours = P.palette(P.samplesOf(img, boxes, { isBg: () => false }), 36);
const grids = boxes.map((box, boxIndex) => Array.from({ length: 24 }, (_, y) => Array.from({ length: 24 }, (_, x) => {
  const counts = new Map();
  for (let sy = Math.floor(box.y0 + y * (box.y1 - box.y0) / 24); sy < box.y0 + (y + 1) * (box.y1 - box.y0) / 24; sy++) {
    for (let sx = Math.floor(box.x0 + x * (box.x1 - box.x0) / 24); sx < box.x0 + (x + 1) * (box.x1 - box.x0) / 24; sx++) {
      const pixel = img.px(sx, sy);
      let best = 0, distance = Infinity;
      colours.forEach((c, i) => { const d = c.reduce((sum, v, j) => sum + (v - pixel[j]) ** 2, 0); if (d < distance) { best = i; distance = d; } });
      counts.set(best, (counts.get(best) ?? 0) + 1);
    }
  }
  const dominant = [...counts].sort((a, b) => b[1] - a[1])[0][0];
  // Keep the source's thin plank and herringbone seams when downsampling.
  if (boxIndex >= 8 && boxIndex <= 10) {
    const total = [...counts.values()].reduce((a, b) => a + b, 0);
    const seams = [...counts].filter(([i, n]) => n / total >= 0.12 && P.lum(colours[i]) < P.lum(colours[dominant]) - 12);
    if (seams.length) return seams.sort((a, b) => P.lum(colours[a[0]]) - P.lum(colours[b[0]]))[0][0];
  }
  return dominant;
})));
const { rows, legend } = P.toRows(grids, colours);
const sprites = {};
for (let i = 0; i < 4; i++) sprites[`roomWall${i + 1}`] = { legend, frames: rows.slice(i * 2, i * 2 + 2) };
for (let i = 0; i < 7; i++) sprites[`roomFloor${i + 1}`] = { legend, frames: [rows[8 + i], rows[8 + i]] };
// The generated reference has warped checker squares. Keep its two main
// colours, but rebuild an exact 6px grid so neighbouring 24px tiles join.
for (const style of [5, 6, 7]) {
  const sprite = sprites['roomFloor' + style];
  const counts = {};
  for (const char of sprite.frames[0].join('')) counts[char] = (counts[char] ?? 0) + 1;
  const checks = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([char]) => char);
  const clean = Array.from({ length: 24 }, (_, y) => Array.from({ length: 24 }, (_, x) => checks[(Math.floor(x / 6) + Math.floor(y / 6)) % 2]).join(''));
  sprite.frames = [clean, clean];
}
fs.writeFileSync('src/art/sprites/roomFinishes.ts', `// Converted from the supplied room tile sheet; regenerate with tools/roomFinishes.cjs.\nimport type { PixelSprite } from '../pixelSprite';\nexport const ROOM_FINISH_ART = ${JSON.stringify(sprites, null, 2)} as const satisfies Record<string, PixelSprite>;\n`);
P.preview(process.argv[3], Object.values(sprites).map(sprite => ({ rows: sprite.frames[0], legend: sprite.legend })), { scale: 6 });
