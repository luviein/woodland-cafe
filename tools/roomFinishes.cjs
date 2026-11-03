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
// Crisp wallpaper motifs and continuous, evenly spaced wood panelling.
// Keep the supplied festive garland, but remove conversion noise elsewhere.
for (const style of [1, 2, 3, 4]) {
  const old = sprites['roomWall' + style];
  const shades = style === 3 ? ['#943139', '#863035', '#d57868'] : style === 4 ? ['#455d37', '#52683e', '#73884d'] : ['#f2d3a9', '#edc79a', '#dbaa79'];
  const cleanLegend = { ...old.legend, 0: shades[0], 1: shades[1], 2: shades[2], 3: '#8d503b', 4: '#633c30', 5: '#b97050', 6: '#29485d', 7: '#a77850', 8: '#f4e2bb', 9: '#a43a3a', '!': '#f0b68b' };
  const make = window => Array.from({ length: 24 }, (_, y) => Array.from({ length: 24 }, (_, x) => {
    if (y >= 18) {
      if (y === 18) return '5';
      if (y === 19 || (x % 8 === 0 && y >= 20)) return '4';
      return '3';
    }
    if (window && x >= 5 && x <= 18 && y >= 5 && y <= 16) {
      if (x === 5 || x === 18 || y === 5 || y === 16) return '4';
      if (x === 6 || x === 17 || y === 6 || y === 15 || x === 11 || y === 10) return '7';
      return (x === 8 && y === 8) || (x === 14 && y === 13) ? '8' : '6';
    }
    if (style === 2 && y < 6) return old.frames[0][y][x];
    const mx = x % 12 - 6, my = y % 8 - 4;
    if (style === 3) {
      // Four rounded petals and a warm centre remain readable on a 24px tile.
      if (mx === 0 && my === 0) return '!';
      const petal = [[-2, 0], [2, 0], [0, -2], [0, 2]].some(([cx, cy]) => (mx - cx) ** 2 + (my - cy) ** 2 <= 2);
      if (petal) return '2';
    } else if (style === 4) {
      if ((my === -2 && mx === 0) || (my === -1 && Math.abs(mx) <= 1) || (my === 0 && Math.abs(mx) <= 2) || (my === 1 && mx === 0)) return '2';
    } else if (style === 1 && ((Math.abs(mx) === 1 && my === 0) || (mx === 0 && Math.abs(my) === 1))) return '2';
    return (style !== 1 && x % 6 === 0) ? '1' : '0';
  }).join(''));
  sprites['roomWall' + style] = { legend: cleanLegend, frames: [make(false), make(true)] };
}
// Reconstruct the geometric floors at native resolution. Shrinking the
// reference made straight plank joints and diagonal brick seams fragment.
const mod = (n, size) => (n % size + size) % size;
for (const [style, colours] of [[1, { b: '#d38e67', c: '#ce8863', s: '#ab6649', h: '#e1a279' }], [2, { b: '#754234', c: '#6b3c31', s: '#492924', h: '#814a39' }]]) {
  const clean = Array.from({ length: 24 }, (_, y) => Array.from({ length: 24 }, (_, x) => {
    const board = Math.floor(y / 6), offset = board % 2 * 12;
    if (y % 6 === 5 || mod(x - offset, 24) === 0) return 's';
    if (y % 6 === 0) return 'h';
    return board % 2 ? 'b' : 'c';
  }).join(''));
  sprites['roomFloor' + style] = { legend: colours, frames: [clean, clean] };
}
const parquet = Array.from({ length: 24 }, (_, y) => Array.from({ length: 24 }, (_, x) => {
  const u = x + y, v = x - y;
  const column = Math.floor(u / 4), row = Math.floor(v / 4);
  const direction = mod(column - row, 4), ux = mod(u, 4), vy = mod(v, 4);
  const horizontal = direction < 2;
  if (horizontal ? vy === 0 || (ux === 0 && direction === 0) : ux === 0 || (vy === 0 && direction === 3)) return 's';
  return horizontal ? 'b' : 'c';
}).join(''));
sprites.roomFloor3 = { legend: { b: '#ab6649', c: '#c47c58', s: '#754234' }, frames: [parquet, parquet] };
const terracotta = Array.from({ length: 24 }, (_, y) => Array.from({ length: 24 }, (_, x) => {
  const dx = Math.min(x % 12, 12 - x % 12), dy = Math.min(y % 12, 12 - y % 12);
  if (dx + dy <= 1) return 'd';
  if (dx === 0 || dy === 0) return 's';
  return (Math.floor(x / 12) + Math.floor(y / 12)) % 2 ? 'b' : 'c';
}).join(''));
sprites.roomFloor4 = { legend: { b: '#db9c73', c: '#e2a27b', s: '#c7865e', d: '#9f5f45' }, frames: [terracotta, terracotta] };
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
