// Preserve art-templates/critter-skeleton.png pixel for pixel as letter grids.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const P = require('../.claude/skills/pixel-sprites/scripts/pixel.cjs');
const root = path.resolve(__dirname, '..');
const png = fs.readFileSync(path.join(root, 'art-templates/critter-skeleton.png'));
const width = png.readUInt32BE(16), height = png.readUInt32BE(20);
if (png[24] !== 8 || png[25] !== 6 || width !== 128 || height !== 40) throw Error('Expected the 128x40 RGBA drawing template');
const chunks = [];
for (let at = 8; at < png.length;) {
  const length = png.readUInt32BE(at), type = png.toString('ascii', at + 4, at + 8);
  if (type === 'IDAT') chunks.push(png.subarray(at + 8, at + 8 + length));
  at += length + 12;
}
const packed = zlib.inflateSync(Buffer.concat(chunks)), stride = width * 4;
const rgba = Buffer.alloc(stride * height);
const paeth = (a, b, c) => { const p = a + b - c, da = Math.abs(p - a), db = Math.abs(p - b), dc = Math.abs(p - c); return da <= db && da <= dc ? a : db <= dc ? b : c; };
for (let y = 0; y < height; y++) {
  const filter = packed[y * (stride + 1)];
  for (let x = 0; x < stride; x++) {
    const at = y * stride + x, a = x >= 4 ? rgba[at - 4] : 0, b = y ? rgba[at - stride] : 0, c = y && x >= 4 ? rgba[at - stride - 4] : 0;
    const predictors = [0, a, b, Math.floor((a + b) / 2), paeth(a, b, c)];
    if (filter > 4) throw Error('Unknown PNG filter');
    rgba[at] = (packed[y * (stride + 1) + x + 1] + predictors[filter]) & 255;
  }
}
const legend = { J: '#3a3a40', K: '#b8b8c0', L: '#dcdce2' };
const frames = Array.from({ length: 4 }, (_, view) => Array.from({ length: height }, (_, y) => Array.from({ length: 32 }, (_, x) => {
  const at = (y * width + view * 32 + x) * 4;
  if (!rgba[at + 3]) return '.';
  const hex = '#' + rgba.subarray(at, at + 3).toString('hex');
  const letter = Object.keys(legend).find(key => legend[key] === hex);
  if (!letter) throw Error('Unexpected skeleton colour: ' + hex);
  return letter;
}).join('')));
const out = path.join(root, 'src/art/sprites/critterSkeleton.ts');
fs.writeFileSync(out, "import type { PixelSprite } from '../pixelSprite';\n\n// Imported exactly from art-templates/critter-skeleton.png by tools/importCritterSkeleton.cjs.\n" + P.legendTs('LEGEND', legend));
P.writeSprite(out, 'CRITTER_SKELETON', frames, { labels: ['front', 'back', 'left', 'right'] });
