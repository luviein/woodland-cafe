import { describe, expect, it } from 'vitest';
import { fileContents, layoutPoint, moveTo, replaceScreen, snap } from './positions';

// A screen name no layout file uses, so these tests start from nothing saved.
const SCREEN = 'test-screen';

describe('positions by name (GAME_DESIGN.md §9.3)', () => {
  it('uses the default until something is moved, then the move', () => {
    replaceScreen(SCREEN, {});
    expect(layoutPoint(SCREEN, 'button', { x: 10, y: 20 })).toEqual({ x: 10, y: 20 });
    moveTo(SCREEN, 'button', { x: 30, y: 40 });
    expect(layoutPoint(SCREEN, 'button', { x: 10, y: 20 })).toEqual({ x: 30, y: 40 });
  });

  it('saves only what differs from its default, sorted by name', () => {
    replaceScreen(SCREEN, {});
    layoutPoint(SCREEN, 'b', { x: 1, y: 1 });
    layoutPoint(SCREEN, 'a', { x: 2, y: 2 });
    moveTo(SCREEN, 'b', { x: 5, y: 5 });
    moveTo(SCREEN, 'a', { x: 2, y: 2 }); // moved back where it started: nothing to save
    expect(fileContents(SCREEN)).toEqual({ b: { x: 5, y: 5 } });
  });

  it('Reset goes back to a file', () => {
    moveTo(SCREEN, 'button', { x: 99, y: 99 });
    replaceScreen(SCREEN, { button: { x: 7, y: 8 } });
    expect(layoutPoint(SCREEN, 'button', { x: 0, y: 0 })).toEqual({ x: 7, y: 8 });
  });

  it('hands out copies, so changing a point never moves the saved one', () => {
    replaceScreen(SCREEN, {});
    const p = layoutPoint(SCREEN, 'button', { x: 1, y: 2 });
    p.x = 50;
    expect(layoutPoint(SCREEN, 'button', { x: 1, y: 2 })).toEqual({ x: 1, y: 2 });
  });

  it('snaps to whole pixels, or a grid', () => {
    expect(snap({ x: 10.4, y: 10.6 })).toEqual({ x: 10, y: 11 });
    expect(snap({ x: 13, y: 20 }, 8)).toEqual({ x: 16, y: 24 });
  });
});
