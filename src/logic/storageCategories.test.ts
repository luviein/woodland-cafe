import { describe, expect, it } from 'vitest';
import { DESIGN_IDS } from '../data/furniture';
import { STORAGE_CATEGORIES } from '../data/storageCategories';
import { noneStored } from './furniture';
import { storageDesigns } from './storageCategories';

describe('Decorate storage categories', () => {
  it('assigns every design to exactly one category in catalogue order', () => {
    const furniture = { placed: [], stored: Object.fromEntries(DESIGN_IDS.map(id => [id, 1])) as ReturnType<typeof noneStored> };
    const shown = STORAGE_CATEGORIES.flatMap(category => {
      const designs = storageDesigns(furniture, category.id);
      expect(designs).toEqual(DESIGN_IDS.filter(id => designs.includes(id)));
      return designs;
    });
    expect(shown).toHaveLength(DESIGN_IDS.length);
    expect(new Set(shown)).toEqual(new Set(DESIGN_IDS));
  });

  it('includes placed and stored items, keeps the plain seats, and omits unowned designs', () => {
    const furniture = { placed: [{ design: 'treeRug' as const, x: 4.5, y: 4.5 }], stored: { ...noneStored(), floralRug: 2, pineGarland: 1, snowGlobe: 1 } };
    expect(storageDesigns(furniture, 'tables')).toEqual(['table']);
    expect(storageDesigns(furniture, 'chairs')).toEqual(['chair']);
    expect(storageDesigns(furniture, 'rugs')).toEqual(['treeRug', 'floralRug']);
    expect(storageDesigns(furniture, 'wall')).toEqual(['pineGarland']);
    expect(storageDesigns(furniture, 'decorations')).toEqual(['snowGlobe']);
    expect(storageDesigns({ placed: [], stored: noneStored() }, 'rugs')).toEqual([]);
  });
});
