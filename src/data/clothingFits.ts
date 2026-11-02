import type { ArtName } from '../art/spriteArt';
import type { PlayerAnimal } from './playerAnimals';

/** Same inventory slots and walk frames; each animal uses art fitted to its own body. */
export const CLOTHING_FITS = {
  hedgehog: { santaHat: 'santaHat', santaCoat: 'santaCoat' },
  rabbit: { santaHat: 'rabbitSantaHat', santaCoat: 'rabbitSantaCoat' },
  mouse: { santaHat: 'mouseSantaHat', santaCoat: 'mouseSantaCoat' },
  deer: { santaHat: 'deerSantaHat', santaCoat: 'deerSantaCoat' },
} as const satisfies Record<PlayerAnimal, Record<'santaHat' | 'santaCoat', ArtName>>;
