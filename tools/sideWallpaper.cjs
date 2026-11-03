// Side walls use a continuous vertical strip, not a miniature back wall
// with a horizontal skirting board repeated on every tile.
// Decode the supplied 1024x1536 sheet, then pass its RGB path and a preview path.
const fs = require('fs');
const P = require('../.claude/skills/pixel-sprites/scripts/pixel.cjs');
const img = P.loadRaw(process.argv[2], 1024, 1536);
const xs = [801, 620, 528, 439];
const boxes = xs.map(x => ({ x0: x, x1: x + 66, y0: 460, y1: 724 }));
const colours = P.palette(P.samplesOf(img, boxes, { isBg: () => false }), 32);
const grids = boxes.map(box => Array.from({ length: 96 }, (_, y) => Array.from({ length: 24 }, (_, x) => {
  const counts = new Map();
  for (let sy = Math.floor(box.y0 + y * 264 / 96); sy < box.y0 + (y + 1) * 264 / 96; sy++) {
    for (let sx = Math.floor(box.x0 + x * 66 / 24); sx < box.x0 + (x + 1) * 66 / 24; sx++) {
      const pixel = img.px(sx, sy);
      let best = 0, distance = Infinity;
      colours.forEach((c, i) => { const d = c.reduce((sum, v, j) => sum + (v - pixel[j]) ** 2, 0); if (d < distance) { best = i; distance = d; } });
      counts.set(best, (counts.get(best) ?? 0) + 1);
    }
  }
  return [...counts].sort((a, b) => b[1] - a[1])[0][0];
})));
const { rows, legend } = P.toRows(grids, colours);
const art = Object.fromEntries(rows.map((strip, i) => [`roomSideWall${i + 1}`, {
  legend, frames: Array.from({ length: 4 }, (_, frame) => strip.slice(frame * 24, frame * 24 + 24)),
}]));
// Reuse the horizontal garland at its actual pixel scale: the reference's
// oversized vertical bows were much thicker than the back-wall trim.
const back = JSON.parse(fs.readFileSync('src/art/sprites/roomFinishes.ts', 'utf8').match(/= ([\s\S]*) as const/)[1]).roomWall2;
const slim = Array.from({ length: 24 }, (_, y) => Array.from({ length: 24 }, (_, x) =>
  x >= 9 && x < 15 ? back.frames[0][x - 9][y] : back.frames[0][10][x],
).join(''));
art.roomSideWall2 = { legend: back.legend, frames: Array.from({ length: 4 }, () => slim) };
// Match the back-wall motif size on the other wallpapers. The wood trim
// turns onto the inner vertical edge rather than disappearing at the corner.
const wallArt = JSON.parse(fs.readFileSync('src/art/sprites/roomFinishes.ts', 'utf8').match(/= ([\s\S]*) as const/)[1]);
for (const style of [1, 3, 4]) {
  const wall = wallArt['roomWall' + style];
  const source = wall.frames[0];
  const frames = [false, true].flatMap(right => Array.from({ length: 2 }, (_, frame) => Array.from({ length: 24 }, (_, y) => Array.from({ length: 24 }, (_, x) => {
    const along = frame * 24 + y;
    const trim = right ? x < 6 : x >= 18;
    if (trim) return source[18 + (right ? 5 - x : x - 18)][along % 24];
    return source[along % 16][x];
  }).join(''))));
  art['roomSideWall' + style] = { legend: wall.legend, frames };
}
fs.writeFileSync('src/art/sprites/sideWallpaper.ts', `// From the supplied vertical wallpaper sheet; regenerate with tools/sideWallpaper.cjs.\nimport type { PixelSprite } from '../pixelSprite';\nexport const SIDE_WALLPAPER_ART = ${JSON.stringify(art, null, 2)} as const satisfies Record<string, PixelSprite>;\n`);
P.preview(process.argv[3], Object.values(art).map(sprite => ({ rows: sprite.frames.flat(), legend: sprite.legend })), { scale: 5 });
