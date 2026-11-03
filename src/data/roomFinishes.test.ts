import { describe, expect, it } from 'vitest';
import { wallFinishTile } from './roomFinishes';
import { SPRITE_ART } from '../art/spriteArt';

describe('wallpaper orientation', () => {
  it('faces the bottom wall trim towards the floor', () => {
    for (let style = 0; style <= 4; style++) {
      const tile = wallFinishTile(style, 5, 11, 24, false);
      expect(tile.art).toBe(`roomBottomWall${style}`);
      const bottom = SPRITE_ART[tile.art];
      const top = SPRITE_ART[style === 0 ? 'wall' : `roomWall${style}` as 'roomWall1'];
      expect(bottom.frames[0]).toEqual([...top.frames[0]].reverse());
    }
  });
  it('joins the horizontal wall without shifting or compressing its edge pixels', () => {
    for (let style = 0; style <= 4; style++) {
      const wall = SPRITE_ART[style === 0 ? 'wall' : `roomWall${style}` as 'roomWall1'];
      const corner = SPRITE_ART[`roomWallCorner${style}` as 'roomWallCorner0'];
      for (let frame = 0; frame < 4; frame++) {
        const x = frame % 2 === 0 ? 23 : 0;
        for (let y = 0; y < 24; y++) {
          const cornerColour = corner.legend[corner.frames[frame][y][x] as keyof typeof corner.legend];
          const wallColour = wall.legend[wall.frames[0][frame < 2 ? y : 23 - y][x] as keyof typeof wall.legend];
          expect(cornerColour).toBe(wallColour);
        }
      }
    }
  });
  it('selects the matching L-shaped trim at all four corners', () => {
    for (let style = 0; style <= 4; style++) {
      [[0, 0], [23, 0], [0, 11], [23, 11]].forEach(([x, y], frame) => {
        expect(wallFinishTile(style, x, y, 24, false)).toEqual({ art: `roomWallCorner${style}`, frame });
      });
    }
  });
  it('uses continuous vertical strips on both sides for every painted wallpaper', () => {
    for (const style of [1, 2, 3, 4]) for (const x of [0, 23]) {
      for (let y = 1; y < 11; y++) {
        const tile = wallFinishTile(style, x, y, 24, false);
        expect(tile.art).toBe(`roomSideWall${style}`);
        expect(tile.frame).toBe(style === 2 ? (y - 1) % 4 : (y - 1) % 2 + (x === 0 ? 0 : 2));
        expect(SPRITE_ART[tile.art].frames[tile.frame]).toHaveLength(24);
      }
    }
  });

  it('keeps back-wall windows and the original log finish', () => {
    expect(wallFinishTile(3, 2, 0, 24, true)).toEqual({ art: 'roomWall3', frame: 1 });
    expect(wallFinishTile(3, 0, 0, 24, false)).toEqual({ art: 'roomWallCorner3', frame: 0 });
    expect(wallFinishTile(0, 0, 3, 24, false)).toEqual({ art: 'roomSideWall0', frame: 0 });
  });
});
