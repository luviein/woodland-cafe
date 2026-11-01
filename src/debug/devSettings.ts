/**
 * Live-tweakable settings for testing, changed by dev console commands.
 *
 * A single shared object is fine here (unlike game state, which we keep pure
 * and passed around): it's a testing tool, and the defaults make the game
 * behave normally, so production code reading it is harmless.
 */
export interface DevSettings {
  /** Multiplies time for the floor simulation (critters, timers). 1 = normal. */
  floorTimeScale: number;
  /**
   * Seasonal shops (the Christmas stall) open all year. On in the dev build,
   * so they can be tried any time (GAME_DESIGN.md §5.10); off in the release
   * build, which goes by the date. The dev console's `season` switches it.
   */
  allSeasons?: boolean;
}

export const devSettings: DevSettings = {
  floorTimeScale: 1,
  allSeasons: import.meta.env.DEV,
};
