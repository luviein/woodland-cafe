import type { ArtName } from '../art/spriteArt';
import type { ClothingAnimal } from './clothingAnimals';
import type { ClothingId } from './clothing';
import type { CollectionArtName } from '../art/sprites/christmasClothing';

/** Same inventory slots and walk frames; each animal uses art fitted to its own body. */
export const CLOTHING_FITS = {
  hedgehog: { santaHat: 'santaHat', santaCoat: 'santaCoat' },
  rabbit: { santaHat: 'rabbitSantaHat', santaCoat: 'rabbitSantaCoat' },
  mouse: { santaHat: 'mouseSantaHat', santaCoat: 'mouseSantaCoat' },
  deer: { santaHat: 'deerSantaHat', santaCoat: 'deerSantaCoat' },
  fox: { santaHat: 'foxSantaHat', santaCoat: 'foxSantaCoat' },
  frog: { santaHat: 'frogSantaHat', santaCoat: 'frogSantaCoat' },
  badger: { santaHat: 'badgerSantaHat', santaCoat: 'badgerSantaCoat' },
  raccoon: { santaHat: 'raccoonSantaHat', santaCoat: 'raccoonSantaCoat' },
} as const satisfies Record<ClothingAnimal, Record<'santaHat' | 'santaCoat', ArtName>>;

export function clothingArt(animal: ClothingAnimal, item: ClothingId): ArtName {
  if (item === 'santaHat' || item === 'santaCoat') return CLOTHING_FITS[animal][item];
  return `${animal}${item[0].toUpperCase()}${item.slice(1)}` as CollectionArtName;
}
