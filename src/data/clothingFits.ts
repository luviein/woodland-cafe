import type { ArtName } from '../art/spriteArt';

/** Same inventory slots and walk frames; each animal uses art fitted to its own body. */
export const CLOTHING_FITS = {
  hedgehog: { santaHat: 'santaHat', santaCoat: 'santaCoat' },
  rabbit: { santaHat: 'rabbitSantaHat', santaCoat: 'rabbitSantaCoat' },
  mouse: { santaHat: 'mouseSantaHat', santaCoat: 'mouseSantaCoat' },
  deer: { santaHat: 'deerSantaHat', santaCoat: 'deerSantaCoat' },
} as const satisfies Record<string, Record<'santaHat' | 'santaCoat', ArtName>>;
