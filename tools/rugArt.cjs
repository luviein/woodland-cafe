// Convert the four floor accents from the supplied 1536x1024 room sheet.
// Usage: node tools/rugArt.cjs <decoded.rgb> <preview.png>
const fs = require('fs');
const P = require('../.claude/skills/pixel-sprites/scripts/pixel.cjs');
const img = P.loadRaw(process.argv[2], 1536, 1024);
const names = ['snowflakeRug', 'treeRug', 'floralRug', 'tartanRug'];
const boxes = [[55, 829, 291, 974], [329, 821, 484, 975], [512, 818, 671, 978], [702, 832, 867, 975]].map(([x0, y0, x1, y1]) => ({ x0, y0, x1, y1 }));
const isBg = ([r, g, b]) => r < 95 && g < 65 && b < 60;
const palette = P.palette(P.samplesOf(img, boxes, { isBg }), 30);
const grids = boxes.map(box => P.shrink(img, box, 46, palette, { isBg, outlineShare: 2 }).grid);
const { rows, legend } = P.toRows(grids, palette);
const art = Object.fromEntries(rows.map((source, i) => {
  let clean = P.despeck(source);
  // Rugs are fabric with solid interiors; conversion must not punch holes.
  for (let pass = 0; pass < 48; pass++) clean = P.fillHoles(clean);
  const left = Math.floor((48 - clean[0].length) / 2), top = Math.floor((48 - clean.length) / 2);
  const frame = Array.from({ length: 48 }, (_, y) => y >= top && y < top + clean.length
    ? '.'.repeat(left) + clean[y - top] + '.'.repeat(48 - left - clean[0].length) : '.'.repeat(48));
  return [names[i], { legend, frames: [frame] }];
}));
// Precompute all exact quarter-turn / mirror combinations on the fixed 48px canvas.
for (const sprite of Object.values(art)) {
  const source = sprite.frames[0];
  sprite.frames = Array.from({ length: 16 }, (_, variant) => {
    let rows = source.map(row => variant & 4 ? [...row].reverse().join('') : row);
    if (variant & 8) rows = [...rows].reverse();
    for (let turn = 0; turn < variant % 4; turn++) {
      rows = Array.from({ length: 48 }, (_, y) => Array.from({ length: 48 }, (_, x) => rows[47 - x][y]).join(''));
    }
    return rows;
  });
}
fs.writeFileSync('src/art/sprites/rugs.ts', `// From the supplied floor accent sheet; regenerate with tools/rugArt.cjs.\nimport type { PixelSprite } from '../pixelSprite';\nexport const RUG_ART = ${JSON.stringify(art, null, 2)} as const satisfies Record<string, PixelSprite>;\n`);
P.preview(process.argv[3], Object.values(art).map(sprite => ({ rows: sprite.frames[0], legend })), { scale: 5 });
