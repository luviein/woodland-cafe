import { describe, expect, it } from 'vitest';
import { CLOTHING_IDS } from './clothing';
import { CHRISTMAS_CATALOGUE } from './furniture';
import { catalogueProduct } from './catalogueProducts';
import { isArtName } from '../art/spriteArt';
import { CHRISTMAS_VENDOR } from './stallVendors';
import { fileContents, moveTo, replaceScreen } from '../layout/positions';

describe('Christmas catalogue and vendor', () => {
  it('lists every clothing item exactly once in its own section', () => {
    const clothes = CHRISTMAS_CATALOGUE.tabs.find(tab => tab.name === 'Clothes');
    expect(clothes?.designs).toEqual(CLOTHING_IDS);
    expect(new Set(clothes?.designs).size).toBe(CLOTHING_IDS.length);
    for (const id of CLOTHING_IDS) {
      const product = catalogueProduct(id, 'rabbit');
      expect(product.art.startsWith('rabbitCatalogue')).toBe(true);
      expect(product.unique).toBe(true);
      expect(Number.isInteger(product.price)).toBe(true);
      expect(product.price).toBeGreaterThan(0);
      expect(isArtName(product.art)).toBe(true);
    }
    expect(catalogueProduct('chairWithBow').unique).toBe(false);
  });

  it('positions the vendor relative to the saved stall location', () => {
    const saved = fileContents('marketplace');
    try {
      moveTo('marketplace', 'stall.christmas', { x: 150, y: 250 });
      expect(CHRISTMAS_VENDOR.position).toEqual({ x: 150, y: 242 });
      moveTo('marketplace', 'stall.christmas', { x: 210, y: 230 });
      expect(CHRISTMAS_VENDOR.position).toEqual({ x: 210, y: 222 });
    } finally {
      replaceScreen('marketplace', saved);
    }
  });
});
