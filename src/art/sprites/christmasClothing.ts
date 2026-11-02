import type { PixelSprite } from '../pixelSprite';
import { DEER, HEDGEHOG, MOUSE, RABBIT } from './sheetCritters';
import { SANTA_COAT, SANTA_HAT } from './wardrobe';
import { DEER_SANTA_COAT, DEER_SANTA_HAT, MOUSE_SANTA_COAT, MOUSE_SANTA_HAT, RABBIT_SANTA_COAT, RABBIT_SANTA_HAT } from './wardrobeCritters';
import { CLOTHING, CLOTHING_IDS, type ClothingId } from '../../data/clothing';
import { CLOTHING_ANIMALS, type ClothingAnimal } from '../../data/clothingAnimals';
import { FOX } from './sheetCritters2';
import { FOX_SANTA_COAT, FOX_SANTA_HAT } from './foxClothing';

// These pieces inherit the reviewed fittings, rather than inventing another
// set of offsets. All decoration stays inside the existing garment silhouette.
const BODIES = { hedgehog: HEDGEHOG, rabbit: RABBIT, mouse: MOUSE, deer: DEER, fox: FOX };
const HATS = { hedgehog: SANTA_HAT, rabbit: RABBIT_SANTA_HAT, mouse: MOUSE_SANTA_HAT, deer: DEER_SANTA_HAT, fox: FOX_SANTA_HAT };
const TOPS = { hedgehog: SANTA_COAT, rabbit: RABBIT_SANTA_COAT, mouse: MOUSE_SANTA_COAT, deer: DEER_SANTA_COAT, fox: FOX_SANTA_COAT };
type NewItem = Exclude<ClothingId, 'santaHat' | 'santaCoat'>;
export type CollectionArtName = `${ClothingAnimal}${Capitalize<NewItem>}`;
const LEGEND = {
  ...SANTA_HAT.legend, O: '#352522', R: '#bd3f36', S: '#8e302e', H: '#e35a43',
  C: '#fff0cd', T: '#d9bc91', B: '#47312b', G: '#e9b64d',
  Z: '#426b3b', Y: '#294b33', W: '#92ac60', D: '#9b6346', N: '#704634',
} as const;

