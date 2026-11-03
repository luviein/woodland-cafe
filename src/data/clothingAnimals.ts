import { PLAYER_ANIMALS } from './playerAnimals';

/** Customer species share the clothing system without becoming a player choice. */
export const CLOTHING_ANIMALS = [...PLAYER_ANIMALS, 'fox', 'frog', 'badger', 'raccoon'] as const;
export type ClothingAnimal = (typeof CLOTHING_ANIMALS)[number];
