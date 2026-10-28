import { describe, expect, it } from 'vitest';
import { layerDistance } from './layerDistance';

// Letters keep these readable: B = bread, J = jam, M = mushroom.
const L = (s: string): string[] => s.split('');

describe('layerDistance', () => {
  it('is 0 for identical lists', () => {
    expect(layerDistance(L('BJB'), L('BJB'))).toBe(0);
    expect(layerDistance([], [])).toBe(0);
  });

  it('counts a missing layer as 1', () => {
    expect(layerDistance(L('BJB'), L('BJ'))).toBe(1);
    expect(layerDistance(L('BJB'), L('JB'))).toBe(1);
  });

  it('counts an extra layer as 1', () => {
    expect(layerDistance(L('BJB'), L('BJJB'))).toBe(1);
  });

  it('counts a replaced layer as 1', () => {
    expect(layerDistance(L('BJB'), L('BMB'))).toBe(1);
  });

  it('counts two swapped neighbours as 1', () => {
    expect(layerDistance(L('BJB'), L('BBJ'))).toBe(1);
    expect(layerDistance(L('BJ'), L('JB'))).toBe(1);
  });

  it('adds up separate mistakes', () => {
    expect(layerDistance(L('BJB'), L('JJ'))).toBe(2); // missing B + replaced B
    expect(layerDistance(L('BJB'), L('BBJJ'))).toBe(2); // swap + extra
    expect(layerDistance(L('BJB'), L('MMM'))).toBe(3);
  });

  it('against an empty list, equals the other list length', () => {
    expect(layerDistance(L('BJB'), [])).toBe(3);
  });

  it('is symmetric', () => {
    expect(layerDistance(L('BJJB'), L('JBM'))).toBe(layerDistance(L('JBM'), L('BJJB')));
  });
});
