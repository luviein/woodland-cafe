import type { ArtName } from '../art/spriteArt';
import type { PlayerAnimal } from './playerAnimals';
import type { ClothingId } from './clothing';
import type { CollectionArtName } from '../art/sprites/christmasClothing';

/** Same inventory slots and walk frames; each animal uses art fitted to its own body. */
export const CLOTHING_FITS = {
  hedgehog: { santaHat: 'santaHat', santaCoat: 'santaCoat' },
  rabbit: { santaHat: 'rabbitSantaHat', santaCoat: 'rabbitSantaCoat' },
  mouse: { santaHat: 'mouseSantaHat', santaCoat: 'mouseSantaCoat' },
  deer: { santaHat: 'deerSantaHat', santaCoat: 'deerSantaCoat' },
} as const satisfies Record<PlayerAnimal, Record<'santaHat' | 'santaCoat', ArtName>>;

export function clothingArt(animal: PlayerAnimal, item: ClothingId): ArtName {
  if (item === 'santaHat' || item === 'santaCoat') return CLOTHING_FITS[animal][item];
  return `${animal}${item[0].toUpperCase()}${item.slice(1)}` as CollectionArtName;
}
