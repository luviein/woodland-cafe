import type { PixelSprite } from '../pixelSprite';
import { FOX } from './sheetCritters2';
import { SANTA_HAT } from './wardrobe';

// Fox-specific head and torso attachment spans; the side tail remains exposed.
const HEADS = [[7, 24, 8], [7, 24, 7], [4, 18, 8], [14, 28, 8]];
const TORSOS = [[20, 27, 6, 24], [18, 24, 6, 24], [19, 27, 6, 17], [19, 27, 15, 26]];
const legend = { ...SANTA_HAT.legend };
const hats: string[][] = [], coats: string[][] = [];
FOX.frames.forEach((frame, f) => {
  const view = Math.floor(f / 3);
  const empty = () => frame.map(row => [...'.'.repeat(row.length)]);
  const hat = empty(), coat = empty(), source = SANTA_HAT.frames[view * 3];
  const xs = source.flatMap(row => [...row].flatMap((c, x) => c === '.' ? [] : [x]));
  const start = Math.min(...xs), end = Math.max(...xs);
  const [left, right, brim] = HEADS[view];
  for (let y = 0; y < 10; y++) for (let x = left; x <= right; x++) {
    hat[brim - 7 + y][x] = source[y][start + Math.min(end - start, Math.floor((x - left) * (end - start + 1) / (right - left + 1)))];
  }
  for (let x = left; x <= right; x++) {
    hat[brim][x] = x === left || x === right ? 'O' : 'C';
    hat[brim + 1][x] = x === left || x === right ? 'O' : 'T';
    hat[brim + 2][x] = x === left || x === right ? '.' : 'O';
  }
  const [top, bottom, a, b] = TORSOS[view], centre = Math.round((a + b) / 2);
  for (let y = top; y <= bottom; y++) for (let x = a; x <= b; x++) {
    if ('.aob'.includes(frame[y][x])) continue;
    let colour = x < centre ? 'R' : 'S';
    if (view === 0 && x === centre) colour = 'C';
    if (y === top || y === bottom) colour = 'C';
    if (y === bottom - 2) colour = view === 0 && Math.abs(x - centre) <= 1 ? 'G' : 'B';
    coat[y][x] = colour;
  }
  hats.push(hat.map(row => row.join('')));
  coats.push(coat.map(row => row.join('')));
});
export const FOX_SANTA_HAT: PixelSprite = { legend, frames: hats };
export const FOX_SANTA_COAT: PixelSprite = { legend, frames: coats };
