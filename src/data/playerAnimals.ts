export const PLAYER_ANIMALS = ['hedgehog', 'rabbit', 'mouse', 'deer', 'frog', 'badger', 'raccoon'] as const;
export type PlayerAnimal = (typeof PLAYER_ANIMALS)[number];

export const ANIMAL_NAMES: Record<PlayerAnimal, string> = {
  hedgehog: 'Hedgehog', rabbit: 'Rabbit', mouse: 'Mouse', deer: 'Deer', frog: 'Frog', badger: 'Badger', raccoon: 'Raccoon',
};

/** Older saves and removed animal types keep a playable default. */
export function readPlayerAnimal(raw: unknown): PlayerAnimal {
  return PLAYER_ANIMALS.includes(raw as PlayerAnimal) ? raw as PlayerAnimal : 'hedgehog';
}
