export const CROPS = {
  mushroom: { name: 'Mushroom', minutes: 5, seedPrice: 1, yield: 4 },
  tomato: { name: 'Tomato', minutes: 10, seedPrice: 2, yield: 4 },
  chilli: { name: 'Chilli', minutes: 15, seedPrice: 3, yield: 4 },
} as const;
export type CropId = keyof typeof CROPS;
export const CROP_IDS = Object.keys(CROPS) as CropId[];
export const GARDEN_PLOTS = 6;
