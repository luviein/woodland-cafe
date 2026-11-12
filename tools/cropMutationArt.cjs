// Preserve the approved crop silhouettes; rerunning keeps all mutation details.
const fs = require('fs');
const ts = require('typescript');
function load(file) {
  const exports = {};
  new Function('exports', ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText)(exports);
  return exports;
}
const icons = load('src/art/sprites/kitchen.ts').INGREDIENT_ICONS;
const garden = load('src/art/sprites/garden.ts').GARDEN_ART;
const palette = load('src/art/palette.ts').PALETTE;
const art = {};
function variant(sprite, mutation, planted, crop) {
  const legend = Object.fromEntries(Object.entries(sprite.legend).map(([key, value]) => [key,
    value.startsWith('#') ? value : '#' + palette[value].toString(16).padStart(6, '0')]));
  Object.assign(legend, { Z: '#fff4d6', H: '#246342', L: '#62a353', B: '#e24a42',
    K: mutation === 'Golden' ? '#c58a26' : '#8c293e',
    U: mutation === 'Golden' ? '#ffe394' : '#ef8180',
  });
  if (mutation === 'Golden') Object.assign(legend, {
    r: '#edb737', a: '#ffdb70', c: '#fff0ac',
    w: '#fff8d8',
  });
  if (mutation === 'Golden' && !planted) Object.assign(legend, { h: '#fff0ac', k: '#bd7d28' });
  if (mutation === 'Christmas') Object.assign(legend, { r: '#bc3542', a: '#ee6970' });
  const frames = sprite.frames.map((frame, index) => {
    // Early growth keeps its own soil, foliage and unripe colours in both sets.
    if (planted && index < 3) return frame.map(row => [...row].map(char => {
      if (char === '.') return char;
      const original = sprite.legend[char];
      const key = String(Object.keys(sprite.legend).indexOf(char));
      legend[key] = original.startsWith('#') ? original : '#' + palette[original].toString(16).padStart(6, '0');
      return key;
    }).join(''));
    const rows = frame.map(row => [...row]);
    if (planted && crop === 'chilli') {
      // A stepped shoulder and tapered tip read as peppers instead of rectangles.
      for (const [x, y] of [[7,14], [17,18]]) {
        const pepper = ['ooooo', 'ogrro', 'oraro', 'orrro', '.orro', '.oro.', '..o..'];
        for (let dy = 0; dy < pepper.length; dy++) for (let dx = 0; dx < 5; dx++) {
          rows[y - 2 + dy][x - 2 + dx] = pepper[dy][dx];
        }
      }
    }
    // Find each fruit separately so highlights and snow follow its own contour.
    const source = rows.map(row => [...row]);
    const seen = new Set();
    const fruits = [];
    const flesh = crop === 'mushroom' ? 'r' : 'rah';
    for (let y = 0; y < rows.length; y++) for (let x = 0; x < rows[y].length; x++) {
      if (!flesh.includes(source[y][x]) || seen.has(`${x},${y}`)) continue;
      const points = [], queue = [[x,y]];
      while (queue.length) {
        const [px,py] = queue.pop(), key = `${px},${py}`;
        if (seen.has(key) || !flesh.includes(source[py]?.[px] ?? '.')) continue;
        seen.add(key); points.push([px,py]);
        queue.push([px-1,py],[px+1,py],[px,py-1],[px,py+1]);
      }
      fruits.push(points);
    }
    for (const points of fruits) {
      const left = Math.min(...points.map(p => p[0]));
      const right = Math.max(...points.map(p => p[0]));
      const top = Math.min(...points.map(p => p[1]));
      const bottom = Math.max(...points.map(p => p[1]));
      for (const [x,y] of points) {
        if (source[y][x] !== 'r') continue;
        if (y === bottom || (x === right && y > top + 1)) rows[y][x] = 'K';
        else if (crop !== 'mushroom' && x <= left + 1 && y <= top + 2) rows[y][x] = 'U';
      }
    }
    if (mutation === 'Christmas') {
      // Snow rests inside the red fruit/cap, preserving the continuous dark rim.
      for (let x = 0; x < rows[0].length; x++) {
        const y = source.findIndex(row => row[x] === 'r' || row[x] === 'a' || (crop !== 'mushroom' && row[x] === 'h'));
        if (y >= 0) {
          rows[y][x] = 'Z';
          if (x % 4 === 0 && source[y + 1]?.[x] === 'r') rows[y + 1][x] = 'Z';
        }
      }
      // Keep holly on the mushroom's rim, joined to the cap rather than floating.
      if (crop === 'mushroom') {
        const top = source.findIndex(row => row.includes('r'));
        const cx = source[top].indexOf('r') + 2;
        for (const [dx,dy,colour] of [[-1,-1,'H'],[0,-1,'L'],[1,-1,'H'],[0,0,'B']]) {
          rows[top + dy][cx + dx] = colour;
        }
        // Join the sprig to a pointed cap without trapping a transparent pixel.
        if (rows[top][cx - 1] === '.') rows[top][cx - 1] = 'Z';
      }
    }
    return rows.map(row => row.join(''));
  });
  return { legend, frames };
}
for (const mutation of ['Golden', 'Christmas']) for (const crop of ['mushroom', 'tomato', 'chilli']) {
  const title = crop[0].toUpperCase() + crop.slice(1);
  art[crop + mutation] = variant(icons[crop], mutation, false, crop);
  art['garden' + title + mutation] = variant(garden['garden' + title], mutation, true, crop);
}
fs.writeFileSync('src/art/sprites/cropMutations.ts', "import type { PixelSprite } from '../pixelSprite';\n\n// Generated by tools/cropMutationArt.cjs; gallery previews pending gameplay integration.\nexport const CROP_MUTATION_ART = " + JSON.stringify(art, null, 2) + ' as const satisfies Record<string, PixelSprite>;\n');
if (process.argv[2]) {
  const P = require('../.claude/skills/pixel-sprites/scripts/pixel.cjs');
  P.preview(process.argv[2], Object.values(art).map(s => ({ rows: s.frames.at(-1), legend: s.legend })), { scale: 10, perRow: 6, background: '#506e3e' });
}
