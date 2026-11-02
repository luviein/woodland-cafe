import { CLOTHING, clothingPrice, type ClothingId } from './clothing';
import { mannequinArtName } from '../art/sprites/mannequins';
import { FURNITURE, type DesignId } from './furniture';
import type { PlayerAnimal } from './playerAnimals';

export type CatalogueItem = DesignId | ClothingId;
export function isClothingItem(id: CatalogueItem): id is ClothingId {
  return Object.hasOwn(CLOTHING, id);
}
export function catalogueProduct(id: CatalogueItem, animal: PlayerAnimal = 'hedgehog') {
  return isClothingItem(id)
    ? { name: CLOTHING[id].name, price: clothingPrice(id), art: mannequinArtName(animal, id), blurb: 'One purchase, every animal. Wear it from your wardrobe.', unique: true }
    : { ...FURNITURE[id], unique: false };
}
