import { describe, expect, it } from 'vitest';
import { CLOTHING_SLOTS, clothingIn } from '../data/clothing';
import { christmasCustomerOutfit } from './christmasOutfits';
import { emptyOutfit } from './wardrobe';

describe('seasonal customer outfits', () => {
  it('dresses customers only during December, or with the dev season override', () => {
    for (const date of [new Date(2026, 10, 30), new Date(2027, 0, 1)]) {
      expect(christmasCustomerOutfit(1, 2, date)).toEqual(emptyOutfit());
      expect(Object.values(christmasCustomerOutfit(1, 2, date, true)).some(Boolean)).toBe(true);
    }
    for (const date of [new Date(2026, 11, 1), new Date(2026, 11, 31)]) {
      expect(Object.values(christmasCustomerOutfit(1, 2, date)).some(Boolean)).toBe(true);
    }
  });

  it('keeps a visit stable, gives every customer an item and uses varied valid combinations', () => {
    const today = new Date(2026, 11, 15), outfits = new Set<string>();
    const seen = new Set<string>();
    for (let id = 1; id <= 100; id++) {
      const outfit = christmasCustomerOutfit(id, 4, today);
      expect(outfit).toEqual(christmasCustomerOutfit(id, 4, today));
      expect(Object.values(outfit).some(Boolean)).toBe(true);
      for (const slot of CLOTHING_SLOTS) {
        const item = outfit[slot];
        if (item) { expect(clothingIn(slot)).toContain(item); seen.add(item); }
      }
      outfits.add(JSON.stringify(outfit));
    }
    expect(outfits.size).toBeGreaterThan(50);
    expect(seen.size).toBe(16);
    expect(christmasCustomerOutfit(1, 5, today)).not.toEqual(christmasCustomerOutfit(1, 4, today));
  });
});
