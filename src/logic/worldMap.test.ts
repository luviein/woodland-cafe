import { describe, expect, it } from 'vitest';
import { chooseLocation, dotsAlong } from './worldMap';

describe('chooseLocation', () => {
  it('the cafe can be entered', () => {
    expect(chooseLocation('cafe')).toBe('enter');
  });

  it('places without a scene yet are not built', () => {
    expect(chooseLocation('forest')).toBe('notBuilt');
  });
});

describe('dotsAlong', () => {
  it('spaces dots evenly from end to end', () => {
    expect(dotsAlong({ x: 0, y: 0 }, { x: 20, y: 0 }, 10)).toEqual([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 20, y: 0 },
    ]);
  });

  it('leaves a margin at both ends, centring the dots in what is left', () => {
    // 100 long, 20 margin each side: 60 usable, dots at 20, 35, 50, 65, 80.
    const dots = dotsAlong({ x: 0, y: 0 }, { x: 100, y: 0 }, 15, 20);
    expect(dots.map((d) => d.x)).toEqual([20, 35, 50, 65, 80]);
  });

  it('works on diagonals', () => {
    const dots = dotsAlong({ x: 0, y: 0 }, { x: 30, y: 40 }, 25); // length 50
    expect(dots).toEqual([
      { x: 0, y: 0 },
      { x: 15, y: 20 },
      { x: 30, y: 40 },
    ]);
  });

  it('no room left after the margins: no dots', () => {
    expect(dotsAlong({ x: 0, y: 0 }, { x: 10, y: 0 }, 5, 6)).toEqual([]);
  });
});
