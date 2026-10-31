import { describe, expect, it } from 'vitest';
import { CAFE_LAYOUT } from '../data/cafeLayout';
import { buildLayout, CAFE_ROOM, furnishedRows, splitLayout, startingFurniture } from './furniture';
import { parseLayout } from './layout';

describe('splitLayout', () => {
  it('takes the tables and chairs out of the rows, leaving floor', () => {
    const { room, placed } = splitLayout(['WSTSW', 'W.D.W']);
    expect(room).toEqual(['W...W', 'W.D.W']);
    expect(placed).toEqual([
      { kind: 'chair', x: 1, y: 0 },
      { kind: 'table', x: 2, y: 0 },
      { kind: 'chair', x: 3, y: 0 },
    ]);
  });

  it('and furnishedRows puts them back exactly', () => {
    const { room, placed } = splitLayout(CAFE_LAYOUT);
    expect(furnishedRows(room, placed)).toEqual([...CAFE_LAYOUT]);
  });
});

describe('the cafe', () => {
  it('the room has no furniture in it', () => {
    expect(CAFE_ROOM.join('')).not.toMatch(/[TS]/);
  });

  it("starts with cafeLayout.ts's furniture placed and none stored", () => {
    const furniture = startingFurniture();
    expect(furniture.placed.filter((p) => p.kind === 'table')).toHaveLength(4);
    expect(furniture.placed.filter((p) => p.kind === 'chair')).toHaveLength(8);
    expect(furniture.stored).toEqual({ table: 0, chair: 0 });
  });

  it('builds the same floor as the hand-written layout', () => {
    expect(buildLayout(startingFurniture())).toEqual(parseLayout(CAFE_LAYOUT));
  });

  it('an empty cafe is still a valid layout (just no seats)', () => {
    expect(buildLayout({ placed: [], stored: { table: 0, chair: 0 } }).tables).toEqual([]);
  });
});
