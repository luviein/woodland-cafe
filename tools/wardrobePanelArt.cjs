// Convert the supplied wardrobe board, retaining its carpentry and clearing live fields.
const fs = require('fs'), path = require('path'), os = require('os'), cp = require('child_process');
const P = require('../.claude/skills/pixel-sprites/scripts/pixel.cjs');
const raw = path.join(os.tmpdir(), 'wardrobe-source.rgb');
cp.execFileSync('powershell.exe', ['-ExecutionPolicy', 'Bypass', '-File', '.claude/skills/pixel-sprites/scripts/decode.ps1', 'art-templates/wardrobe-source.png', raw]);
const img = P.loadRaw(raw, 1568, 1003);
const STEP = 3, W = 524, H = 336;
const outside = new Uint8Array(img.W * img.H), pending = [];
for (let x = 0; x < img.W; x++) pending.push(x, (img.H - 1) * img.W + x);
for (let y = 0; y < img.H; y++) pending.push(y * img.W, y * img.W + img.W - 1);
while (pending.length) {
  const at = pending.pop(); if (outside[at]) continue;
  const x = at % img.W, y = Math.floor(at / img.W), [r, g, b] = img.px(x, y);
  // Only the connected cool forest is removed; the cabinet's warm outline remains intact.
  if (r > g * 1.16) continue;
  outside[at] = 1;
  if (x) pending.push(at - 1); if (x < img.W - 1) pending.push(at + 1);
  if (y) pending.push(at - img.W); if (y < img.H - 1) pending.push(at + img.W);
}
const lerp = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const clean = (x, y) => {
  // Restore the spotlight behind the example frog, keeping the mirror and curtains.
  if (x >= 330 && x <= 550 && y >= 365 && y <= 634) {
    const restored = lerp(img.px(320, y), img.px(560, y), (x - 320) / 240);
    const blend = Math.max(0, Math.min(1, (x - 330) / 20, (550 - x) / 20, (y - 365) / 8));
    return lerp(img.px(x, y), restored, blend);
  }
  // The unobscured lower half of the oval supplies the matching rug under the feet.
  if (x >= 350 && x <= 535 && y >= 635 && y <= 668) return img.px(x, 1370 - y);
  if (x >= 775 && x <= 1440 && y >= 260 && y <= 340) return img.px(772, y);
  if (x >= 885 && x <= 1342 && y >= 342 && y <= 420) return img.px(772, y);
  // The reference cards, labels and Worn badge are replaced by live controls.
  if (x >= 770 && x <= 1442 && y >= 450 && y <= 800) return img.px(1106, y);
  // Keep the lock illustration; the animal and ownership guidance are live text.
  if (x >= 179 && x <= 1180 && y >= 880 && y <= 942) return img.px(1190, y);
  return img.px(x, y);
};
const board = Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => {
  const sx = Math.min(img.W - 1, x * STEP + 1), sy = Math.min(img.H - 1, y * STEP + 1);
  const silhouette = sx >= 18 && sx <= 1549 && sy >= 65 && sy <= 978
    || sx >= 455 && sx <= 1118 && sy >= 12 && sy <= 175
    || sx >= 310 && sx <= 468 && sy >= 22 && sy <= 177
    || sx >= 1110 && sx <= 1265 && sy >= 27 && sy <= 175;
  return !silhouette || outside[sy * img.W + sx] ? null : clean(sx, sy);
}));
// Continuous hems meet the wooden rail cleanly at both inner curtain corners.
function hem(points, offset, colour) {
  for (let i = 1; i < points.length; i++) {
    let [x, y] = points[i - 1]; const [tx, ty] = points[i];
    const dx = Math.abs(tx - x), sx = x < tx ? 1 : -1, dy = -Math.abs(ty - y), sy = y < ty ? 1 : -1;
    let error = dx + dy;
    while (true) {
      board[y + offset][x] = colour;
      if (x === tx && y === ty) break;
      const twice = error * 2;
      if (twice >= dy) { error += dy; x += sx; }
      if (twice <= dx) { error += dx; y += sy; }
    }
  }
}
for (const edge of [
  [[88, 39], [86, 44], [82, 49], [78, 54], [73, 59], [66, 65], [60, 69], [55, 72], [50, 75], [45, 77]],
  [[434, 39], [436, 44], [439, 49], [443, 54], [448, 59], [454, 64], [460, 69], [466, 73], [473, 76], [480, 77]],
]) {
  hem(edge, 1, [100, 57, 46]);
  hem(edge, 0, [230, 157, 104]);
}

