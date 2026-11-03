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
    if (style === 2 && x !== (right ? 0 : 23)) {
      // Follow a rounded quarter-ellipse between the narrow side garland
      // and horizontal trim. Keep bows on straight runs, not on the bend.
      const cx = right ? 0 : 23, cy = top ? 23 : 0;
      const rx = right ? 11 : 12, ry = top ? 21 : 2;
      let nearest = Infinity;
      for (let step = 0; step <= 90; step++) {
        const angle = step * Math.PI / 180;
        const px = cx + (right ? 1 : -1) * rx * Math.cos(angle);
        const py = cy + (top ? -1 : 1) * ry * Math.sin(angle);
        nearest = Math.min(nearest, Math.hypot(x - px, y - py));
      }
      if (nearest <= 1.15) {
        const green = Object.values(back.legend).filter(c => {
          const rgb = c.match(/[a-f0-9]{2}/gi).map(v => parseInt(v, 16));
          return rgb[1] > rgb[0] * 1.12 && rgb[1] > rgb[2];
        }).sort((a, b) => parseInt(a.slice(1), 16) - parseInt(b.slice(1), 16));
        return letter(green[nearest < 0.65 ? Math.min(1, green.length - 1) : 0]);
      }
      // Plain striped paper underneath the bend, retaining the skirting.
      if (distanceX >= distanceY) return letter(back.legend[source[y < 6 ? 10 : y][x]]);
      return letter(back.legend[source[10][x]]);
    }
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
