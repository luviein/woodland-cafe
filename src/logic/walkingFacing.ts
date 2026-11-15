import type { Point } from './layout';

export type WalkingFacing = 'front' | 'back' | 'left' | 'right';

/** Keep the current axis near a diagonal instead of flickering on tiny differences. */
export function walkingFacing(motion: Point, previous: WalkingFacing): WalkingFacing {
  const x = Math.abs(motion.x), y = Math.abs(motion.y);
  if (x + y < 0.000001) return previous;
  if (x > y * 1.15) return motion.x > 0 ? 'right' : 'left';
  if (y > x * 1.15) return motion.y > 0 ? 'front' : 'back';
  if (previous === 'left' || previous === 'right') return motion.x > 0 ? 'right' : 'left';
  return motion.y > 0 ? 'front' : 'back';
}