// Restore the post, mirror and floor revealed by the old oversized plant.
const original = board.map(row => row.map(c => c && [...c]));
for (let y = 184; y <= 252; y++) for (let x = 14; x <= 76; x++) {
  board[y][x] = x < 31 || y < 217 ? original[178][x] : original[y][70];
}
// Continue the glass and its reflections as a single surface, without cloned leaf fragments.
for (let y = 126; y <= 204; y++) for (let x = 55; x <= 91; x++) {
  const c = original[y][x];
  const glass = c && Math.max(...c) - Math.min(...c) < 30 && Math.min(...c) > 95;
  const right = Math.round(90 - Math.max(0, y - 185) * 2 / 19);
  if (glass || y >= 180 && x >= 56 && x <= right) board[y][x] = (x + y) % 35 < 12 ? [224, 223, 216] : [184, 183, 178];
  else if (y >= 180 && x === 55) board[y][x] = [218, 145, 78];
}
for (let y = 205; y <= 215; y++) for (let x = 52; x <= 97; x++) {
  board[y][x] = y === 205 || y === 215 ? [98, 56, 40] : y === 206 ? [242, 174, 94] : y < 212 ? [213, 132, 67] : [165, 92, 51];
}
// Reuse the reviewed compact potted plant; its leaves stay within the floor inset.
const plant = JSON.parse(fs.readFileSync('src/art/sprites/museum.ts', 'utf8').split('export const MUSEUM_ART = ')[1].split(' satisfies')[0]).museumPlant;
plant.frames[0].forEach((row, y) => [...row].forEach((letter, x) => {
  if (letter === '.') return;
  for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) board[207 + y * 2 + dy][36 + x * 2 + dx] = P.rgbOf(plant.legend[letter]);
}));
// Remove disconnected forest flecks without trimming the cabinet's own leaves.
const connected = new Uint8Array(W * H), stack = [[262, 168]];
while (stack.length) {
  const [x, y] = stack.pop();
  if (x < 0 || y < 0 || x >= W || y >= H || connected[y * W + x] || board[y][x] === null) continue;
  connected[y * W + x] = 1;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) stack.push([x + dx, y + dy]);
}
board.forEach((row, y) => row.forEach((_, x) => { if (!connected[y * W + x]) row[x] = null; }));
const cut = (x0, y0, w, h, sample = (x, y) => img.px(x, y)) => Array.from({ length: h }, (_, y) =>
  Array.from({ length: w }, (_, x) => sample(x0 + x * STEP + 1, y0 + y * STEP + 1)));
