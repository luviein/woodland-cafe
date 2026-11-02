import type { PlayerAnimal } from '../data/playerAnimals';
import { CLOTHING_SLOTS, clothingIn, type ClothingFor, type ClothingId, type ClothingSlot } from '../data/clothing';

/** Independent slots keep equipping a hat from removing a top. */
export type Outfit = { [S in ClothingSlot]: ClothingFor<S> | null };

export const emptyOutfit = (): Outfit => ({ hat: null, top: null, cape: null, shoes: null });

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
  return Object.fromEntries(CLOTHING_SLOTS.map(slot => [slot,
    clothingIn(slot).includes(value[slot] as ClothingId) ? value[slot] : null,
  ])) as Outfit;
}
