import { expect, it } from 'vitest';
import { walkingFacing, type WalkingFacing } from './walkingFacing';

it('holds a diagonal facing through tiny numerical changes, then turns when direction changes', () => {
  let facing: WalkingFacing = 'front';
  for (let i = 0; i < 240; i++) {
    facing = walkingFacing({ x: i % 2 ? 0.4000000001 : 0.3999999999, y: 0.4 }, facing);
    expect(facing).toBe('front');
  }
  expect(walkingFacing({ x: 1, y: 0 }, facing)).toBe('right');
  expect(walkingFacing({ x: -1, y: 0 }, 'right')).toBe('left');
  expect(walkingFacing({ x: 0, y: -1 }, 'left')).toBe('back');
  expect(walkingFacing({ x: 0, y: 0 }, 'back')).toBe('back');
});
