// How strict dish scoring is. See GAME_DESIGN.md (Prep Scene).
export const SCORING_CONFIG = {
  /**
   * A dish is "close" if it's at most this many mistakes away from the recipe.
   * A mistake = one layer missing, extra, replaced, or two neighbours swapped
   * (see logic/layerDistance.ts). 0 mistakes = perfect.
   */
  closeTolerance: 1,
};
