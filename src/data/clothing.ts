export const CLOTHING = {
  santaHat: { name: 'Santa hat', slot: 'hat' },
  antlers: { name: 'Antlers', slot: 'hat' },
  bobbleHat: { name: 'Red bobble hat', slot: 'hat' },
  winterBeanie: { name: 'Winter beanie', slot: 'hat' },
  santaCoat: { name: 'Santa coat', slot: 'top' },
  reindeerSweater: { name: 'Reindeer sweater', slot: 'top' },
  treeJumper: { name: 'Tree jumper', slot: 'top' },
  festiveJumper: { name: 'Festive jumper', slot: 'top' },
  redCape: { name: 'Red cape', slot: 'cape' },
  greenCape: { name: 'Green cape', slot: 'cape' },
  creamCape: { name: 'Cream cape', slot: 'cape' },
  tartanCape: { name: 'Tartan cape', slot: 'cape' },
  redBoots: { name: 'Red boots', slot: 'shoes' },
  brownBoots: { name: 'Brown boots', slot: 'shoes' },
  buckleBoots: { name: 'Buckled boots', slot: 'shoes' },
  fluffyBoots: { name: 'Fluffy boots', slot: 'shoes' },
} as const;
export type ClothingId = keyof typeof CLOTHING;
export type ClothingSlot = (typeof CLOTHING)[ClothingId]['slot'];
export const CLOTHING_SLOTS = ['hat', 'top', 'cape', 'shoes'] as const;
export const CLOTHING_IDS = Object.keys(CLOTHING) as ClothingId[];
export const STARTER_CLOTHING: readonly ClothingId[] = ['santaHat', 'santaCoat'];
export function clothingPrice(id: ClothingId): number {
  if (id === 'antlers' || id === 'buckleBoots' || id === 'fluffyBoots') return 20;
  return { hat: 15, top: 25, cape: 30, shoes: 15 }[CLOTHING[id].slot];
}
export type ClothingFor<S extends ClothingSlot> = {
  [K in ClothingId]: (typeof CLOTHING)[K]['slot'] extends S ? K : never
}[ClothingId];
export function clothingIn(slot: ClothingSlot): ClothingId[] {
  return CLOTHING_IDS.filter(id => CLOTHING[id].slot === slot);
}
