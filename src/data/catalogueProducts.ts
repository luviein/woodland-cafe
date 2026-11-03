import { isFinishItem, finishProduct, type FinishId } from './roomFinishProducts';
import { CLOTHING, clothingPrice, type ClothingId } from './clothing';
import { catalogueSampleName } from '../art/sprites/catalogueSamples';
import { FURNITURE, type DesignId } from './furniture';
import type { PlayerAnimal } from './playerAnimals';

export type CatalogueItem = DesignId | ClothingId | FinishId;
export function isClothingItem(id: CatalogueItem): id is ClothingId {
  return Object.hasOwn(CLOTHING, id);
}
export function catalogueProduct(id: CatalogueItem, animal: PlayerAnimal = 'hedgehog') {
  if (isFinishItem(id)) return finishProduct(id);
  return isClothingItem(id)
    ? { name: CLOTHING[id].name, price: clothingPrice(id), art: catalogueSampleName(animal, id), blurb: 'One purchase, every animal. Wear it from your wardrobe.', unique: true }
    : { ...FURNITURE[id], unique: false };
}
