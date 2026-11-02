// One attachment process for every animal: the head band, neckline and hem
// have the same meaning, even when the original drawings have different sizes.
const P = require('../.claude/skills/pixel-sprites/scripts/pixel.cjs');
const sides = require('../src/data/clothingRig.json');

function attachSideHat(source, frame, animal, view) {
  const { head: [left, right, brim], eyes, outlineJoin = [] } = sides[animal][view === 2 ? 'left' : 'right'];
  const grid = frame.map(row => [...'.'.repeat(row.length)]);
  const xs = source.flatMap(row => [...row].flatMap((c, x) => c === '.' ? [] : [x]));
  const start = Math.min(...xs), width = Math.max(...xs) - start + 1;
  // Source hats put the upper cream row seven pixels below the cap's top.
  for (let sy = 0; sy < 10; sy++) {
    const y = brim - 7 + sy;
    if (y < 0 || y >= eyes - 1) continue;
    for (let x = left; x <= right; x++) {
      grid[y][x] = source[sy][start + Math.min(width - 1, Math.floor((x - left) * width / (right - left + 1)))];
    }
  }
  // Fit the band itself to the attachment span rather than stretching its
  // outline pixels, which can leave a doubled rim short of the forehead.
  for (let x = left; x <= right; x++) {
    grid[brim][x] = x === left || x === right ? 'O' : 'C';
    grid[brim + 1][x] = x === left || x === right ? 'O' : x === left + 1 || x === right - 1 ? 'T' : 'C';
    grid[brim + 2][x] = x === left || x === right ? '.' : 'O';
  }
  // Close gaps at ear roots without changing the face or the animal itself.
  const combined = frame.map((row, y) => [...row].map((c, x) => grid[y][x] === '.' ? c : grid[y][x]).join(''));
  P.fillHoles(combined, 'O').forEach((row, y) => [...row].forEach((c, x) => {
    if (c !== combined[y][x]) grid[y][x] = c;
  }));
  // A forehead may step outward below its hat band. Join that corner with
  // the same dark outline instead of exposing the base sprite's fur shading.
  for (const [x, y] of outlineJoin) grid[y][x] = 'O';
  return grid;
}

function attachCoat(frame, bounds, view, { fur = c => !'.ao'.includes(c), tail = () => false } = {}) {
  const grid = frame.map(row => [...'.'.repeat(row.length)]);
  const [top, hem, left, right] = bounds;
  const centre = Math.round((left + right) / 2);
  for (let y = top; y <= hem; y++) for (let x = left; x <= right; x++) {
    if (!fur(frame[y][x]) || tail(view, x, y)) continue;
    let colour = x < centre ? 'R' : 'S';
    if (view === 0 && x === centre) colour = 'C';
    if (y === top || y === hem) colour = 'C';
    if (y === hem - 2) colour = view === 0 && Math.abs(x - centre) <= 1 ? 'G' : 'B';
    if (y === hem - 3 && (x <= left + 2 || x >= right - 2)) colour = 'C';
    grid[y][x] = colour;
  }
  return grid;
}
module.exports = { attachSideHat, attachCoat };
