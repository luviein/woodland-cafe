export const PLAYER_ANIMALS = ['hedgehog', 'rabbit', 'mouse', 'deer'] as const;
export type PlayerAnimal = (typeof PLAYER_ANIMALS)[number];

export const ANIMAL_NAMES: Record<PlayerAnimal, string> = {
  hedgehog: 'Hedgehog', rabbit: 'Rabbit', mouse: 'Mouse', deer: 'Deer',
};

/** Older saves and removed animal types keep a playable default. */
export function readPlayerAnimal(raw: unknown): PlayerAnimal {
  return PLAYER_ANIMALS.includes(raw as PlayerAnimal) ? raw as PlayerAnimal : 'hedgehog';
}
