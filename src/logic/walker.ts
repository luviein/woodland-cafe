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

/** Where the walker will end up: the last tile of its path, or where it stands. */
export function destination(walker: Walker): Point {
  return walker.path.at(-1) ?? walker.tile;
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
 * Sends the walker somewhere new. Returns the walker unchanged if the goal
 * can't be reached, so a tap on a wall does nothing.
 */
export function walkTo(walker: Walker, layout: Layout, goal: Point): Walker {
  return redirect(walker, (from) => findPath(layout, from, goal));
}

/**
 * Switches the walker onto a new route. `routeFrom(tile)` plans a route
 * starting at a given tile.
 *
 * Mid-step, the walker is between two tiles, so there are two options:
 * finish the step and go on from the next tile, or turn around and go from
 * the tile it just left. We pick whichever is shorter overall, so changing
 * your mind never means a pointless extra step (and a customer whose seat
 * becomes unavailable never steps onto it first).
 */
export function redirect(walker: Walker, routeFrom: (start: Point) => Point[] | null): Walker {
  const next = walker.path[0];
  const midStep = next !== undefined && walker.progress > 0;
  if (!midStep) {
    const route = routeFrom(walker.tile);
    return route ? { ...walker, path: route, progress: 0 } : walker;
  }

  const forward = routeFrom(next);
  const back = routeFrom(walker.tile);
  const forwardCost = forward ? 1 - walker.progress + forward.length : Infinity;
  const backCost = back ? walker.progress + back.length : Infinity;
  if (forwardCost === Infinity && backCost === Infinity) return walker;

  if (forwardCost <= backCost) {
    return { ...walker, path: [next, ...forward!] };
  }
  // Turning around: swap which tile we're "from" and "to", and mirror the
  // progress, so the on-screen position doesn't jump.
  return { tile: next, path: [walker.tile, ...back!], progress: 1 - walker.progress };
}

/** The tile a walker will be on next (or is on), for planning routes. */
export function routeStart(walker: Walker): Point {
  return walker.path.length > 0 && walker.progress > 0 ? walker.path[0] : walker.tile;
}
