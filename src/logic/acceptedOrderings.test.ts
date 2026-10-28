import { describe, expect, it } from 'vitest';
import { acceptedOrderings } from './acceptedOrderings';

// Letters keep these readable: B = bread (fixed), T = tuna, M = tomato, J = jam, C = chilli.
const L = (s: string): string[] => s.split('');
const accepted = (s: string): string[] =>
  acceptedOrderings(L(s), ['B']).map((layers) => layers.join(''));

describe('acceptedOrderings', () => {
  it('a recipe with one filling has one ordering', () => {
    expect(accepted('BJB')).toEqual(['BJB']);
    expect(accepted('B')).toEqual(['B']);
  });

  it('sandwich fillings between the breads can be in any order', () => {
    expect(accepted('BTMB').sort()).toEqual(['BMTB', 'BTMB']);
  });

  it('open bread toppings can be in any order', () => {
    expect(accepted('BTC').sort()).toEqual(['BCT', 'BTC']);
  });

  it('repeated fillings do not produce duplicate orderings', () => {
    expect(accepted('BJJ')).toEqual(['BJJ']);
  });

  it('fixed layers never move', () => {
    for (const layers of accepted('BTMCB')) {
      expect(layers[0]).toBe('B');
      expect(layers.at(-1)).toBe('B');
    }
    expect(accepted('BTMCB')).toHaveLength(6); // 3 fillings -> 3! orderings
  });
});
