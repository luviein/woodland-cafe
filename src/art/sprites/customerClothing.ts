import type { PixelSprite } from '../pixelSprite';
import { BADGER, FROG, RACCOON } from './sheetCritters2';
import { SANTA_HAT } from './wardrobe';

// Head spans and torso masks follow each animal's actual four-view frames.
// The frog's narrow cap sits between/behind its raised eyes; tails stay bare.
const RIGS = {
  frog: { body: FROG, heads: [[7, 15, 7], [6, 16, 7], [12, 20, 7], [2, 10, 7]], torsos: [[16, 23, 2, 20], [17, 23, 2, 21], [17, 23, 8, 20], [17, 23, 3, 15]] },
  badger: { body: BADGER, heads: [[3, 23, 10], [2, 22, 10], [3, 21, 9], [6, 24, 9]], torsos: [[21, 30, 4, 21], [21, 30, 6, 21], [22, 30, 7, 20], [22, 30, 7, 20]] },
  raccoon: { body: RACCOON, heads: [[3, 25, 8], [6, 30, 9], [3, 22, 7], [15, 34, 7]], torsos: [[22, 31, 4, 25], [22, 28, 7, 28], [23, 31, 6, 21], [23, 31, 16, 31]] },
} as const;

function fitted(animal: keyof typeof RIGS, slot: 'hat' | 'coat'): PixelSprite {
  const rig = RIGS[animal];
  const frames = rig.body.frames.map((frame, f) => {
    const view = Math.floor(f / 3), grid = frame.map(row => [...'.'.repeat(row.length)]);
    if (slot === 'hat') {
      const source = SANTA_HAT.frames[view * 3];
      const xs = source.flatMap(row => [...row].flatMap((c, x) => c === '.' ? [] : [x]));
      const start = Math.min(...xs), end = Math.max(...xs);
      const [left, right, brim] = rig.heads[view];
      for (let y = 0; y < 10; y++) for (let x = left; x <= right; x++) {
        const sx = start + Math.min(end - start, Math.floor((x - left) * (end - start + 1) / (right - left + 1)));
        grid[brim - 7 + y][x] = source[y][sx];
      }
      for (let x = left; x <= right; x++) {
        grid[brim][x] = x === left || x === right ? 'O' : 'C';
        grid[brim + 1][x] = x === left || x === right ? 'O' : 'T';
        grid[brim + 2][x] = x === left || x === right ? '.' : 'O';
      }
    } else {
      const [top, bottom, left, right] = rig.torsos[view], centre = Math.round((left + right) / 2);
      for (let y = top; y <= bottom; y++) for (let x = left; x <= right; x++) {
        if ('.aob'.includes(frame[y][x])) continue;
        let colour = x < centre ? 'R' : 'S';
        if (view === 0 && x === centre) colour = 'C';
        if (y === top || y === bottom) colour = 'C';
        if (y === bottom - 2) colour = view === 0 && Math.abs(x - centre) <= 1 ? 'G' : 'B';
        grid[y][x] = colour;
      }
    }
    return grid.map(row => row.join(''));
  });
  return { legend: SANTA_HAT.legend, frames };
}

export const CUSTOMER_SANTA_ART = {
  frogSantaHat: fitted('frog', 'hat'), frogSantaCoat: fitted('frog', 'coat'),
  badgerSantaHat: fitted('badger', 'hat'), badgerSantaCoat: fitted('badger', 'coat'),
  raccoonSantaHat: fitted('raccoon', 'hat'), raccoonSantaCoat: fitted('raccoon', 'coat'),
};