const card = cut(775, 456, 108, 52, (x, y) => x >= 793 && x <= 1081 && y >= 473 && y <= 594 ? img.px(797, y) : img.px(x, y));
const selected = card.map((row, y) => row.map((c, x) => {
  // Tint only the paper inside the complete rounded rim, preserving every border pixel.
  const inset = y < 5 || y > 46 ? 7 : 3;
  if (x < inset || x >= 108 - inset || y < 3 || y > 48) return c;
  if (c[0] < 150 || c[1] < 110) return c;
  return [Math.round(c[0] * 0.82), Math.round(c[1] * 0.94), Math.round(c[2] * 0.83)];
}));
const badge = cut(1341, 622, 34, 18, (x, y) => x >= 1357 && x <= 1421 && y >= 638 && y <= 662 ? img.px(1353, y) : img.px(x, y));
const tabs = [
  ['Hats', 781, 265], ['Tops', 1001, 265], ['Capes', 1220, 265],
  ['Shoes', 891, 347], ['Animal', 1118, 347],
].map(([name, x, y]) => [name, cut(x, y, name === 'Animal' ? 73 : 69, 24)]);
const recolourTab = (grid, selected, wasGrey) => grid.map(row => row.map(c => {
  const [r, g, b] = c;
  const fill = wasGrey ? Math.max(r, g, b) - Math.min(r, g, b) < 32 && r > 60 && r < 180 : b > r + 10 && b > g;
  if (!fill) return c;
  const light = wasGrey ? r / 135 : b / 105;
  const target = selected ? [143, 139, 131] : [38, 69, 95];
  return target.map(v => Math.min(255, Math.round(v * light)));
}));
const blankTab = cut(1001, 265, 69, 24, (x, y) => x >= 1020 && x <= 1189 && y >= 280 && y <= 321 ? img.px(1016, y) : img.px(x, y));
const sprites = { wardrobeBoard: [board], wardrobeCard: [card, selected], wardrobeBadge: [badge],
  wardrobeChoiceButton: [blankTab, recolourTab(blankTab, true, false)] };
for (const [name, grid] of tabs) sprites['wardrobeTab' + name] = [recolourTab(grid, false, ['Hats', 'Capes'].includes(name)), recolourTab(grid, true, ['Hats', 'Capes'].includes(name))];
// Keep the reference palette stable so a local repair never recolours other controls.
const colours = [
  '#faddaa', '#fde9b7', '#f9f6ea', '#231316', '#2f1c1c', '#3a2523', '#26313f', '#4d2e29',
  '#61362d', '#54463c', '#6e3f35', '#7f4836', '#8d5038', '#90514c', '#686942', '#bf4334',
  '#9a5739', '#9f5b3c', '#a45a52', '#ae6542', '#807c74', '#c16b45', '#b87353', '#cc7746',
  '#9e9933', '#d77462', '#c78257', '#ae9172', '#9d9890', '#e18c4b', '#d59162', '#e39d68',
  '#f1a357', '#f0a37b', '#beb8b5', '#f8b247', '#cec281', '#f9ba6e', '#f5ba87', '#f7bf8c',
  '#efcb9c', '#fbc98c', '#face99', '#fbd09c', '#fbd19e', '#fbd1a0', '#fad2a0', '#fbd29f',
  '#fbd2a0', '#fcd29f', '#fcd2a1', '#fbd3a0', '#fcd4a0', '#fcd5a3', '#dfdbd6', '#28445d',
].map(P.rgbOf);
const nearest = c => { let best = 0, distance = Infinity; colours.forEach((p, i) => { const d = p.reduce((sum, v, k) => sum + (v - c[k]) ** 2, 0); if (d < distance) { distance = d; best = i; } }); return best; };
const art = {};
for (const [name, frames] of Object.entries(sprites)) {
  const converted = P.toRows(frames.map(frame => frame.map(row => row.map(c => c === null ? null : nearest(c)))), colours);
  art[name] = { legend: converted.legend, frames: converted.rows };
}
fs.writeFileSync('src/art/sprites/wardrobePanel.ts', "import type { PixelSprite } from '../pixelSprite';\n\n// Generated from the supplied reference by tools/wardrobePanelArt.cjs.\nexport const WARDROBE_PANEL_ART = " + JSON.stringify(art, null, 2) + ' satisfies Record<string, PixelSprite>;\n');
P.preview(path.join(os.tmpdir(), 'wardrobe-board-review.png'), [{ rows: art.wardrobeBoard.frames[0], legend: art.wardrobeBoard.legend }], { scale: 2, background: '#34513b' });
P.preview(path.join(os.tmpdir(), 'wardrobe-controls-review.png'), Object.values(art).slice(1).flatMap(s => s.frames.map(rows => ({ rows, legend: s.legend }))), { scale: 4, perRow: 3 });
