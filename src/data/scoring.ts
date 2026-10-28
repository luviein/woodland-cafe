// How strict dish scoring is. See GAME_DESIGN.md (Prep Scene).
export const SCORING_CONFIG = {
  /**
   * A dish is "close" if it has at most this many missing items AND at most
   * this many extra items. With 1, one missing, one extra, or one swapped item
   * (one missing + one extra) is close; anything more is wrong.
   */
  closeTolerance: 1,
};
