import type { PixelSprite } from '../pixelSprite';
import { CRITTER_SKELETON } from './critterSkeleton';
import { SANTA_COAT, SANTA_HAT } from './wardrobe';
import { COLLECTION_ART, type CollectionArtName } from './christmasClothing';
import { CLOTHING, CLOTHING_IDS, type ClothingId } from '../../data/clothing';
import { clothingArt } from '../../data/clothingFits';
import { PLAYER_ANIMALS, type PlayerAnimal } from '../../data/playerAnimals';

export type MannequinArtName = `${PlayerAnimal}Mannequin${Capitalize<ClothingId>}`;
export function mannequinArtName(animal: PlayerAnimal, item: ClothingId): MannequinArtName {
  return `${animal}Mannequin${item[0].toUpperCase()}${item.slice(1)}` as MannequinArtName;
}

function mannequin(item: ClothingId): PixelSprite {
  // Use the user's exact shared grey body. Refit only the display garment;
  // the clothing worn by playable animals keeps its reviewed fitting.
  const clothing = item === 'santaHat' ? SANTA_HAT : item === 'santaCoat' ? SANTA_COAT
    : COLLECTION_ART[clothingArt('hedgehog', item) as CollectionArtName];
  const shape = CRITTER_SKELETON.frames[0].map(row => [...row]);
  const source = clothing.frames[0];
  const points = source.flatMap((row, y) => [...row].flatMap((c, x) => c === '.' ? [] : [{ x, y }]));
  const left = Math.min(...points.map(p => p.x)), right = Math.max(...points.map(p => p.x));
  const top = Math.min(...points.map(p => p.y)), bottom = Math.max(...points.map(p => p.y));
  const slot = CLOTHING[item].slot;
  const box = slot === 'hat' ? { left: 5, top: 7, width: 22, height: 11 }
    : slot === 'shoes' ? { left: 11, top: 37, width: 10, height: 3 }
    : { left: 6, top: 28, width: 20, height: 9 };
  if (item === 'antlers') {
    box.width = Math.round((right - left + 1) * 22 / 19);
    box.left = Math.floor((32 - box.width) / 2);
  }
  for (let dy = 0; dy < box.height; dy++) for (let dx = 0; dx < box.width; dx++) {
    const sy = top + Math.min(bottom - top, Math.floor(dy * (bottom - top + 1) / box.height));
    const sx = left + Math.min(right - left, Math.floor(dx * (right - left + 1) / box.width));
    const colour = source[sy][sx];
    if (colour !== '.') shape[box.top + dy][box.left + dx] = colour;
  }
  return { legend: { ...clothing.legend, ...CRITTER_SKELETON.legend }, frames: [shape.map(row => row.join(''))] };
}

const DISPLAYS = Object.fromEntries(CLOTHING_IDS.map(item => [item, mannequin(item)])) as Record<ClothingId, PixelSprite>;
export const MANNEQUIN_ART = Object.fromEntries(PLAYER_ANIMALS.flatMap(animal =>
  CLOTHING_IDS.map(item => [mannequinArtName(animal, item), DISPLAYS[item]]),
)) as Record<MannequinArtName, PixelSprite>;
