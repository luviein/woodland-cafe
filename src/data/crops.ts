export const CROPS = {
  mushroom: { name: 'Mushroom', minutes: 5, seedPrice: 1, seasonalSeedPrice: 5, yield: 4 },
  tomato: { name: 'Tomato', minutes: 10, seedPrice: 2, seasonalSeedPrice: 10, yield: 4 },
  chilli: { name: 'Chilli', minutes: 15, seedPrice: 3, seasonalSeedPrice: 15, yield: 4 },
} as const;
export type CropId = keyof typeof CROPS;
export const CROP_IDS = Object.keys(CROPS) as CropId[];
export const GARDEN_PLOTS = 6;
export type SeedType = 'normal' | 'christmas';
export type CropEvent = 'christmas';
export type CropVariant = 'ordinary' | 'golden' | CropEvent;
export const SPECIAL_VARIANTS = ['golden', 'christmas'] as const;
export const CROP_CHANCES = { seasonal: 0.03, golden: 0.05, doubleHarvest: 0.05 } as const;
