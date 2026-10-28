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
}

export const devSettings: DevSettings = {
  floorTimeScale: 1,
};
