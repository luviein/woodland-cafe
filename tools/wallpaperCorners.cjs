// L-shaped skirting joins for the four room corners, using existing colours
// and wallpaper art. Regenerate after changing the room or side tile sheets.
const fs = require('fs');
const P = require('../.claude/skills/pixel-sprites/scripts/pixel.cjs');
const load = path => JSON.parse(fs.readFileSync(path, 'utf8').match(/= ([\s\S]*) as const/)[1]);
const backs = load('src/art/sprites/roomFinishes.ts');
const sides = load('src/art/sprites/sideWallpaper.ts');
const original = P.readSprite('src/art/sprites/cafe.ts', 'WALL');
const art = {};
for (let style = 0; style <= 4; style++) {
  const back = style ? backs[`roomWall${style}`] : original;
  const source = back.frames[0];
  // Original logs also run vertically on the side walls.
  const logSides = [0, 1].map(right => Array.from({ length: 24 }, (_, y) => Array.from({ length: 24 }, (_, x) => source[right ? 23 - x : x][y]).join('')));
  if (style === 0) art.roomSideWall0 = { legend: original.legend, frames: logSides };
  const side = style ? sides['roomSideWall' + style] : { legend: original.legend, frames: logSides };
  const legend = {}, letters = new Map();
  const letter = colour => {
    if (!letters.has(colour)) {
      const key = String.fromCharCode(65 + letters.size);
      letters.set(colour, key); legend[key] = colour;
    }
    return letters.get(colour);
  };
  const frames = Array.from({ length: 4 }, (_, corner) => Array.from({ length: 24 }, (_, y) => Array.from({ length: 24 }, (_, x) => {
    const right = corner % 2 === 1;
    const top = corner < 2;
    const distanceX = right ? 23 - x : x;
    const distanceY = top ? y : 23 - y;
    // Each outer edge copies its neighbouring wall exactly. A diagonal
    // miter bends the lines without shrinking or shifting either sprite.
    if (distanceX >= distanceY) return letter(back.legend[source[y][x]]);
    const frame = style ? (top ? 3 : 2) : (right ? 1 : 0);
    return letter(side.legend[side.frames[frame][y][x]]);
  }).join('')));
  art[`roomWallCorner${style}`] = { legend, frames };
}
fs.writeFileSync('src/art/sprites/wallpaperCorners.ts', `// Regenerate with tools/wallpaperCorners.cjs.\nimport type { PixelSprite } from '../pixelSprite';\nexport const WALLPAPER_CORNERS = ${JSON.stringify(art, null, 2)} as const satisfies Record<string, PixelSprite>;\n`);
if (process.argv[2]) P.preview(process.argv[2], Object.values(art).flatMap(sprite => sprite.frames.map(rows => ({ rows, legend: sprite.legend }))), { scale: 5 });
