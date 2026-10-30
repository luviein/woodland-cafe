import type { Point } from './layout';

/**
 * Walking in the open outdoor areas (Forest, Marketplace). Unlike the cafe
 * floor there are no tiles or furniture to route around, so the player
 * simply walks in a straight line to where they tapped, inside the walkable
 * area. Plain data in, new data out, like the floor rules.
 */

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Mover {
  /** Where it is now, in pixels. */
  position: Point;
  /** Where it's walking to; null when standing still. */
  target: Point | null;
}

export function createMover(position: Point): Mover {
  return { position, target: null };
}

/** The nearest point inside `area`, so a tap on the edge still walks somewhere sensible. */
export function clampToArea(p: Point, area: Rect): Point {
  return {
    x: Math.min(Math.max(p.x, area.x), area.x + area.width),
    y: Math.min(Math.max(p.y, area.y), area.y + area.height),
  };
}

/** Sets off toward `to` (kept inside `area`). A new tap replaces the old target. */
export function walkToward(mover: Mover, to: Point, area: Rect): Mover {
  return { ...mover, target: clampToArea(to, area) };
}

/** Moves up to `distance` pixels toward the target, stopping exactly on it. */
export function stepMover(mover: Mover, distance: number): Mover {
  const { position, target } = mover;
  if (!target) return mover;
  const dx = target.x - position.x;
  const dy = target.y - position.y;
  const left = Math.hypot(dx, dy);
  if (left <= distance) return { position: target, target: null };
  return { ...mover, position: { x: position.x + (dx / left) * distance, y: position.y + (dy / left) * distance } };
}
