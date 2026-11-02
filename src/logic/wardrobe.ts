import type { PlayerAnimal } from '../data/playerAnimals';

/** Independent slots keep equipping a hat from removing a top. */
export interface Outfit {
  hat: 'santaHat' | null;
  top: 'santaCoat' | null;
}

export const emptyOutfit = (): Outfit => ({ hat: null, top: null });

/** Species changes are cosmetic: retain outfit and all progress. */
export function changeAnimal<T extends { animal: PlayerAnimal }>(state: T, animal: PlayerAnimal): T {
  return { ...state, animal };
}

export function equip<K extends keyof Outfit>(outfit: Outfit, slot: K, item: Outfit[K]): Outfit {
  return { ...outfit, [slot]: item };
}

/** Removed or unknown cosmetics are safely unequipped on load. */
export function readOutfit(raw: unknown): Outfit {
  if (!raw || typeof raw !== 'object') return emptyOutfit();
  const value = raw as Record<string, unknown>;
  return { hat: value.hat === 'santaHat' ? 'santaHat' : null, top: value.top === 'santaCoat' ? 'santaCoat' : null };
}
