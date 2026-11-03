// L-shaped skirting joins for the four room corners, using existing colours
// and wallpaper art. Regenerate after changing the room or side tile sheets.
const fs = require('fs');
const P = require('../.claude/skills/pixel-sprites/scripts/pixel.cjs');
const load = path => JSON.parse(fs.readFileSync(path, 'utf8').match(/= ([\s\S]*) as const/)[1]);
const backs = load('src/art/sprites/roomFinishes.ts');
const original = P.readSprite('src/art/sprites/cafe.ts', 'WALL');
const art = {};
for (let style = 0; style <= 4; style++) {
  const back = style ? backs[`roomWall${style}`] : original;
  const source = back.frames[0];
  const frames = Array.from({ length: 4 }, (_, corner) => Array.from({ length: 24 }, (_, y) => Array.from({ length: 24 }, (_, x) => {
    const left = corner % 2 === 0;
    const top = corner < 2;
    const vertical = left ? x >= 18 : x < 6;
    const horizontal = top ? y >= 18 : y < 6;
    // The two trim strips meet on a diagonal, rather than overlapping into
    // a dark square where the wallpaper turns through the corner.
    const vx = left ? x - 18 : 5 - x;
    const hy = top ? y - 18 : 5 - y;
    if (vertical && (!horizontal || vx > hy)) return source[18 + vx][y];
    if (horizontal) return source[18 + hy][x];
    return source[Math.floor(y * 18 / 24)][x];
  }).join('')));
  art[`roomWallCorner${style}`] = { legend: back.legend, frames };
}
fs.writeFileSync('src/art/sprites/wallpaperCorners.ts', `// Regenerate with tools/wallpaperCorners.cjs.\nimport type { PixelSprite } from '../pixelSprite';\nexport const WALLPAPER_CORNERS = ${JSON.stringify(art, null, 2)} as const satisfies Record<string, PixelSprite>;\n`);
if (process.argv[2]) P.preview(process.argv[2], Object.values(art).flatMap(sprite => sprite.frames.map(rows => ({ rows, legend: sprite.legend }))), { scale: 5 });
