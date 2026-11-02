import type { PixelSprite } from '../pixelSprite';
import { DEER, HEDGEHOG, MOUSE, RABBIT } from './sheetCritters';
import { SANTA_COAT, SANTA_HAT } from './wardrobe';
import { DEER_SANTA_COAT, DEER_SANTA_HAT, MOUSE_SANTA_COAT, MOUSE_SANTA_HAT, RABBIT_SANTA_COAT, RABBIT_SANTA_HAT } from './wardrobeCritters';
import { COLLECTION_ART, type CollectionArtName } from './christmasClothing';
import { CLOTHING_IDS, type ClothingId } from '../../data/clothing';
import { clothingArt } from '../../data/clothingFits';
import { PLAYER_ANIMALS, type PlayerAnimal } from '../../data/playerAnimals';

const BODIES = { hedgehog: HEDGEHOG, rabbit: RABBIT, mouse: MOUSE, deer: DEER };
const HATS = { hedgehog: SANTA_HAT, rabbit: RABBIT_SANTA_HAT, mouse: MOUSE_SANTA_HAT, deer: DEER_SANTA_HAT };
const COATS = { hedgehog: SANTA_COAT, rabbit: RABBIT_SANTA_COAT, mouse: MOUSE_SANTA_COAT, deer: DEER_SANTA_COAT };
export type MannequinArtName = `${PlayerAnimal}Mannequin${Capitalize<ClothingId>}`;

export function mannequinArtName(animal: PlayerAnimal, item: ClothingId): MannequinArtName {
  return `${animal}Mannequin${item[0].toUpperCase()}${item.slice(1)}` as MannequinArtName;
}

/** A garment can close a tiny gap at a wooden shoulder: fill it with wood. */
function sealDisplay(frame: string[]): string[] {
  const height = frame.length, width = frame[0].length;
  const outside = new Set<number>();
  const todo: [number, number][] = [];
  for (let x = 0; x < width; x++) todo.push([x, 0], [x, height - 1]);
  for (let y = 0; y < height; y++) todo.push([0, y], [width - 1, y]);
  while (todo.length) {
    const [x, y] = todo.pop()!;
    if (x < 0 || y < 0 || x >= width || y >= height || frame[y][x] !== '.' || outside.has(y * width + x)) continue;
    outside.add(y * width + x);
    todo.push([x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]);
  }
  return frame.map((row, y) => [...row].map((c, x) => c === '.' && !outside.has(y * width + x) ? 'J' : c).join(''));
}

function mannequin(animal: PlayerAnimal, item: ClothingId): PixelSprite {
  const body = BODIES[animal], original = body.frames[0];
  const width = original[0].length, height = original.length;
  const clothing = item === 'santaHat' ? HATS[animal] : item === 'santaCoat' ? COATS[animal]
    : COLLECTION_ART[clothingArt(animal, item) as CollectionArtName];
  const shape = Array.from({ length: height + 4 }, () => Array<string>(width).fill('.'));
  const centre = Math.floor(width / 2);
  // Keep the critter's actual silhouette and clothing coordinates. Only its
  // colours and facial details become featureless wood; ears, antlers,
  // quills, shoulders and feet stay where they are on the playable animal.
  original.forEach((row, y) => [...row].forEach((c, x) => {
    if (c !== '.') shape[y][x] = 'J';
  }));
  for (let y = height; y < height + 3; y++) shape[y][centre] = 'J';
  for (let x = centre - 6; x <= centre + 6; x++) {
    shape[height + 2][x] = 'J';
    shape[height + 3][x] = 'K';
  }
  const blank = (x: number, y: number) => shape[y]?.[x] === undefined || shape[y][x] === '.';
  const frame = shape.map((row, y) => row.map((c, x) => {
    const garmentPixel = clothing.frames[0][y]?.[x] ?? '.';
    if (garmentPixel !== '.') return garmentPixel;
    if (c === '.') return c;
    if (blank(x - 1, y) || blank(x + 1, y) || blank(x, y - 1) || blank(x, y + 1)) return 'K';
    return x < centre ? 'J' : 'L';
  }).join(''));
  return { legend: { ...clothing.legend, J: '#c8af89', K: '#604a39', L: '#a28764' }, frames: [sealDisplay(frame)] };
}

export const MANNEQUIN_ART = Object.fromEntries(PLAYER_ANIMALS.flatMap(animal =>
  CLOTHING_IDS.map(item => [mannequinArtName(animal, item), mannequin(animal, item)]),
)) as Record<MannequinArtName, PixelSprite>;
