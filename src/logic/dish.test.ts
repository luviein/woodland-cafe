import { describe, expect, it } from 'vitest';
import { toCounts } from './dish';

describe('toCounts', () => {
  it('counts each ingredient regardless of the order added', () => {
    expect(toCounts(['bread', 'jam', 'bread'])).toEqual({ bread: 2, jam: 1 });
  });

  it('is empty for an empty dish', () => {
    expect(toCounts([])).toEqual({});
  });
});
