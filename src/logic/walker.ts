import type { Layout, Point } from './layout';
import { findPath } from './pathfinding';

/**
 * Anything that walks tile to tile: the player now, customers next step.
 * Plain data (no Phaser), so it can be tested and saved.
 */
export interface Walker {
  /** The tile it's standing on, or has just left. */
  tile: Point;
  /** Tiles still to step onto, in order. Empty = standing still. */
  path: Point[];
  /** 0..1: how far along the step from `tile` to `path[0]`. */
  progress: number;
}

export function createWalker(tile: Point): Walker {
  return { tile, path: [], progress: 0 };
}

export function isMoving(walker: Walker): boolean {
  return walker.path.length > 0;
}

/**
 * Moves the walker along its path. `seconds` is time since the last frame,
 * so speed is the same at 30fps or 144fps. Returns a NEW walker rather than
 * changing the old one; that makes the function easy to test (compare
 * before/after) and avoids bugs from shared objects being edited.
 */
export function stepWalker(walker: Walker, seconds: number, tilesPerSecond: number): Walker {
  let { tile, path, progress } = walker;
  let distance = seconds * tilesPerSecond;

  // A slow frame can cover more than one tile, hence the loop.
  while (distance > 0 && path.length > 0) {
    const toNextTile = 1 - progress;
    if (distance >= toNextTile) {
      tile = path[0];
      path = path.slice(1);
      progress = 0;
      distance -= toNextTile;
    } else {
      progress += distance;
      distance = 0;
    }
  }
  return { tile, path, progress };
}

/** Position in tile units, between tiles while moving (e.g. x = 3.5). */
export function walkerPosition(walker: Walker): Point {
  const next = walker.path[0];
  if (!next) return walker.tile;
  return {
    x: walker.tile.x + (next.x - walker.tile.x) * walker.progress,
    y: walker.tile.y + (next.y - walker.tile.y) * walker.progress,
  };
}

/**
 * Sends the walker somewhere new. If it's mid-step, it finishes that step
 * first (no snapping back or cutting diagonally through furniture), then
 * follows the new route. Returns the walker unchanged if the goal can't be
 * reached, so a tap on a wall does nothing.
 */
export function walkTo(walker: Walker, layout: Layout, goal: Point): Walker {
  const midStep = walker.path.length > 0 && walker.progress > 0;
  const from = midStep ? walker.path[0] : walker.tile;
  const route = findPath(layout, from, goal);
  if (!route) return walker;
  return { ...walker, path: midStep ? [from, ...route] : route };
}
