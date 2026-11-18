import type { Point } from '../logic/layout';
import { layoutPoint } from '../layout/positions';
import { MAP_PLACES } from './mapPresentation';

// Places on the world map (GAME_DESIGN.md §5.2-5.3). Adding a location is
// adding an entry here (plus a landmark drawing in WorldMapScene, until real
// art replaces the placeholder shapes).

export interface LocationDef {
  name: string;
  /** Centre of its landmark on the 640x360 map, in pixels (movable in Arrange mode, GAME_DESIGN.md §9.3). */
  readonly position: Point;
  /** Key of the Phaser scene it opens; null = not built yet (shows "Coming soon"). */
  scene: string | null;
  /** Locked places show a lock on their signpost and can't be entered. */
  locked: boolean;
}

export const LOCATIONS = {
  museum: { name: 'Museum', get position() { return layoutPoint('worldMap', 'place.museum', { x: MAP_PLACES.museum.x, y: MAP_PLACES.museum.y }); }, scene: 'MuseumScene', locked: false },
  cafe: { name: 'Cafe', get position() { return layoutPoint('worldMap', 'place.cafe', { x: MAP_PLACES.cafe.x, y: MAP_PLACES.cafe.y }); }, scene: 'FloorScene', locked: false },
  garden: { name: 'Garden', get position() { return layoutPoint('worldMap', 'place.garden', { x: MAP_PLACES.garden.x, y: MAP_PLACES.garden.y }); }, scene: 'GardenScene', locked: false },
  // Both outdoor places share one scene, set up from data/outdoorAreas.ts.
  forest: { name: 'Forest', get position() { return layoutPoint('worldMap', 'place.forest', { x: MAP_PLACES.forest.x, y: MAP_PLACES.forest.y }); }, scene: 'OutdoorScene', locked: false },
  marketplace: { name: 'Marketplace', get position() { return layoutPoint('worldMap', 'place.marketplace', { x: MAP_PLACES.marketplace.x, y: MAP_PLACES.marketplace.y }); }, scene: 'OutdoorScene', locked: false },
} satisfies Record<string, LocationDef>;

export type LocationId = keyof typeof LOCATIONS;

export const LOCATION_IDS = Object.keys(LOCATIONS) as LocationId[];

/** Dotted paths between places, drawn on the map. Decoration only: you can go anywhere. */
export const MAP_PATHS: readonly (readonly [LocationId, LocationId])[] = [
  ['cafe', 'museum'],
  ['cafe', 'forest'],
  ['cafe', 'marketplace'],
  ['cafe', 'garden'],
];
