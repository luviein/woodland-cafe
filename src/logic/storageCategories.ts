import { DESIGN_IDS, kindOf, type DesignId } from '../data/furniture';
import { STORAGE_CATEGORIES, type StorageCategory } from '../data/storageCategories';
import type { Furniture } from './furniture';

/** Keep placed designs discoverable, with zero-stock cards faded by the UI. */
export function storageDesigns(furniture: Furniture, category: StorageCategory): DesignId[] {
  const kind = STORAGE_CATEGORIES.find(item => item.id === category)!.kind;
  return DESIGN_IDS.filter(design => kindOf(design) === kind && (
    design === 'table' || design === 'chair' || furniture.stored[design] > 0 || furniture.placed.some(piece => piece.design === design)
  ));
}