function garment(animal: ClothingAnimal, id: NewItem): PixelSprite {
  const body = BODIES[animal];
  const slot = CLOTHING[id].slot;
  const frames = body.frames.map((frame, f) => {
    const view = Math.floor(f / 3);
    const template = (slot === 'hat' ? HATS : TOPS)[animal].frames[f];
    let grid = template.map(row => [...row]);
    const occupied = template.flatMap((row, y) => [...row].flatMap((c, x) => c === '.' ? [] : [{ x, y, c }]));
    const xs = occupied.map(p => p.x), ys = occupied.map(p => p.y);
    const left = Math.min(...xs), right = Math.max(...xs), top = Math.min(...ys), bottom = Math.max(...ys);
    const centre = Math.round((left + right) / 2);
    const put = (x: number, y: number, colour: string) => { if (grid[y]?.[x] !== undefined) grid[y][x] = colour; };
    if (slot === 'hat') {
      if (id === 'antlers') {
        grid = frame.map(row => [...'.'.repeat(row.length)]);
        // A small headband and two branched antlers leave the original ears visible.
        const band = bottom - 1;
        for (let x = centre - 5; x <= centre + 5; x++) put(x, band, 'O');
        for (const side of [-1, 1]) {
          const stem = centre + side * 3;
          for (let y = Math.max(0, band - 7); y < band; y++) {
            put(stem, y, 'D'); put(stem - 1, y, 'O'); put(stem + 1, y, 'O');
          }
          for (const dy of [3, 5]) {
            put(stem + side * 2, Math.max(0, band - dy), 'D');
            put(stem + side * 2, Math.max(0, band - dy - 1), 'O');
            put(stem + side * 3, Math.max(0, band - dy - 1), 'O');
            put(stem + side, Math.max(0, band - dy), 'D');
          }
        }
      } else {
        grid.forEach((row, y) => row.forEach((c, x) => {
          if (c === '.' || c === 'O') return;
          if (id === 'winterBeanie') {
            row[x] = ['C', 'T'].includes(c) ? 'Y' : c === 'S' ? 'Y' : c === 'H' ? 'W' : 'Z';
            if (y === bottom - 4 && (x - left) % 4 === 1) row[x] = 'C';
            if (y === bottom - 5 && (x - left) % 4 === 2) row[x] = 'C';
          } else {
            // Red wool with a cream bobble and a dark ribbed turn-up.
            row[x] = ['C', 'T'].includes(c) ? 'S' : c;
            if (y === bottom - 1 && x % 2 === 0) row[x] = 'H';
          }
        }));
        // The bobble sits within the cap's original top rows, never beyond its frame.
        for (let y = top; y <= Math.min(top + 2, bottom); y++) for (let x = centre - 1; x <= centre + 1; x++) {
          if (grid[y][x] !== '.') put(x, y, 'C');
        }
      }
    } else if (slot === 'top') {
      // The Santa coat leaves tiny seams between cuffs and torso. A knitted
      // sleeve covers these: otherwise the base outline shows as dark specks.
      grid.forEach((row, y) => {
        const drawn = row.flatMap((c, x) => c === '.' ? [] : [x]);
        if (!drawn.length) return;
        for (let x = Math.min(...drawn); x <= Math.max(...drawn); x++) {
          if (row[x] === '.' && frame[y][x] !== '.') row[x] = 'R';
        }
      });
      grid.forEach((row, y) => row.forEach((c, x) => {
        if (c === '.' || c === 'O') return;
        if (id === 'treeJumper') row[x] = c === 'C' || c === 'T' ? 'Y' : x < centre ? 'Z' : 'Y';
        else row[x] = x < centre ? 'C' : 'T';
        if (id === 'festiveJumper' && (y === top + 2 || y === bottom - 2)) row[x] = x % 3 === 0 ? 'C' : 'R';
      }));
      // Motifs are on the front; side and back knitting stays quiet.
      if (view === 0 && Number.isFinite(top)) {
        const cy = Math.round((top + bottom) / 2);
        if (id === 'treeJumper') {
          for (let dy = -2; dy <= 1; dy++) for (let dx = -Math.floor((dy + 2) / 2); dx <= Math.floor((dy + 2) / 2); dx++) {
            if (grid[cy + dy]?.[centre + dx] !== '.') put(centre + dx, cy + dy, 'C');
          }
          put(centre, cy + 2, 'G');
        } else if (id === 'reindeerSweater') {
          for (const [dx, dy] of [[-2, -2], [2, -2], [-1, -1], [1, -1], [-1, 0], [0, 0], [1, 0], [0, 1]]) {
            if (grid[cy + dy]?.[centre + dx] !== '.') put(centre + dx, cy + dy, 'N');
          }
          put(centre, cy + 1, 'R');
        }
      }
    } else if (slot === 'cape') {
      // Use the fitted shoulders and hem. The hedgehog's quills conceal its
      // rear cape just as they conceal the coat; tails remain outside the mask.
      grid.forEach((row, y) => row.forEach((c, x) => {
        if (c === '.' || c === 'O') return;
        if (id === 'creamCape') row[x] = x < centre ? 'C' : 'T';
        else if (id === 'greenCape') row[x] = x < centre ? 'Z' : 'Y';
        else row[x] = x < centre ? 'R' : 'S';
        if (id === 'tartanCape' && ((x - left) % 4 === 0 || (y - top) % 3 === 1)) row[x] = 'B';
        if (y === top || y === bottom) row[x] = 'C';
        // The front opening exposes the jumper underneath.
        if (view === 0 && Math.abs(x - centre) <= Math.floor((y - top) / 3) && y > top + 1) row[x] = '.';
      }));
      if (view === 0 && Number.isFinite(top)) {
        put(centre, top + 1, 'G');
        put(centre - 1, top + 1, 'R'); put(centre + 1, top + 1, 'R');
      }
    } else {
      grid = frame.map(row => [...'.'.repeat(row.length)]);
      // Feet lift in the base frames: colour their existing pixels, rather
      // than placing static boots over an animation's moving legs.
      const first = frame.length - 4;
      for (let y = first; y < frame.length; y++) for (let x = 0; x < frame[y].length; x++) {
        const c = frame[y][x];
        if (c === '.') continue;
        // Mouse tails can reach the foot rows, outside the leg columns.
        if (animal === 'mouse' && ((view === 2 && x > 15) || (view === 3 && x < 10))) continue;
        if (animal === 'mouse' && view === 1 && x >= 11 && x <= 14) continue;
        if ((animal === 'rabbit' || animal === 'deer') && ((view === 2 && x >= 16) || (view === 3 && x <= (animal === 'deer' ? 10 : 5)))) continue;
        if (animal === 'deer' && view === 1 && x >= 10 && x <= 16) continue;
        if (animal === 'hedgehog' && view === 1 && x >= 11 && x <= 17) continue;
        if (animal === 'fox' && (view === 1 || (view === 2 && x >= 19) || (view === 3 && x <= 13))) continue;
        grid[y][x] = 'ao'.includes(c) || y === frame.length - 1 ? 'O'
          : y === first ? id === 'brownBoots' || id === 'buckleBoots' ? 'T' : 'C'
          : id === 'redBoots' ? 'R' : id === 'fluffyBoots' ? 'T' : 'N';
        if (id === 'buckleBoots' && y === first + 1 && x % 3 === 0 && !'ao'.includes(c)) grid[y][x] = 'G';
      }
    }
    return grid.map(row => row.join(''));
  });
  return { legend: LEGEND, frames };
}

export const COLLECTION_ART = Object.fromEntries(CLOTHING_ANIMALS.flatMap(animal =>
  CLOTHING_IDS.filter((id): id is NewItem => id !== 'santaHat' && id !== 'santaCoat').map(id =>
    [`${animal}${id[0].toUpperCase()}${id.slice(1)}`, garment(animal, id)],
  ),
)) as Record<CollectionArtName, PixelSprite>;
