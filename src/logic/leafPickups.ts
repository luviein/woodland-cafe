import { LEAF_CONFIG, type LeafConfig } from '../data/leafConfig';
import type { Point } from './layout';
import type { Rect } from './outdoor';
import { between, type Rng } from './random';

/** One Leaf lying on the ground. The id lets the scene match it to its sprite. */
export interface GroundLeaf {
  id: number;
  position: Point;
}

/** The leaves in one outdoor place, plus when the next one appears. Plain data. */
export interface LeafField {
  leaves: GroundLeaf[];
  /** Seconds until the next leaf appears. */
  spawnTimer: number;
  nextId: number;
}

/** Where leaves may land, and spots to keep clear (e.g. tree bases, where a leaf would hide). */
export interface LeafGround {
  area: Rect;
  keepClear: readonly Point[];
  /** Minimum distance from each keepClear point, in pixels. */
  clearance: number;
}

/** Tries before giving up on finding a clear spot (it then lands wherever the last try was). */
const PLACE_TRIES = 10;

function randomSpot(ground: LeafGround, rng: Rng): Point {
  const { area } = ground;
  let spot: Point = { x: area.x, y: area.y };
  for (let i = 0; i < PLACE_TRIES; i++) {
    spot = { x: between(area.x, area.x + area.width, rng), y: between(area.y, area.y + area.height, rng) };
    const clear = ground.keepClear.every((p) => Math.hypot(p.x - spot.x, p.y - spot.y) >= ground.clearance);
    if (clear) break;
  }
  return spot;
}

function addLeaf(field: LeafField, ground: LeafGround, rng: Rng): LeafField {
  const leaf = { id: field.nextId, position: randomSpot(ground, rng) };
  return { ...field, leaves: [...field.leaves, leaf], nextId: field.nextId + 1 };
}

/**
 * A fresh place on arrival: a few leaves already down, the next one on its way.
 * `leftToday` is how many more the player may pick up today (the daily cap):
 * no more than that are ever put down.
 */
export function createLeafField(
  ground: LeafGround,
  rng: Rng,
  config: LeafConfig = LEAF_CONFIG,
  leftToday = Infinity,
): LeafField {
  let field: LeafField = { leaves: [], spawnTimer: 0, nextId: 1 };
  const count = Math.min(config.leavesOnArrival, config.maxLeavesOnGround, leftToday);
  for (let i = 0; i < count; i++) field = addLeaf(field, ground, rng);
  return { ...field, spawnTimer: between(config.leafSpawnSecondsMin, config.leafSpawnSecondsMax, rng) };
}

/**
 * Time passes: a new leaf appears whenever the timer runs out. While the
 * ground is full the timer waits at 0, so a leaf appears as soon as one is
 * picked up.
 *
 * Leaves already on the ground count against `leftToday` (the daily cap), so
 * the player can never pick up more than the cap allows.
 */
export function stepLeafField(
  field: LeafField,
  seconds: number,
  ground: LeafGround,
  rng: Rng,
  config: LeafConfig = LEAF_CONFIG,
  leftToday = Infinity,
): LeafField {
  const spawnTimer = field.spawnTimer - seconds;
  if (spawnTimer > 0) return { ...field, spawnTimer };
  const room = Math.min(config.maxLeavesOnGround, leftToday);
  if (field.leaves.length >= room) return { ...field, spawnTimer: 0 };
  const next = between(config.leafSpawnSecondsMin, config.leafSpawnSecondsMax, rng);
  return { ...addLeaf(field, ground, rng), spawnTimer: next };
}

/** Picks up every leaf within reach of `player`. */
export function collectLeaves(
  field: LeafField,
  player: Point,
  config: LeafConfig = LEAF_CONFIG,
): { field: LeafField; collected: GroundLeaf[] } {
  const inReach = (l: GroundLeaf) =>
    Math.hypot(l.position.x - player.x, l.position.y - player.y) <= config.leafPickupRadius;
  const collected = field.leaves.filter(inReach);
  if (collected.length === 0) return { field, collected };
  return { field: { ...field, leaves: field.leaves.filter((l) => !inReach(l)) }, collected };
}
