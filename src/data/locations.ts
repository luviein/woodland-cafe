import type { Point } from '../logic/layout';

// Places on the world map (GAME_DESIGN.md §5.2-5.3). Adding a location is
// adding an entry here (plus a landmark drawing in WorldMapScene, until real
// art replaces the placeholder shapes).

export interface LocationDef {
  name: string;
  /** Centre of its landmark on the 640x360 map, in pixels. */
  position: Point;
  /** Key of the Phaser scene it opens; null = not built yet (shows "Coming soon"). */
  scene: string | null;
  /** Locked places show a lock on their signpost and can't be entered. */
  locked: boolean;
}

export const LOCATIONS = {
  cafe: { name: 'Cafe', position: { x: 320, y: 220 }, scene: 'FloorScene', locked: false },
  // Both outdoor places share one scene, set up from data/outdoorAreas.ts.
  forest: { name: 'Forest', position: { x: 168, y: 140 }, scene: 'OutdoorScene', locked: false },
  marketplace: { name: 'Marketplace', position: { x: 476, y: 132 }, scene: 'OutdoorScene', locked: false },
} satisfies Record<string, LocationDef>;

export type LocationId = keyof typeof LOCATIONS;

export const LOCATION_IDS = Object.keys(LOCATIONS) as LocationId[];

/** Dotted paths between places, drawn on the map. Decoration only: you can go anywhere. */
export const MAP_PATHS: readonly (readonly [LocationId, LocationId])[] = [
  ['cafe', 'forest'],
  ['cafe', 'marketplace'],
];
