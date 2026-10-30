// Leaves lying on the ground in the Forest and Marketplace (GAME_DESIGN.md
// §5.4). Walk over one to pick it up: +1 Leaf.
//
// A `type` of plain numbers (like FloorConfig) so the dev console can list
// and change it. Names are unique across all configs (the console's `set`
// looks them up by name), hence the "leaf" in each.
export type LeafConfig = {
  /** Seconds between new leaves appearing (random in this range). */
  leafSpawnSecondsMin: number;
  leafSpawnSecondsMax: number;
  /** No new leaves while this many are lying around. */
  maxLeavesOnGround: number;
  /** Already lying around when the player arrives. */
  leavesOnArrival: number;
  /** How close (pixels, centre to centre) the player has to get to pick one up. */
  leafPickupRadius: number;
  /** Most Leaves the player can pick up in a day, Forest and Marketplace together. */
  leavesPerDay: number;
};

export const LEAF_CONFIG: LeafConfig = {
  leafSpawnSecondsMin: 3,
  leafSpawnSecondsMax: 6,
  maxLeavesOnGround: 5,
  leavesOnArrival: 1,
  leafPickupRadius: 12,
  leavesPerDay: 15,
};
