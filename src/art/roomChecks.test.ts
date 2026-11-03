import { describe, expect, it } from 'vitest';
import { ROOM_FINISH_ART } from './sprites/roomFinishes';

describe('checker flooring', () => {
  it('keeps uniform 6px squares across tile seams in every checker finish', () => {
    for (const name of ['roomFloor5', 'roomFloor6', 'roomFloor7'] as const) {
      const sprite = ROOM_FINISH_ART[name];
      const colours = [sprite.frames[0][0][0], sprite.frames[0][0][6]];
      expect(colours[0]).not.toBe(colours[1]);
      for (const frame of sprite.frames) {
        // Sample repeated tiles too: a seam must not double a square's width.
        for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) {
          expect(frame[y % 24][x % 24]).toBe(colours[(Math.floor(x / 6) + Math.floor(y / 6)) % 2]);
        }
      }
    }
  });
});
