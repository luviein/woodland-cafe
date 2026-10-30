import { LOCATIONS, type LocationId } from '../data/locations';
import type { Point } from './layout';

/** What tapping a place on the map does. */
export type MapChoice = 'enter' | 'locked' | 'notBuilt';

export function chooseLocation(id: LocationId): MapChoice {
  const location = LOCATIONS[id];
  if (location.locked) return 'locked';
  if (location.scene === null) return 'notBuilt';
  return 'enter';
}

/**
 * Evenly spaced dots on the straight line from `a` to `b`, for the map's
 * dotted paths. `margin` pixels are left empty at each end, so the dots stop
 * short of the landmarks instead of running under them.
 */
export function dotsAlong(a: Point, b: Point, spacing: number, margin = 0): Point[] {
  const length = Math.hypot(b.x - a.x, b.y - a.y);
  const usable = length - 2 * margin;
  if (usable <= 0) return [];
  const count = Math.floor(usable / spacing) + 1;
  // Centre the dots in the usable stretch, so both ends look the same.
  const start = margin + (usable - (count - 1) * spacing) / 2;
  return Array.from({ length: count }, (_, i) => {
    const t = (start + i * spacing) / length;
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  });
}
