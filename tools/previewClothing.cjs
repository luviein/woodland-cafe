// Inspect the code-native clothing on its actual animal grid, without Phaser.
// Usage: node tools/previewClothing.cjs <output.png> [animal=hedgehog] [frame=0]
const fs = require('fs');
const path = require('path');
const ts = require('typescript');
require.extensions['.ts'] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, file);
const P = require('../.claude/skills/pixel-sprites/scripts/pixel.cjs');
const { SPRITE_ART } = require('../src/art/spriteArt.ts');
const { clothingArt } = require('../src/data/clothingFits.ts');
const { CLOTHING_IDS } = require('../src/data/clothing.ts');
const [output, animal = 'hedgehog', frame = '0'] = process.argv.slice(2);
const body = SPRITE_ART[animal];
const items = CLOTHING_IDS.map(id => {
  const item = SPRITE_ART[clothingArt(animal, id)];
  const rows = body.frames[+frame].map((row, y) => [...row].map((c, x) => item.frames[+frame][y][x] === '.' ? c : item.frames[+frame][y][x]).join(''));
  return { rows, legend: { ...item.legend, ...body.legend } };
});
P.preview(path.resolve(output), items, { scale: 8, perRow: 4 });
