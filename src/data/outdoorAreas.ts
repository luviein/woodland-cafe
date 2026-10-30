import type { Point } from '../logic/layout';
import type { Rect } from '../logic/outdoor';
import type { LocationId } from './locations';

// The outdoor places (Forest, Marketplace), all drawn by one OutdoorScene.
// Placeholder scenery until real art (milestone 10). Leaf pickups (step 4),
// forage spots (step 5) and shops (milestone 6) will be listed here too.

export interface OutdoorAreaDef {
  /** Ground colour, a COLORS key in ui/theme.ts. */
  ground: 'grass' | 'grassDark';
  /** Decorative trees; each point is the top of the trunk. */
  trees: readonly Point[];
  /** Decorative market stalls; each point is the top-middle of the counter. */
  stalls: readonly Point[];
}

/**
 * Where the player can walk, in pixels on the 640x360 screen. The strip
 * along the top is left free for the title, wallet and Map button.
 */
export const OUTDOOR_WALK_AREA: Rect = { x: 16, y: 56, width: 608, height: 288 };

/** Where the player appears on arriving from the map (bottom middle, like a path in). */
export const OUTDOOR_ENTRY: Point = { x: 320, y: 330 };

export const OUTDOOR_AREAS = {
  forest: {
    ground: 'grassDark',
    trees: [
      { x: 60, y: 90 }, { x: 140, y: 70 }, { x: 250, y: 100 }, { x: 420, y: 80 }, { x: 540, y: 110 },
      { x: 600, y: 200 }, { x: 80, y: 220 }, { x: 180, y: 290 }, { x: 470, y: 270 }, { x: 330, y: 180 },
    ],
    stalls: [],
  },
  marketplace: {
    ground: 'grass',
    trees: [{ x: 40, y: 90 }, { x: 600, y: 90 }, { x: 40, y: 300 }, { x: 600, y: 300 }],
    stalls: [{ x: 160, y: 120 }, { x: 320, y: 110 }, { x: 480, y: 120 }],
  },
} satisfies Partial<Record<LocationId, OutdoorAreaDef>>;

export type OutdoorLocationId = keyof typeof OUTDOOR_AREAS;

export function isOutdoor(id: LocationId): id is OutdoorLocationId {
  return id in OUTDOOR_AREAS;
}
